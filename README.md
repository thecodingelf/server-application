# server-application

## System Requirements
__Both sides:__
* Node.js - v. 6.9.5
* npm - v. 4.1.1

__Server-side__
* MongoDB - v. 3.2.11
* Express.js - latest

__Client-side:__
* AngularJS - latest
* Ionic - v. 1.3.2

## Rest API

1. __Signing In__  
   POST /users/signin
   
   Description:
   User sends precalculated salted hash and the username.
   If the hash and the username have a corresponding entry in the database, the session token is generated with a PRNG, the user is redirected to the home page view.
   
   Parameters:  

   |Parameter|Description|
   |:-------------:|:-------------:|
   |username|Username provided while signing in|
   |hash|hash=func(salt + password)|  
   Request:
   ```
   {
    username: string,
    hash: string
   }
   ```
   Result:
   ```
   {
    valid: boolean,
    token: string
   }
   ```
    

2. __Signing Up__  
   POST /users
   
   Description:
   User sends precalculated salted hash, the username and the email.
   If the username and the email do not exist in the database, the session token is generated with a PRNG, new user is added to the database and the user is redirected to the home page view.
   
   Parameters:  

   |Parameter|Description|
   |:-------------:|:-------------:|
   |username|Username provided while signing in|
   |hash|hash=func(salt + password)|
   |email|User's email address for signing up)|
   Request:
   ```
   {
    username: string,
    hash: string,
    email: string
   }
   ```
   Result:
   ```
   {
    valid: boolean,
    token: string
   }
   ```
   
3. __Home Page__
  *  GET /home/:id
   
   Description:
   User sends precalculated salted hash, the username and the email.
   If the username and the email do not exist in the database, the session token is generated with a PRNG, new user is added to the database and the user is redirected to the home page view.
   
   Parameters:  

   |Parameter|Description|
   |:-------------:|:-------------:|
   |userId| Username ID of the current user|
   Request:
   ```
   {
    userId: string
   }
   ```
   Result:
   ```
   {
    photos : [Array of Photo Documents
              {
                id: mongoId,
                owner: userId,
                date: string (Datetime),
                description: string,
                tags: [Array of strings],
                category: string,
                img: string (/img/posts/string),
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

  *  POST /photos/like

     Description:
     Toggle the like (liking/unliking) the picture.
     Parameters:
     
     |Parameter|Description|
     |:-------------:|:-------------:|
     |userId| Username ID of the current user|
     |sessionToken| User confirms the identity with security token|
     |imageId| ID of the image to be liked/unliked|
     Request:
     ```
     {
      userId: string,
      imageId: string,
      sessionToken: string
     }
     ```
     Result:
     ```
     {
      success: boolean
     }
     ```
4. __Profile__
  *  GET /users/:id
  
     Description:
     Get the profile of the user.
     
     Parameters:
     
     |Parameter|Description|
     |:-------------:|:-------------:|
     |userId| Username ID of the current user|
     Request:
     ```
     {
      userId: string
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
      [ Array of Images
        {
          id: mongoId,
          date: string (Datetime),
          img: string (/img/posts/string),
        }
      ]
     ]
     ```
  *  POST /users/follow

     Description:
     Follow or unfollow the specified user.
     Parameters:
     
     |Parameter|Description|
     |:-------------:|:-------------:|
     |userId| Username ID of the user you want to follow|
     |sessionToken| User confirms the identity with security token|
     Request:
     ```
     {
      userId: string,
      sessionToken: string
     }
     ```
     Result:
     ```
     {
      success: boolean
     }
     ```
   
  *  PUT /users/profilepicture

     Description:
     Upload new profile picture
     Parameters:
     
     |Parameter|Description|
     |:-------------:|:-------------:|
     |image|Binary data of the new profile image|
     |sessionToken| User confirms the identity with security token|
     Request:
     ```
     {
      image: blob (binary),
      sessionToken: string
     }
     ```
     Result:
     ```
     {
      success: boolean
     }
     ```
   
5. __Search__
  *  GET /users/:username

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
     [ Array of Users
      {
        userId: string,
        username: string,
        profilePicture: string (/img/profile/id)
      }
     ]
     ```
   
  *  GET /photos/:tag
     
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
     [ Array of Images
      {
        id: mongoId,
        date: string (Datetime),
        img: string (/img/posts/string),
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
   |image|Binary data of the new image|
   |description|Free form description of the picture|
   |category|One of the preoffered categories|
   |tags|Array of free form tags|
   |sessionToken| User confirms the identity with security token| 
   Request:
    ```
    {
     image: blob (binary), 
     description: string,
     category: string,
     tags: [Array of Strings],
     sessionToken: string
    }
    ```
   Result:
    ```
    {
     imageId: string
    }
    ```

7. __Photo View__
  *  GET /photos/:id
   
     Parameters:
   
     Request:
 
     Result:

  *  POST /photos/comment
   
     Parameters:
   
     Request:
 
     Result:
   

## Database Structure
### Sample document in Users collection
```
{
  id: mongoId,
  sessionToken: string (long, random)
  username: string,
  password: (hash + salt),
  email: string,
  followers: [Array of userIDs],
  following: [Array of userIDs],
  photos: [Array of photoIDs],
  profilePicture: string (/img/profile/id)
}
```
### Sample document in Photos collection
```
{
  id: mongoId,
  owner: userId,
  date: string (Datetime),
  description: string,
  tags: [Array of strings],
  category: string,
  img: string (/img/posts/string),
  likes: [Array of userIDs],
  comments: [Array of Objects of the type:
            {
              personId: userId,
              comment: string
            }
            ]
}
```
