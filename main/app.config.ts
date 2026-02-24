import "dotenv/config";

export default {
  expo: {
    name: "TheInnovators",
    slug: "theinnovators",
    ios: {
      bundleIdentifier: "com.theinnovators.campusguide",
      supportsTablet: true,
      googleServicesFile: "./GoogleService-Info.plist",

      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "We use your location to show your position on the campus map and help with navigation.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "We use your location to provide navigation features on campus.",
      },
    },
    android: {
      package: "com.theinnovators.campusguide",
      googleServicesFile: "./google-services.json",

      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],

      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    plugins: [
      "@react-native-google-signin/google-signin",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "We use your location to show your position on the campus map and help with navigation.",
        },
      ],
    ],

    extra: {
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    },
  },
};
