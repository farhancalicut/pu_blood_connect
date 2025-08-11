// app/_layout.tsx

import React, { useEffect , useRef } from "react";
import { Dimensions, StyleSheet, View, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase"; // Import db
import { doc, setDoc } from "firebase/firestore"; // Import firestore functions
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import MenuContext from "./context/MenuContext";
import MenuBar from "./MenuBar";

const { width } = Dimensions.get("window");

const DEV_EMAIL = "z@gmail.com";
const DEV_PASSWORD = "111111";

// --- NEW: Function to get and register the push token ---
async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    // This is the user's unique push token
    token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'aab4fc2c-6891-4e42-a8c3-6207ef8a7683', // Add your project ID here
    })).data;
    console.log("User's push token:", token);
  } else {
    // alert('Must use physical device for Push Notifications');
    console.log("Push notifications only work on physical devices.");
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  return token;
}

function RootLayoutNav() {
  const router = useRouter();
  const hasAttemptedLogin = useRef(false);
    useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        // A user is logged in, proceed to the app
        console.log("✅ User is signed in:", user.email);
        router.replace("/dashboard");
        
        // Register their push token
        registerForPushNotificationsAsync().then(token => {
          if (token) {
            const userDocRef = doc(db, "users", user.uid);
            setDoc(userDocRef, { pushToken: token }, { merge: true });
          }
        });

      } else {
        // No user is logged in.
        // In dev mode, try to auto-login ONCE.
        if (__DEV__ && !hasAttemptedLogin.current) {
          hasAttemptedLogin.current = true; // Mark that we've tried
          signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD)
            .then(() => {
              console.log("✅ Auto login successful");
              // The onAuthStateChanged listener will handle navigation
            })
            .catch((err) => {
              console.log("Auto-login failed, proceeding to manual login screen.", err.code);
            });
        }
      }
    });
    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <Stack initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="request" options={{ headerShown: false }} />
      <Stack.Screen name="donate" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="feedback" options={{ presentation: 'modal', title: 'Share Your Feedback', headerTitleStyle: { color: '#333' }, headerStyle: { backgroundColor: '#f0f0f0'}, }} />
    </Stack>
  );
}
export default function RootLayout() {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, 0.83]);
    const translateX = interpolate(progress.value, [0, 1], [0, width * 0.7]);
    const borderRadius = interpolate(progress.value, [0, 1], [0, 25]);
    const shadowOpacity = interpolate(progress.value, [0, 1], [0, 0.2]);
    const elevation = interpolate(progress.value, [0, 1], [0, 15]);

    return {
      borderRadius,
      transform: [{ scale }, { translateX }],
      shadowOpacity,
      elevation,
    };
  });

  const toggleMenu = () => {
    progress.value = withSpring(progress.value > 0 ? 0 : 1, {
      damping: 30,
      stiffness: 120,
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuContext.Provider value={{ toggleMenu }}>
        <View style={styles.container}>
          <StatusBar style="light" />
          <MenuBar />
          <Animated.View
            style={[styles.stackContainer, styles.shadow, animatedStyle]}
          >
            <RootLayoutNav />
          </Animated.View>
        </View>
      </MenuContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#9B0000",
  },
  stackContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowRadius: 10,
  },
});