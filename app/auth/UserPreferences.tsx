import { styles } from "@/styles/SimpleStyleSheet";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

type Option = {
  id: string;
  label: string;
};

type ToggleGroupProps = {
  options: Option[];
  onChange: (selected: string[]) => void;
};


export default function UserPreferences() {
  const [on, setOn] = useState(false);
  return (


    // design if pressed button 
  
    
    <View style={styles.preferenceContainer}>

      <ScrollView style={styles.scroll}
      contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
       



        <Pressable onPress={() => setOn(!on)} style={({ pressed }) => [styles.button,on && styles.selected, pressed && styles.pressed,]}>
        <Text style={[styles.Text, on && styles.Text]}> Food1 </Text>
        </Pressable>
 
        

        
        
      
      </ScrollView>



      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.YesButton, pressed && { opacity: 0.85 }]} onPress={() => Alert.alert("Continue")}>
          <Text style={styles.buttonText}>CONT</Text>
        </Pressable>
      </View>


    </View>
  );
} 