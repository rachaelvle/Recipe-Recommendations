Frontend Files!

CreateUserProfile - Simple account creation 
- currently no account checking just dumps data into a local json file on user machine 
- asks for email, password, confirm password 

RequestUserName - Get the name of the user 
- stores in the same userProfile as email and password 

UserRestrictions - Check boxes that fill a list of things users can't eat 
- stores the list in a user Object found in jsonCommands 

UserPreferences - Check boxes that fill a list of things users likes 
- stores in the list in a user object found in jsonCommands

FirstTimeUser - Asks user if they used app before 

Login - Ask for email and password 
- showcasing accounts are pre-created on app startup for the our demo 


To start the backend server: 
- at the root level of the code, make sure you have a .env file
- to the file add: 
EXPO_PUBLIC_API_URL=http://localhost:3001
^^ This is fine to run locally. However if you want to test the back end and front end on a different device, replace it with your IP address. 

cd backend
npm install
npm run dev

=======================================================================================

helpers.ts - stores the normalization functions 

indexer.ts - reaches the API and populates the recipe database and inverted indexes
- table definitions for recipes.db are stored here
- to add more recipes: 
ts-node indexer.ts

migration.ts - file as indexer.ts but runs with the recipes.json (to avoid multiple API calls)
- to add more recipes: 
ts-node migration.ts

recipes.db - stores the complete recipe database and inverted indexes

searcher.ts - stores the search engine
- parse the seach query for implicit filters 
- make sure allergies are not included in any recipes 
- user can have explicit filters
- implicit filters boost scores for relevant recipes while explicit filters completely take the recipes out 
- time of day has a boost 
- returns top 10 or less depending on results 


test.ts
- test file (add tests you would like to run here)
Run full test suite:    ts-node test.ts --test
Interactive search:     ts-node test.ts "your query here"

types.ts - type declarations

user.ts - management and declaration for the user database
- includes functions for editing the database as well 

server.ts - sets up the backend and endpoints





