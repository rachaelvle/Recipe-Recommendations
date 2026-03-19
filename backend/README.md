helpers.ts - stores the normalization functions 

indexer.ts - reaches the API and populates the recipe database and inverted indexes
- table definitions for recipes.db are stored here

migration.ts - file as indexer.ts but runs with the recipes.json (to avoid multiple API calls)

recipes.db - stores the complete recipe database and inverted indexes

searcher.ts - stores the search engine

test.ts - test file (add tests you would like to run here)

user.ts - management and declaration for the user database
- includes functions for editing the database as well 

server.ts - sets up the backend and endpoints

users.db - user database 

types.ts - store type declarations 


