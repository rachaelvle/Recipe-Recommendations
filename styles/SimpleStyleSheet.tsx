import { StyleSheet } from "react-native";

// style to repeatedly store design choices 
export const styles = StyleSheet.create({
  container: {
    backgroundColor:"#25292e",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  HeaderText: {
    color: "white",
    fontSize: 25,
    textAlign: "center",
    padding: 24, 
  },
  Text: {
    color:"white"
  },
    buttonRow: {
    flexDirection: "row", // 👈 makes them LEFT + RIGHT
    gap: 16,
  },

  StartButton: {
    backgroundColor: "#39afafff",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },


  NoButton: {
    backgroundColor: "#f41d1dff",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },

   YesButton: {
    backgroundColor: "#12fd02ff",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  input: {
  width: "80%",   // 👈 this is it
  backgroundColor: "#333",
  color: "white",
  padding: 14,
  borderRadius: 10,
  marginBottom: 16,
},
error: {
  color: "#ff6b6b",
  marginBottom: 10,
  textAlign: "center",
}


})