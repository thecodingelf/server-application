var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var CONTACTS_COLLECTION = "contacts";

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
  The following route signs the user in by returning sessionToken if hash and
  username correspond to the entry in the database. Returns false as valid boolean value
  and "0000" as a security token if the entry is not found. (see README.md)
*/
app.post("/users/signin", function(req, res) {

});

/*
  The following route signs up the user and returns, by storing user data in
  Users collection and session in the Sessions collection, returning sessionToken
  if hash and username correspond to the entry in the database. Returns false as
  valid boolean value and "0000" as a security token if the entry is not found.
  (see README.md)
*/
app.post("/users", function(req, res) {

});

/*
  The following route returns an array of users based on string searched, array
  containing username, profile picture, userId.
  (see README.md)
*/
app.get("/users/:username", function(req, res) {

});

/*
  User provides his username and recieves an array of the most recent photos
  from users that person follows.
  (see README.md)
*/
app.get("/home/:id", function(req, res) {
});

app.put("/contacts/:id", function(req, res) {
});

app.delete("/contacts/:id", function(req, res) {
});
