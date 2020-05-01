# API DOCUMENTATION

## Paths

**IT IS RECOMMENDED TO USE AN AUTHORIZATION HEADER FOR ALL REQUESTS**

### /users/create

    post:
      tags:
        - client
      summary: creates a new user
      description: |
        Creates a new user document in the datase
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: 
                  type: string
                email:
                  type: string
                password: 
                  type: string
                phone_number: 
                  type: string
                userTag: 
                  type: string
                userProfile:
                  type: object
                  properties:
                    department:
                      type: string
                    gender: 
                      type: string
                    university: 
                      type: string
                    bio: 
                      type: string
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: 
                    type: string
        '400':
          description: user exists
          content:
            application/json: 
              schema:
                type: object
                properties:
                  exist: 
                    type: boolean

### /users/login

    post:
      summary: creates token to be inserted in request headers and 
      
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password: 
                  type: string
      responses:
        '200':
          description: OK
        '500':
          description: INTERNAL SERVER ERROR
        '400': 
          description: BAD REQUEST

### /users/getUserInfo/{id}/{searchKey}

    get: 
      summary: Returns a user's profile
      parameters: 
        - name: id
          in: path
          required: true
          description: The id of the user's document in db
          schema:
            type: string
        - name: searchKey
          in: path
          required: true
          description: A search key of one of these followers, followings and profile
          schema:
            type: string
      responses:
        '200':
          description: A user profile object.
          content: 
            application/json:
              schema:
                type: object
        '500':
          description: Internal Server Error

### /users/update (**PROTECTED**)

    post:
      summary: Updates a field in the user
      requestBody:
        required: true
        content: 
          application/json:
            schema:
              type: object
              properties:
                field:
                    type: string
                    example: name
                update:
                    type: string
                    example: John
      '200':
        description: User has been updated
        content: 
            application/json:
              schema:
                type: object


### /users/avatar/upload (**PROTECTED**)

    post:
      summary: Upload user avatar
      requestBody:
        required: true
        content:
          application/json:
            schema: 
             type: file
      response: 
      '200': 
        description: Returns the avatar location
        content: 
            application/json:
                schema: 
                    type: object
