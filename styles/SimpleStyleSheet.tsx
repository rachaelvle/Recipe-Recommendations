import { StyleSheet } from "react-native";

// style to repeatedly store design choices 
export const styles = StyleSheet.create({

  container: {
    backgroundColor:"##f4f4f4",
    flex: 1,
    gap:10,
    justifyContent: "center",
    alignItems: "center",
  },
  HeaderText: {
    fontWeight: "800",
    color: "#white",
    fontSize: 25,
    textAlign: "center",
    padding: 24, 
  },
  Text: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    
  },
    buttonRow: {
    flexDirection: "row", // 👈 makes them LEFT + RIGHT
    gap: 16,
  },

  StartButton: {
    backgroundColor: "#ff5e65",
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
    backgroundColor: "#ff5e65",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  input: {
    width: "80%",
    backgroundColor: 'transparent',
    color: "black",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ff5e65",
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 10,
    textAlign: "center",
  },

  // User Allegies Style Section 
  preferenceContainer: { flex: 1, backgroundColor: "#f4f4f4" },

  scroll: { flex: 1 }, // takes up all space 
  scrollContent: { padding: 30, gap: 25, paddingTop: 50,}, 

  selected: {
    backgroundColor: "#ff5e65",
    borderColor: "#FA2533",
    borderWidth: 2,
  },

  footer: { // background for the footer 
    height: 90,
    borderTopWidth: 1,
    borderTopColor: "#a99696ff",
    padding: 16,
    justifyContent: "center",
    backgroundColor: "rgb(242, 245, 248)ff",
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

  buttonText: { color: "black", fontSize: 18, fontWeight: "700", },

  selectedText: { color: "#fff",},

  BannerText: {
    fontWeight: "800",
    paddingTop: 90,
    color: "black",
    fontSize: 25,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },

  ToggleButton: { // generic buttons 
    height: 80,
    borderRadius: 30,
    backgroundColor: "#transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#gray",
  },


  // UserProfile Layout 
  
  

})