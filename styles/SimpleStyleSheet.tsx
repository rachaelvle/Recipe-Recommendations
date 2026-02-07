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
    justifyContent: "center",
    alignItems: "center",
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
  },

  // User Preferences Style Section 
  preferenceContainer: { flex: 1, backgroundColor: "#3d3838ff" },

  scroll: { flex: 1 }, // takes up all space 
  scrollContent: { padding: 30, gap: 25, paddingTop: 100,}, 

  selected: {
    backgroundColor: "#20b24b",
    borderColor: "#c7bebeff",
    borderWidth: 2,
  },
  footer: { // background for the footer 
    height: 90,
    borderTopWidth: 1,
    borderTopColor: "#a99696ff",
    padding: 16,
    justifyContent: "center",
    backgroundColor: "rgba(48, 54, 61, 1)ff",
  },
  button: { // generic buttons 
    height: 52,
    borderRadius: 12,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#c7bebeff",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700", },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
    
  },


})