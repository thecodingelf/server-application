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

// CONTACTS API ROUTES BELOW

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
        if (err){
            // In case of an error. (username not found)
            returnArray = {"token": "0000", "valid": false};
            res.status(201).json(returnArray);

        }
        else if (docs.length == 0){
            // If entered username or password are incorrect
            returnArray = {"token": "0000", "valid": false};
            res.status(201).json(returnArray);

        }
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
        else {
            // If entered username or password are incorrect
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
    // Check that entered username is in database.
    db.collection(SESSIONS_COLLECTION).deleteOne({sessionToken: req.body.sessionToken}).toArray(function (err, docs) {
        if (err){
            // If entered username or password are incorrect
            returnArray = {"valid": false};
            res.status(201).json(returnArray);
        }
        else if (docs.length == 0){
            // If entered username or password are incorrect
            returnArray = {"valid": false};
            res.status(201).json(returnArray);
        }
        else {
            // If entered username or password are incorrect
            returnArray = {"valid": true};
            res.status(201).json(returnArray);

        }
    });
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
        } else {
            if (docs.length == 0) {
                /* Add new user to DB */
                db.collection(USERS_COLLECTION).insertOne({
                        username: req.body.username,
                        hash: req.body.hash,
                        email: req.body.email
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

});

/*
 The following route returns an array of images based on string (tag) searched, array
 containing image URL, imageId and datetime posted
 (see README.md)
 */
app.get("/photos/:tag", function (req, res) {

});

/*
 Home
 _____________________________________________________________

 User provides (implicitly) his username and recieves an array of the most
 recent photos from users that person follows along with metadata.
 (see README.md)
 */
app.get("/home/:id", function (req, res) {

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
app.get("/users/:id", function (req, res) {

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

});

/*
 Photo View
 _____________________________________________________________
 Get the photo and all related metadata to the client when imageId is specified.
 (see README.md)
 */
app.get("/photos/:id", function (req, res) {

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