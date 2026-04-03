import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { styles } from "@/components/Styles/welcomeStyle";
//The facade is used to abstract away the Google Sign-In logic, making the component cleaner and more focused on UI.
import { googleAuthFacade } from "@/services/google/facades/GoogleAuthFacade";

export default function WelcomeScreen() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      //Configuration is handled in the facade, which sets up the Google Sign-In with necessary details
      googleAuthFacade.configure();
    } catch (e: any) {
      console.log("Google config error:", e);
      Alert.alert("Config error", e?.message ?? "Google config missing");
    }
  }, []);

  const onGoogleSignInPress = async () => {
    try {
      setLoading(true);
      // The sign-in process is initiated through the facade, which manages the entire flow and returns the authentication status.
      await googleAuthFacade.signIn();

      router.replace("/(tabs)/map");
    } catch (e: any) {
      console.log("Google sign-in failed:", e);
      Alert.alert(
        "Google Sign-In failed",
        e?.message ?? "Sign-in was cancelled or failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onContinueGuestPress = () => {
    router.replace("/(tabs)/map");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Campus Guide</Text>
        <Text style={styles.subtitle}>
          Explore SGW & Loyola maps and find your way around.
        </Text>

        <Pressable
          testID="google-sign-in-button"
          style={styles.googleButton}
          onPress={onGoogleSignInPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        testID="guest-sign-in-button"
        onPress={onContinueGuestPress}
        style={styles.guestWrapper}
      >
        <Text style={styles.guestText}>Continue without signing in</Text>
      </Pressable>
    </View>
  );
}
