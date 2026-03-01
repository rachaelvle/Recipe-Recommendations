import { StyleSheet } from "react-native";

// COLOR PALLETE 
// #39afaf b
// #333333 
// #4b4b4b
// text "#f4f4f4

// style to repeatedly store design choices 
export const styles = StyleSheet.create({

  container: {
    backgroundColor:"#333333",
    flex: 1,
    gap:10,
    justifyContent: "center",
    alignItems: "center",
  },
  HeaderText: {
    fontWeight: "800",
    color: "#f4f4f4",
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
    backgroundColor: "#39afaf",
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
    backgroundColor: "#39afaf",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  input: {
    width: "80%",
    backgroundColor: 'transparent',
    color: "#f4f4f4",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#39afaf",
  },
  error: {
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
  },

  // User Allegies Style Section 
  preferenceContainer: { flex: 1, backgroundColor: "#333333" },

  scroll: { flex: 1 }, // takes up all space 
  scrollContent: { padding: 30, gap: 25, paddingTop: 50,}, 

  selected: {
    backgroundColor: "#39afaf",
    borderColor: "#258585",
    borderWidth: 2,
  },

  footer: { // background for the footer 
    height: 90,
    borderTopWidth: 1,
    borderTopColor: "#a99696ff",
    padding: 16,
    justifyContent: "center",
    backgroundColor: "39afaf",
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

  buttonText: { color: "white", fontSize: 18, fontWeight: "700", },

  selectedText: { color: "#fff",},

  BannerText: {
    fontWeight: "800",
    paddingTop: 90,
    color: "#f4f4f4",
    fontSize: 25,
    textAlign: "center",
  },

  SecondBannerText: {
    fontWeight: "800",
    paddingTop: 25,
    color: "#f4f4f4",
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

    Prefcontainer: {
    flex: 1,
    backgroundColor: "#333333",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    color: "#ffffff",
  },

  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 10,
  },
  Headerinput: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: "#39afaf",
    borderRadius: 4,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#ffffff",
    backgroundColor: "#4b4b4b",
  },
  addButton: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: "#39afaf",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonPressed: {
    backgroundColor: "#39afaf",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  
  chipList: {
    gap: 10,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#39afaf",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
    borderWidth: 2,
    borderColor: "#39afaf",
  },
  chipPressed: {
    backgroundColor: "#39afaf",
  },
  chipX: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  chipText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  emptyHint: {
    color: "#aaa",
    fontSize: 15,
    marginTop: 8,
  },

  // Save button
  saveButton: {
    marginTop: 16,
    height: 52,
    backgroundColor: "#39afaf",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonPressed: {
    backgroundColor: "#268b8b",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  
  

})