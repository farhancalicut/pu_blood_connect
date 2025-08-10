// app/_layout.tsx

import React, { useEffect } from "react";
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
import { auth } from "../firebase";

import MenuContext from "./context/MenuContext";
import MenuBar from "./MenuBar";

const { width } = Dimensions.get("window");

const DEV_EMAIL = "z@gmail.com";
const DEV_PASSWORD = "111111";

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    if (__DEV__) {
      signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD)
        .then(() => {
          console.log("✅ Auto login successful");
          router.replace("/dashboard");
        })
        .catch((err) => {
          // It's okay if this fails, user can login manually
        });
    }
  }, []);

  return (
    <Stack initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      
      {/* --- NEW: Define the feedback screen as a modal --- */}
      <Stack.Screen 
        name="feedback" 
        options={{ 
          presentation: 'modal', 
          title: 'Share Your Feedback',
          headerTitleStyle: { color: '#333' },
          headerStyle: { backgroundColor: '#f0f0f0'},
        }} 
      />
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