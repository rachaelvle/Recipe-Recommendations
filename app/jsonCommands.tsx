import AsyncStorage from "@react-native-async-storage/async-storage";


type UserProfile = {
  email: string;
  password: string;
  Restrictions: string[]; // Dietary Restrictions
  preferences: string[];   // Food they want to eat
};



export const loadUser = async () => {
// retrieves the user name 
    const json = await AsyncStorage.getItem("user"); // hard code ID for now since this is only a demo 
    if (!json) return null;

    const user = JSON.parse(json) as UserProfile;
    return user;
};


export const StoreUserProfile = async (email: string, password: string) => {
    // generate user profile 
    const user: UserProfile = {
      email: email,
      password: password,
      Restrictions: [],
      preferences: [],
    }

    const json = JSON.stringify(user); // turn to string to store 

    await AsyncStorage.setItem(`user`, json); // store using email (for now we hard code the ID of the user)

  }

export const updatedUserRestrictions = async (restrctions: string[]) => {
    const userProfile = await loadUser(); // grab user from json folder 

    if (userProfile) // check for user profile existing 
    {
        userProfile.Restrictions = restrctions; // update 
    }

    const json = JSON.stringify(userProfile); // turn to string to store 

    await AsyncStorage.setItem(`user`, json); // overwrite with new updated user 
  }

export const updatedUserPreferences = async (Preferences: string[]) => {
    const userProfile = await loadUser(); // grab user from json folder 

    if (userProfile) // check for user profile existing 
    {
        userProfile.preferences  = Preferences ; // update 
    }

    const json = JSON.stringify(userProfile); // turn to string to store 

    await AsyncStorage.setItem(`user`, json); // overwrite with new updated user 
  }  