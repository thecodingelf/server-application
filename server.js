var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var USERS_COLLECTION = "users";
var PHOTOS_COLLECTION = "photos";
var SESSIONS_COLLECTION = "sessions";

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

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

// API ROUTES BELOW

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
         returnArray = {"token": "0000", "valid": false};
         res.status(201).json(returnArray);

      }
      // If entered username or password are incorrect
      else if (docs.length == 0) {
         returnArray = {"token": "0000", "valid": false};
         res.status(201).json(returnArray);

      }
      // If entered username exists and password is correct
      else if (req.body.hash == docs[0].hash) {
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
               } else {
                  returnArray = {"token": sessionTokenResult, "valid": true};
                  res.status(201).json(returnArray);
               }
            });
      }
      // If entered username or password are incorrect
      else {
         returnArray = {"token": "0000", "valid": false};
         res.status(201).json(returnArray);

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
         returnArray = {"token": "0000", "valid": false};
         res.status(201).json(returnArray);
      } else {
         if (docs.length == 0) {
            /* Add new user to DB */
            db.collection(USERS_COLLECTION).insertOne({
                  username: req.body.username,
                  hash: req.body.hash,
                  email: req.body.email,
                  followers: [],
                  following: [],
                  photos: [],
                  profilePicture: "img/placeholder.jpg"
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
                              returnArray = {"token": sessionTokenResult, "valid": true};
                              res.status(201).json(returnArray);
                           }
                        });
                  }
               }
            );
         }
         else {
            // If entered username already exists:
            returnArray = {"token": "0000", "valid": false};
            res.status(201).json(returnArray);
         }
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
         returnArray = {"valid": false};
         res.status(201).json(returnArray);
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
   tagSearchedRegExp = new RegExp(tagSearched, 'i');
   returnArray = [];
   db.collection(PHOTOS_COLLECTION).find({}).toArray(function (err, docs) {
      if (err) {
         returnArray = {"valid": false};
         res.status(201).json(returnArray);
      }
      else {
         // For each of the posts search through tags
         docs.forEach(function (photoObject) {
            // Search through each of the tags
            photoObject.tags.forEach(function (tag) {
               // If tag of the post fits the search tag, return the post with the array of other posts
               if (tag.match(tagSearchedRegExp) != null) {
                  photoToArray = {"id": photoObject._id, "date": photoObject.date, "img": photoObject.img};
                  returnArray.push(photoToArray);
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
   // Find users current user follows:
   db.collection(USERS_COLLECTION).find({"username": username}).toArray(function (err, docs) {
      if (err) {
         returnArray = {"valid": false};
         res.status(201).json(returnArray);
      } else {
         userFollowingIds = docs[0].following;
         userFollowingIds.foreach(function (user) {
            db.collection(USERS_COLLECTION).find({"_id": new ObjectID(user)}).toArray(function (err, docs) {
               if (err) {
                  returnArray = {"valid": false};
                  res.status(201).json(returnArray);
               }
               else {

               }
            });
         });
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
app.post("/photos", function (req, res) {

});

/*
 Photo Interaction
 _____________________________________________________________
 Leave a comment under a photo, with imageId, comment and sessionToken supplied
 (see README.md)
 */
app.post("/photos/comment", function (req, res) {

});

/*
 Leave a like under photo (unlike if already liked), with imageId
 and sessionToken supplied
 (see README.md)
 */
app.post("/photos/like", function (req, res) {

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
      returnArray = {"valid": false};
      res.status(201).json(returnArray);
   }
   else {
      // Get user data from the DB
      db.collection(USERS_COLLECTION).find({"_id": new ObjectID(req.params.id)}).toArray(function (err, docs) {
         if (err) {
            returnArray = {"valid": false};
            res.status(201).json(returnArray);
         }
         else {
            returnObject = {
               "userId": req.params.id, "username": docs[0].username, "followers": docs[0].followers,
               "following": docs[0].following, "profilePicture": docs[0].profilePicture
            };
            //TODO get all photos of the user
            userPhotosIDs = docs[0].photos;
            userPhotos = [];
            if (userPhotosIDs.length > 0) {
               userPhotosIDs.forEach(function (photo, index) {
                  if (userPhotosIDs.length - 1 == index) {
                     lastindex = true
                  }
                  db.collection(PHOTOS_COLLECTION).find({"_id": new ObjectID(photo)}).toArray(function (err, docs) {
                     if (err) {
                        returnArray = {"valid": false};
                        res.status(201).json(returnArray);
                     }
                     else {
                        photo_object = {};
                        photo_object.id = docs[0]._id;
                        photo_object.img = docs[0].img;
                        photo_object.date = docs[0].date;

                        userPhotos.push(photo_object);
                        console.log(userPhotos);
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
app.put("/users/profilepicture", function (req, res) {

});

/*
 Follow or unfollow specified user, using sessionToken
 */
app.post("/users/follow", function (req, res) {
   //Find followers of the user to follow
   usernameToFollow = req.body.usernameToFollow;
   db.collection(USERS_COLLECTION).find({username: usernameToFollow}).toArray(function (err, docs) {
      if (err) {
         returnArray = {"valid": false};
         res.status(201).json(returnArray);
      } else {
         // Store followers usernames of the user to follow
         userToFollowFollowers = docs[0].followers;
         // Find username of the current user.
         db.collection(SESSIONS_COLLECTION).find({sessionToken: req.body.sessionToken}).toArray(function (err, docs) {
            if (err) {
               returnArray = {"valid": false};
               res.status(201).json(returnArray);
            } else {
               currentUserUsername = docs[0].username;
               indexOfUsernameInFollowers = userToFollowFollowers.indexOf(currentUserUsername);
               db.collection(USERS_COLLECTION).find({username: currentUserUsername}).toArray(function (err, docs) {
                  if (err) {
                     returnArray = {"valid": false};
                     res.status(201).json(returnArray);
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
      returnArray = {"valid": false};
      res.status(201).json(returnArray);
   }
   else {
      // Get user data from the DB
      db.collection(PHOTOS_COLLECTION).find({"_id": new ObjectID(req.params.id)}).toArray(function (err, docs) {
         if (err) {
            returnArray = {"valid": false};
            res.status(201).json(returnArray);
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

/* System Specific Functions */

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