import { Tabs, router } from "expo-router";
import React from "react";
import { Pressable, Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const MapTabIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="paperplane.fill" color={color} />
);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: "none" },

        // do not mount tab screens until opened
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: MapTabIcon,
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Active Calendar",
          href: null,
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.replace("/(tabs)/map")}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 16 }}>Back</Text>
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}