import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";


import Smartlook from 'react-native-smartlook-analytics'; 
import { useEffect } from 'react';

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  
  useEffect(() => {
   
    Smartlook.instance.preferences.setProjectKey('9add208ef165f06a47d19e097a8f5841b9354ac6');
    
    
    Smartlook.instance.start();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}