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