/* INITIALIZE APPLICATION DEPENDECIES --------------------------------------------------------------------------------*/
var express = require("express");
var path = require("path");
var cors = require("cors");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
// Multer, Cloudinary are for transmission and storage of images.
var multer = require('multer');
var cloudinary = require('cloudinary');
var cloudinaryStorage = require('multer-storage-cloudinary');
// For salting and hashing password-hash-and-salt', PBKDF2
var password = require('password-hash-and-salt');

var app = express();
// cors allows Cross Origin Requests (requests will be rejected by the API if not this)
app.use(cors());
app.use(bodyParser.json());

/* -------------------------------------------------------------------------------------------------------------------*/

/* INITIALIZE CLOUD IMAGE STORAGE ------------------------------------------------------------------------------------*/

/* Config cloudinary for the multer-storage-cloudinary object.
 Notice that the cloudinary object automatically configures itself
 based on the Heroku env-variables. */
var storage_posts = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'posts', // cloudinary folder where you want to store images, empty is root
  allowedFormats: ['jpg', 'png']
});
var storage_profile = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'profile', // cloudinary folder where you want to store images, empty is root
  allowedFormats: ['jpg', 'png']
});

/* Initialize multer middleware with the multer-storage-cloudinary based
 storage engine */
var parser_posts = multer({storage: storage_posts});
var parser_profile = multer({storage: storage_profile});

/* -------------------------------------------------------------------------------------------------------------------*/

/* INITIALIZE DB -----------------------------------------------------------------------------------------------------*/

var ObjectID = mongodb.ObjectID;
var USERS_COLLECTION = "users";
var PHOTOS_COLLECTION = "photos";
var SESSIONS_COLLECTION = "sessions";
// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

/* -------------------------------------------------------------------------------------------------------------------*/

// API ROUTES BELOW --------------------------------------------------------------------------------------------------*/

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}


/*
 Signing In/Loging Out and Signing Up
 _____________________________________________________________

 The following route signs the user in /home/giograf by returning sessionToken if hash and
 username correspond to the entry in the database. Returns false as valid boolean value
 and "0000" as a security token if the entry is not found. (see README.md)
 */
app.post("/users/in", function (req, res) {

  // Check that entered username is in database.
  db.collection(USERS_COLLECTION).find({username: req.body.username}).toArray(function (err, docs) {
    // In case of an error. (username not found)
    if (err) {
      returnInvalid(res);
    }
    // If entered username or password are incorrect
    else if (docs.length == 0) {
      returnInvalid(res);
    }
    // If entered username exists and password is correct
    else if (docs.length == 1) {
      userId = docs[0]._id;
      // Verify supplied password against salted hash stored in the database
      password(req.body.password).verifyAgainst(docs[0].hash, function (error, verified) {
        if (error){
          returnInvalid(res);
        }
        if (!verified) {
          returnInvalid(res);
        } else {
          db.collection(SESSIONS_COLLECTION).find({username: req.body.username}).toArray(function (err, docs) {
            if (err) {
              returnInvalid(res);
            }
            // If there is already a session token for the user
            else if (docs.length != 0){
              sessionTokenResult = docs[0].sessionToken;
              db.collection(USERS_COLLECTION).find({username: req.body.username}).toArray(function (err, docs) {
                if (err) {
                  returnInvalid(res);
                } else {
                  returnArray = {"token": sessionTokenResult, "userId": docs[0]._id};
                  res.status(201).json(returnArray);
                }
              });
            }
            // Get user a session token
            else {
              newToken = true;
              do
              {
                /* Generate session token */
                sessionTokenResult = guid();
                /* Check that the token generated does not yet exist in the DB */
                db.collection(SESSIONS_COLLECTION).find({sessionToken: sessionTokenResult}).toArray(function (err, docs) {
                  if (err) {
                  } else {
                    if (docs.length != 0) {
                      newToken = false;
                    }
                  }
                });
              }
              while (!newToken);

              /*
               If user has been added to the DB, add the generated session token to the database.
               */
              db.collection(SESSIONS_COLLECTION).insertOne({
                  username: req.body.username,
                  sessionToken: sessionTokenResult
                },
                function (err, doc) {
                  if (err) {
                    returnInvalid(res);
                  } else {
                    db.collection(USERS_COLLECTION).find({username: req.body.username}).toArray(function (err, docs) {
                      if (err) {
                        returnInvalid(res);
                      } else {
                        returnArray = {"token": sessionTokenResult, "userId": docs[0]._id};
                        res.status(201).json(returnArray);
                      }
                    });
                  }
                });
            }
          });
        }
      });
    }
    // If entered username or password are incorrect
    else {
      returnInvalid(res);
    }
  });
});

/*
 The following route logs the user out by deleting previously granted sessionToken from Sessions.
 Session token to be supplied with request.
 collection (see README.md)
 */
app.post("/users/out", function (req, res) {
  returnArray = {"valid": true};
  db.collection(SESSIONS_COLLECTION).deleteOne({sessionToken: req.body.sessionToken}) && res.status(201).json(returnArray);
});

/*
 The following route signs up the user by storing user data in
 Users collection and session in the Sessions collection, returning sessionToken
 if hash and username correspond to the entry in the database. Returns false as
 valid boolean value and "0000" as a security token if the entry is not found.
 (see README.md)
 */
app.post("/users", function (req, res) {
  // Check that entered username is not in database.
  db.collection(USERS_COLLECTION).find({username: req.body.username}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else if (docs.length == 0) {
      given_password = req.body.password;
      // Creating hash and salt
      password(given_password).hash(function (error, hash) {
        if (error) {
          console.log("Error in Hashing");
          returnInvalid(res);
        }
        else {
          /* Add new user to DB */
          db.collection(USERS_COLLECTION).insertOne({
              username: req.body.username,
              hash: hash,
              email: req.body.email,
              followers: [],
              following: [],
              photos: [],
              profilePicture: "v1487509627/profile_default_fis5w4.png"
            },
            function (err, doc) {
              if (err) {
                handleError(res, err.message, "Failed to create new user.");
              } else {
                newToken = true;
                do
                {
                  /* Generate session token */
                  sessionTokenResult = guid();
                  /* Check that the token generated does not yet exist in the DB */
                  db.collection(SESSIONS_COLLECTION).find({sessionToken: sessionTokenResult}).toArray(function (err, docs) {
                    if (err) {
                      returnInvalid(res);
                    } else {
                      if (docs.length != 0) {
                        newToken = false;
                      }
                    }
                  });
                }
                while (!newToken);

                /*
                 If user has been added to the DB, add the generated session token to the database.
                 */
                db.collection(SESSIONS_COLLECTION).insertOne({
                    username: req.body.username,
                    sessionToken: sessionTokenResult
                  },
                  function (err, doc) {
                    if (err) {
                    } else {
                      db.collection(USERS_COLLECTION).find({username: req.body.username}).toArray(function (err, docs) {
                        if (err) {
                          returnInvalid(res);
                        } else {
                          returnArray = {"token": sessionTokenResult, "userId": docs[0]._id};
                          res.status(201).json(returnArray);
                        }
                      });
                    }
                  });
              }
            }
          );
        }
      });
    }
    else {
      // If entered username already exists:
      returnInvalid(res);
    }

  });
});


/*
 Search
 _____________________________________________________________

 The following route returns an array of users based on string searched, array
 containing username, profile picture, userId.
 (see README.md)
 */
app.get("/users/:username", function (req, res) {
  given_username = req.params.username;
  // Get user data from the DB
  db.collection(USERS_COLLECTION).find({username: {$regex: new RegExp(given_username, 'i')}}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else {
      returnArray = [];
      docs.forEach(function (each) {
        person = {"userId": each._id, "username": each.username, "profilePicture": each.profilePicture};
        returnArray.push(person);
      });
      res.status(201).json(returnArray);
    }
  });
});

/*
 The following route returns an array of images based on string (tag) searched, array
 containing image URL, imageId and datetime posted
 (see README.md)
 */
app.get("/photos/:tag", function (req, res) {
  // Get the regular expression for the tag searched
  tagSearched = req.params.tag;
  // If user has has not entered the hashtag prepend it to the string
  if (tagSearched.slice(0, 1) != "#") {
    tagSearched = "#" + tagSearched;
  }
  tagSearchedRegExp = new RegExp(tagSearched, 'i');
  returnArray = [];
  // Get all the photos
  db.collection(PHOTOS_COLLECTION).find({}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    }
    else {
      // For each of the posts search through tags
      docs.forEach(function (photoObject) {
        tags = photoObject.tags;
        // The photo being iterated at start has not been pushed to the result array.
        alreadyPushed = false;
        // Search through each of the tags
        tags.forEach(function (tag) {
          // If tag of the post fits the search tag & the photo wasn't yet pushed, return the post with the array of other posts
          if (tag.match(tagSearchedRegExp) != null && alreadyPushed != true) {
            photoToArray = {"id": photoObject._id, "date": photoObject.date, "img": photoObject.img};
            returnArray.push(photoToArray);
            alreadyPushed = true;
          }
        });
      });
      res.status(201).json(returnArray);
    }
  });
});

/*
 Home
 _____________________________________________________________

 User provides (implicitly) his username and recieves an array of the most
 recent photos from users that person follows along with metadata.
 (see README.md)
 */
app.get("/home/:username", function (req, res) {
  username = req.params.username;
  // Store photos to display at home page here:
  followingPhotos = [];
  // Find usernames of users current user follows:
  db.collection(USERS_COLLECTION).find({"username": username}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else if (docs.length > 0) {
      userFollowingUsernames = docs[0].following;
      // Take all users
      db.collection(USERS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
          returnInvalid(res);
        }
        else {
          // Find users current user follows
          userObjectsBeingFollowed = [];
          docs.forEach(function (user) {
            if (userFollowingUsernames.indexOf(user.username) >= 0) {
              userObjectsBeingFollowed.push(user);
            }
          });
          // Return photo IDs of users being followed
          photoIdsToReturn = [];
          userObjectsBeingFollowed.forEach(function (user) {
            userPhotos = user.photos;
            userPhotos.forEach(function (photo) {
              photoIdsToReturn.push(photo);
            });
          });
          // Take all photos
          db.collection(PHOTOS_COLLECTION).find({}).toArray(function (err, docs) {
            if (err) {
              returnInvalid(res);
            }
            else {
              // Find photos of people being followed, add them to array and return
              docs.forEach(function (photoObject) {
                currentId = photoObject._id.toString();
                if (photoIdsToReturn.indexOf(currentId) >= 0) {
                  followingPhotos.push(photoObject);
                }
              });
              res.status(201).json(followingPhotos);
            }
          });
        }
      });
    }
    else {
      returnInvalid(res);
    }
  });
});

/*
 Share
 _____________________________________________________________
 An image and metadata is send to server where the photo is saved and in case of
 success, the result is sent to user as imageId.
 (see README.md)
 */
app.post("/photos", parser_posts.single('image'), function (req, res) {
  // Get the raw data to be inserted into the database
  // Data of the file uploaded to Cloudinary
  file = req.file;
  fullUrl = file.secure_url;
  shortUrl = getShortURL(fullUrl);
  date = file.created_at;

  // Data supplied by the user
  description = req.body.description;
  category = req.body.category;
  sessionTokenGiven = req.body.sessionToken;
  tags = description.match(/#\S+/gi);
  db.collection(SESSIONS_COLLECTION).find({sessionToken: sessionTokenGiven}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else if (docs.length > 0) {
      // Get the username of the owner of the photo
      currentUsername = docs[0].username;
      db.collection(USERS_COLLECTION).find({username: currentUsername}).toArray(function (err, docs) {
        if (err) {
          returnInvalid(res);
        } else if (docs.length > 0) {
          // Get the userID of the owner of the photo
          currentUserId = docs[0]._id.toString();
          currentUserPhotos = docs[0].photos;
          // Create the photo object to be inserted.
          photoObject = {
            "owner": currentUserId,
            "date": date,
            "desctiption": description,
            "tags": tags,
            "category": category,
            "img": shortUrl,
            "likes": [],
            "comments": []
          };
          // Insert the photo into the database
          db.collection(PHOTOS_COLLECTION).insertOne(photoObject,
            function (err, doc) {
              if (err) {
              } else {
                db.collection(PHOTOS_COLLECTION).find({img: shortUrl}).toArray(function (err, docs) {
                  if (err) {
                    returnInvalid(res);
                  } else {
                    // Add ID of the just uploaded photo to the array of user photos.
                    id = docs[0]._id.toString();
                    currentUserPhotos.push(id);
                    db.collection(USERS_COLLECTION).update({"_id": new ObjectID(currentUserId)}, {$set: {photos: currentUserPhotos}});
                    // Return ID of the uploaded image
                    returnArray = {"id": id};
                    res.status(201).json(returnArray);
                  }
                });
              }
            });
        }
        else {
          returnInvalid(res);
        }
      });
    }
    else {
      returnInvalid(res);
    }
  });
});

/*
 Photo Interaction
 _____________________________________________________________
 Leave a comment under a photo, with imageId, comment and sessionToken supplied
 (see README.md)
 */
app.post("/photos/comment", function (req, res) {
  // Store the data supplied in a simpler fashion.
  comment = req.body.comment;
  id = req.body.id;
  sessionTokenGiven = req.body.sessionToken;

  // Find username of the person who initiated action (if session is correct and whom it belongs to)
  db.collection(SESSIONS_COLLECTION).find({sessionToken: sessionTokenGiven}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else if (docs.length > 0) {
      currentUserUsername = docs[0].username;

      // Get the post to be commented
      db.collection(PHOTOS_COLLECTION).find({"_id": new ObjectID(id)}).toArray(function (err, docs) {
        if (err) {
          returnInvalid(res);
        }
        else if (docs.length > 0) {
          // Get the array of comments, create new comment object and push it to the existing array
          photo_object_comments = docs[0].comments;
          if (photo_object_comments == null || photo_object_comments == undefined) {
            photo_object_comments = [];
          }
          new_comment = {"username": currentUserUsername, "comment": comment};
          photo_object_comments.push(new_comment) &&
          db.collection(PHOTOS_COLLECTION).update({"_id": new ObjectID(id)}, {$set: {comments: photo_object_comments}});
          returnArray = {"valid": true};
          res.status(201).json(returnArray);
        }
        else {
          returnInvalid(res);
        }
      });
    }
    else {
      returnInvalid(res);
    }
  });
});

/*
 Leave a like under photo (unlike if already liked), with imageId
 and sessionToken supplied
 (see README.md)
 */
app.post("/photos/like", function (req, res) {
  // Store the data supplied in a simpler fashion.
  id = req.body.id;
  sessionTokenGiven = req.body.sessionToken;

  // Find username of the person who initiated action (if session is correct and whom it belongs to)
  db.collection(SESSIONS_COLLECTION).find({sessionToken: sessionTokenGiven}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else if (docs.length > 0) {
      currentUserUsername = docs[0].username;

      // Find user ID of the person who initiated action (if session is correct and whom it belongs to)
      db.collection(USERS_COLLECTION).find({username: currentUserUsername}).toArray(function (err, docs) {
        if (err) {
          returnInvalid(res);
        } else {
          currentUserId = docs[0]._id.toString();

          // Get the post to be liked/unliked.
          db.collection(PHOTOS_COLLECTION).find({"_id": new ObjectID(id)}).toArray(function (err, docs) {
            if (err) {
              returnInvalid(res);
            }
            else if (docs.length > 0) {
              photo_object = docs[0];
              photo_object_likes = docs[0].likes;
              liked = false;
              // Check whether current user has already liked the post (search current user's ID in liked)
              photo_object_likes.forEach(function (idLiked) {
                // The user has liked the post - unlike
                if (idLiked == currentUserId) {
                  liked = true;
                }
              });
              // The user has liked the post - unlike
              if (liked) {
                photo_object_likes.splice(photo_object_likes.indexOf(currentUserId), 1) &&
                db.collection(PHOTOS_COLLECTION).update({"_id": new ObjectID(id)}, {$set: {likes: photo_object_likes}});
              }
              // The user has not liked the post - like
              else {
                photo_object_likes.push(currentUserId) &&
                db.collection(PHOTOS_COLLECTION).update({"_id": new ObjectID(id)}, {$set: {likes: photo_object_likes}});
              }
              returnArray = {"valid": true};
              res.status(201).json(returnArray);
            }
            else {
              returnInvalid(res);
            }
          });
        }
      });
    }
    else {
      returnInvalid(res);
    }
  });
});

/*
 Profile
 _____________________________________________________________
 Get the profile of the user with the images posted by providing userId
 (see README.md)
 */
app.get("/users/profile/:id", function (req, res) {
  // Fallback if id provided is incorrect
  if (req.params.id.length != 24) {
    returnInvalid(res);
  }
  else {
    // Get user data from the DB
    db.collection(USERS_COLLECTION).find({"_id": new ObjectID(req.params.id)}).toArray(function (err, docs) {
      if (err) {
        returnInvalid(res);
      }
      else {
        returnObject = {
          "userId": req.params.id, "username": docs[0].username, "followers": docs[0].followers,
          "following": docs[0].following, "profilePicture": docs[0].profilePicture
        };
        userPhotosIDs = docs[0].photos;
        userPhotos = [];
        if (userPhotosIDs.length > 0) {
          userPhotosIDs.forEach(function (photo, index) {
            if (userPhotosIDs.length - 1 == index) {
              lastindex = true
            }
            db.collection(PHOTOS_COLLECTION).find({"_id": new ObjectID(photo)}).toArray(function (err, docs) {
              if (err) {
                returnInvalid(res);
              }
              else {
                photo_object = {};
                photo_object.id = docs[0]._id;
                photo_object.img = docs[0].img;
                photo_object.date = docs[0].date;

                userPhotos.push(photo_object);
                if (lastindex) {
                  returnObject.photos = userPhotos;
                  res.status(201).json(returnObject);
                }
              }
            });
          });
        }
        else {
          res.status(201).json(returnObject);
        }
      }
    });
  }
});

/*
 Upload new profile picture using sessionToken
 */
app.post("/users/profilepicture", parser_profile.single('image'), function (req, res) {
  // Get the image information and the sessionToken
  file = req.file;
  fullUrl = file.secure_url;
  sessionTokenGiven = req.body.sessionToken;
  // Find the current user from sessions (if session token is correct)
  db.collection(SESSIONS_COLLECTION).find({sessionToken: sessionTokenGiven}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else if (docs.length > 0) {
      // Get the username of the owner of the photo
      currentUsername = docs[0].username;
      db.collection(USERS_COLLECTION).find({username: currentUsername}).toArray(function (err, docs) {
        if (err) {
          returnInvalid(res);
        } else if (docs.length > 0) {
          // Update the link leading to profile photo.
          shortUrl = getShortURL(fullUrl);
          db.collection(USERS_COLLECTION).update({username: currentUsername}, {$set: {profilePicture: shortUrl}});
          returnArray = {"img": shortUrl};
          res.status(201).json(returnArray);
        }
        else {
          returnInvalid(res);
        }
      });
    }
    else {
      returnInvalid(res);
    }
  });
});

/*
 Follow or unfollow specified user, using sessionToken
 */
app.post("/users/follow", function (req, res) {
  //Find followers of the user to follow
  usernameToFollow = req.body.usernameToFollow;
  db.collection(USERS_COLLECTION).find({username: usernameToFollow}).toArray(function (err, docs) {
    if (err) {
      returnInvalid(res);
    } else {
      // Store followers usernames of the user to follow
      userToFollowFollowers = docs[0].followers;
      // Find username of the current user.
      db.collection(SESSIONS_COLLECTION).find({sessionToken: req.body.sessionToken}).toArray(function (err, docs) {
        if (err) {
          returnInvalid(res);
        } else {
          currentUserUsername = docs[0].username;
          indexOfUsernameInFollowers = userToFollowFollowers.indexOf(currentUserUsername);
          db.collection(USERS_COLLECTION).find({username: currentUserUsername}).toArray(function (err, docs) {
            if (err) {
              returnInvalid(res);
            } else {
              currentUserFollowing = docs[0]["following"];
              // If user is already being followed - unfollow
              if (indexOfUsernameInFollowers !== -1) {
                // Delete the person being followed from following array of the current user
                currentUserFollowing.splice(currentUserFollowing.indexOf(usernameToFollow), 1);
                db.collection(USERS_COLLECTION).update({username: currentUserUsername}, {$set: {following: currentUserFollowing}});
                returnArray = {"valid": true};
                res.status(201).json(returnArray);
                // Delete current user from followers of the user followed.
                userToFollowFollowers.splice(indexOfUsernameInFollowers, 1);
                db.collection(USERS_COLLECTION).update({username: usernameToFollow}, {$set: {followers: userToFollowFollowers}});
              }
              // If user is not yet being followed - follow
              else {
                // If array of users following is empty - create array.
                if (currentUserFollowing == undefined) {
                  currentUserFollowing = [];
                }
                // If array of followers is empty - create array.
                if (currentUserFollowing == undefined) {
                  userToFollowFollowers = [];
                }
                // Push users to respective arrays and update DB data.
                currentUserFollowing.push(usernameToFollow);
                userToFollowFollowers.push(currentUserUsername);
                db.collection(USERS_COLLECTION).update({username: usernameToFollow}, {$set: {followers: userToFollowFollowers}});
                db.collection(USERS_COLLECTION).update({username: currentUserUsername}, {$set: {following: currentUserFollowing}});
                returnArray = {"valid": true};
                res.status(201).json(returnArray);
              }
            }
          });
        }
      });
    }
  });
});

/*
 Photo View
 _____________________________________________________________
 Get the photo and all related metadata to the client when imageId is specified.
 (see README.md)
 */
app.get("/photos/object/:id", function (req, res) {
  // Fallback if id provided is incorrect
  if (req.params.id.length != 24) {
    returnInvalid(res);
  }
  else {
    // Get user data from the DB
    db.collection(PHOTOS_COLLECTION).find({"_id": new ObjectID(req.params.id)}).toArray(function (err, docs) {
      if (err) {
        returnInvalid(res);
      }
      else {
        returnObject = {
          "id": req.params.id, "owner": docs[0].owner, "date": docs[0].date,
          "description": docs[0].description, "tags": docs[0].tags, "category": docs[0].category,
          "img": docs[0].img, "likes": docs[0].likes, "comments": docs[0].comments
        };
        res.status(201).json(returnObject);
      }
    });
  }
});
/* -------------------------------------------------------------------------------------------------------------------*/

/* System Specific Functions -----------------------------------------------------------------------------------------*/

/* Random Token Generation */
function guid() {
  return s4() + s4() + s4() + s4() +
    s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

/* Fallback when input is invalid or error occured */
function returnInvalid(res) {
  returnArray = {"valid": false};
  res.status(201).json(returnArray);
}

/* Get short URL from the full url location of the uploaded image */
function getShortURL(fullUrl) {
  shortUrl = fullUrl.slice(50);
  return shortUrl
}

/* -------------------------------------------------------------------------------------------------------------------*/