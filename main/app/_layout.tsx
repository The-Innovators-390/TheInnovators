import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";


import Smartlook from 'react-native-smartlook-analytics';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);


  useEffect(() => {
    Smartlook.instance.preferences.setProjectKey('9add208ef165f06a47d19e097a8f5841b9354ac6');
    Smartlook.instance.start();

    let stopTimeout: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        stopTimeout = setTimeout(() => {
          Smartlook.instance.stop();
        }, 1500);
      } else if (nextAppState === 'active') {
        if (stopTimeout) {
          clearTimeout(stopTimeout);
          stopTimeout = null;
        } else {
          Smartlook.instance.start();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      if (stopTimeout) clearTimeout(stopTimeout);
      subscription.remove();
    };
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