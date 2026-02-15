import AsyncStorage from "@react-native-async-storage/async-storage";

export const StoreCurrentUserID = async (ID: Number) => {

  // store current user so we can pass it over to next pages 
  // for passing data over to next pages 
  const jsonValue = JSON.stringify(ID); // turn to string 
  
  await AsyncStorage.setItem("currUser", jsonValue); // stroe 
}

export const LoadCurrentUserID = async () => {
  const value = await AsyncStorage.getItem("currUser");

  if (value === null) {
    return null; // nothing stored yet
  }

  // Convert string → number
  const parsed = JSON.parse(value) as number;
  return parsed;
};
