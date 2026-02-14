import AsyncStorage from "@react-native-async-storage/async-storage";


type UserProfile = {
  username: string
  email: string;
  password: string;
  Restrictions: string[]; // Dietary Restrictions
  preferences: string[];   // Food they want to eat
};

export const loadUser = async (ID: string) => {
// retrieves the user name 
    const json = await AsyncStorage.getItem(ID);  
    if (!json) return null;

    const user = JSON.parse(json) as UserProfile;
    return user;
};

export const StoreCurrentUserID = async (email: string) => {

  // store current user so we can pass it over to next pages 
  // for passing data over to next pages 
  await AsyncStorage.setItem("currUser", email);
}

export const LoadCurrentUserID = async (): Promise<string> => {
  return (await AsyncStorage.getItem("currUser")) ?? "";
};

export const StoreUserProfile = async (email: string, password: string) => {
    // generate user profile 
    const user: UserProfile = {
      username: "",
      email: email,
      password: password,
      Restrictions: [],
      preferences: [],
    }

    const json = JSON.stringify(user); // turn to string to store 

    await AsyncStorage.setItem(email, json); // store using email (for now we hard code the ID of the user)

  }

export const UpdateUserName = async (ID: string, username: string) => {
    const userProfile = await loadUser(ID); // grab user from json folder 

    if (userProfile) // check for user profile existing 
    {
        userProfile.username = username; // update with username
    }

    const json = JSON.stringify(userProfile); // turn to string to store 

    await AsyncStorage.setItem(ID, json); // overwrite with new updated user 
}

export const updatedUserRestrictions = async (ID: string, restrctions: string[]) => {
    const userProfile = await loadUser(ID); // grab user from json folder 

    if (userProfile) // check for user profile existing 
    {
        userProfile.Restrictions = restrctions; // update 
    }

    const json = JSON.stringify(userProfile); // turn to string to store 

    await AsyncStorage.setItem(ID, json); // overwrite with new updated user 
}

export const updatedUserPreferences = async (ID:string, Preferences: string[]) => {
    const userProfile = await loadUser(ID); // grab user from json folder 

    if (userProfile) // check for user profile existing 
    {
        userProfile.preferences  = Preferences ; // update 
    }

    const json = JSON.stringify(userProfile); // turn to string to store 

    await AsyncStorage.setItem(ID, json); // overwrite with new updated user 
  }  

// Generate User Profiles 
export const GenerateInitialProfiles = async (username: string, email: string, password: string, restrict: string[], pref: string[]) => {

// on app start, stores these user profiles to be used for showcasing (during logins vs user account creation)
  await StoreUserProfile(email, password);
  await UpdateUserName(email, username);

  await updatedUserRestrictions(email, restrict);
  await updatedUserPreferences(email, pref);
}


// testing function 
export const PrintStoredUser = async (ID: string) => {
  const userProfile = await loadUser(ID); // grab user from json folder 

  if (userProfile) // check for user profile existing 
  {
    console.log(userProfile);
  }

}