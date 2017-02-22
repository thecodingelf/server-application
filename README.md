# server-application

## System Requirements:

__Server-side__
* npm - supplied by heroku
* Node.js - supplied by heroku
* "body-parser": "^1.13.3"
* "express": "^4.13.3"
* "mongodb": "^2.2.22"

__Client-side:__
* Node.js - v. 6.9.5
* npm - v. 4.1.1
* AngularJS - latest
* Ionic - v. 1.3.2

## Rest API

1. __Signing In__  
   __READY__
   POST /users/in

   Description:
   User sends precalculated salted hash and the username.
   If the password and the username have a corresponding entry in the database, the session token is generated with a PRNG,
   the user is redirected to the home page view.

   Parameters:  

   |Parameter|Description|
   |:-------------:|:-------------:|
   |username|Username provided while signing in|
   |password|User's password|  
   Request:
   ```
   {
    username: string,
    password: string
   }
   ```
   Result:
   ```
   {
    token: string,
    userId: string
   }
   ```

    __Signing Out__  
    __READY__
    POST /users/out

    Description:
    User sends personal sessionToken. sessionToken is deleted from Sessions collection and the user is logged out.

    Parameters:

    |Parameter|Description|
    |:-------------:|:-------------:|
    |sessionToken|User confirms the identity with security token|
    Request:
    ```
    {
     sessionToken: string
    }
    ```
    Result:
    ```
    {
     valid: true
    }
     ```


2. __Signing Up__  
   __READY__
   POST /users

   Description:
   User sends password, the username and the email.
   If the username does not exist in the database, the session token is generated with a PRNG, new user is added to the database and the user is redirected to the home page view.

   Parameters:  

   |Parameter|Description|
   |:-------------:|:-------------:|
   |username|Username provided while signing in|
   |password|User's password|
   |email|User's email address for signing up)|
   Request:
   ```
   {
    username: string,
    password: string,
    email: string
   }
   ```
   Result:
   ```
   {
    token: string,
    userId: string
   }
   ```

3. __Home Page__  
   __READY__
  *  GET /home/:username

   Description:
   User sends precalculated salted hash, the username and the email.
   If the username and the email do not exist in the database, the session token is generated with a PRNG, new user is added to the database and the user is redirected to the home page view.

   Parameters:  

   |Parameter|Description|
   |:-------------:|:-------------:|
   |username| Username of the current user|
   Request:
   ```
   {
    username: string
   }
   ```
   Result:
   ```
   {
    photos : [
              {
                id: mongoId,
                owner: userId,
                date: string (Datetime),
                description: string,
                tags: [Array of strings],
                category: string,
                img: string (/img/post/string),
                likes: [Array of userIDs],
                comments: [Array of Objects of the type:
                          {
                          personId: userId,
                          comment: string
                          }
              }
            ]
   }
   ```

   P.S. The resulting array is not filtered by datetime - load on the client.

  *  POST  
    __READY__
    /photos/like

     Description:
     Toggle the like (liking/unliking) the picture.
     Parameters:

     |Parameter|Description|
     |:-------------:|:-------------:|
     |sessionToken| User confirms the identity with security token|
     |id| ID of the image to be liked/unliked|
     Request:
     ```
     {
      id: string,
      sessionToken: string
     }
     ```
     Result:
     ```
     {
      valid: true
     }
     ```
4. __Profile__  
   __READY__
  *  GET /users/profile/:id  

     Description:
     Get the profile of the user.

     Parameters:

     |Parameter|Description|
     |:-------------:|:-------------:|
     |id| Username ID of the current user|
     Request:
     ```
     {
      id: string
     }
     ```
     Result:
     ```
     [
      {
        userId: string,
        username: string,
        followers: [Array of userIDs],
        following: [Array of userIDs],
        profilePicture: string (/img/profile/id)
      },
        photos: [
         {
          id: mongoId,
          date: string (Datetime),
          img: string (/img/post/string),
         }
        ]
     ]
     ```
  *  POST /users/follow  
     __READY__

     Description:
     Follow or unfollow the specified user.
     Parameters:

     |Parameter|Description|
     |:-------------:|:-------------:|
     |usernameToFollow| Username of the user you want to follow|
     |sessionToken| User confirms the identity with security token|
     Request:
     ```
     {
      usernameToFollow: string,
      sessionToken: string
     }
     ```
     Result:
     ```
     {
      valid: true
     }
     ```

  *  POST /users/profilepicture

     Description:
     Upload new profile picture
     Parameters:

     |Parameter|Description|
     |:-------------:|:-------------:|
     |file|Images are to be supplied with the following attribute type="file" enctype="multipart/form-data"|
     |sessionToken| User confirms the identity with security token|
     Request:
     ```
     req.file will contain data of the image that has been uploaded to Cloudinary

     At req.body:
     {
      sessionToken: string
     }
     ```
     Result:
     ```
     {
      valid: true
     }
     ```

5. __Search__
  *  GET /users/:username  
     __READY__

     Description:
     Display users based on string searched (list view)
     Parameters:

     |Parameter|Description|
     |:-------------:|:-------------:|
     |username|String that user names to be displayed contain|
     Request:
     ```
     {
      username:string
     }
     ```
     Result:
    ```
     [
      {
        userId: string,
        username: string,
        profilePicture: string (/img/profile/id)
      }
     ]
     ```

  *  GET /photos/:tag  
     __READY__

     Description:
     Display posts (pictures) based on tag filter (3-column grid view)
     Parameters:

     |Parameter|Description|
     |:-------------:|:-------------:|
     |tag|Tag to be used as a filter|
     Request:
     ```
     {
      tag: string
     }
     ```
     Result:
     ```
     [
      {
        id: mongoId,
        date: string (Datetime),
        img: string (/img/post/string),
      }
     ]
     ```

6. __Share__  
   POST /photos

   Description:
    Upload new profile picture. The image is also added to a corresponding Users document of the current user, where his uploaded pictures are specified.
    Parameters:

   |Parameter|Description|
   |:-------------:|:-------------:|
   |file|Images are to be supplied with the following attribute type="file" enctype="multipart/form-data"|
   |description|Free form description of the picture|
   |category|One of the preoffered categories|
   |tags|Array of free form tags|
   |sessionToken| User confirms the identity with security token|
   Request:
    ```
    req.file will contain data of the image that has been uploaded to Cloudinary

    At req.body:
    {
     description: string,
     category: string,
     tags: [Array of Strings],
     sessionToken: string
    }
    ```
   Result:
    ```
    {
     id: string
    }
    ```

7. __Photo View__
  *  GET /photos/object/:id  
     __READY__

    Description:
    Display the chosen photo and all data corresponding to it.
    Parameters:

   |Parameter|Description|
   |:-------------:|:-------------:|
   |id|ID of the image selected|
   Request:

    ```
    {
     id: string
    }
    ```

   Result:

    ```
    {
      id: mongoId (picture's),
      owner: userId,
      date: string (Datetime),
      description: string,
      tags: [Array of strings],
      category: string,
      img: string (/img/post/string),
      likes: [Array of userIDs],
      comments: [
             {
              personId: userId,
              comment: string
             }
            ]
    }
    ```
  *  POST /photos/comment  
      __READY__


   Description:
   Post a comment to a photo, comment is added to the photo document "comment" property (key)
   Parameters:

   |Parameter|Description|
   |:-------------:|:-------------:|
   |id|ID of the image being commented|
   |comment|Content of the comment|
   |sessionToken| User confirms the identity with security token|
   Request:

    ```
    {
     id: string,
     comment: string,
     sessionToken: string
    }
    ```
   Result:

    ```
    {
     valid: true
    }
    ```

### Invalid Request & Errors
If invalid request has been submitted or an error has occured, the following json object is sent back to the client:
   ```
    {
     valid: false
    }
   ```

## Database Structure
### Sample document in Users collection
```
{
  _id: mongoId,
  username: string,
  hash: (hash + salt),
  email: string,
  followers: [Array of usernames],
  following: [Array of usernames],
  photos: [Array of photoIDs],
  profilePicture: string (/version/profile/string)
}
```
### Sample document in Photos collection
```
{
  _id: mongoId,
  owner: userId,
  date: string (Datetime),
  description: string,
  tags: [Array of strings],
  category: string,
  img: string (/version/posts/string),
  likes: [Array of userIDs],
  comments: [
             {
              username: userId,
              comment: string
             }
            ]
}
```
### Sample document in Sessions collection
```
{
  _id: mongoId (comment's),
  userId: mongoId (user's),
  sessionToken: string,
  expires: date
}
```

## Image Storage

Images are stored at Cloudinary.
RootURL for the images stored is:  
http://res.cloudinary.com/hr4thv0h6/image/upload/

All urls stored in database and leading to images are shortened. The link above is to be prepended.
