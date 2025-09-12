import React, { useEffect, useState } from "react";
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; 
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import MenuContext, { useMenu } from "./context/MenuContext";
import MenuBar from "./MenuBar";
import Icon from 'react-native-vector-icons/FontAwesome5';
import RegularIcon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get("window");


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
    token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'aab4fc2c-6891-4e42-a8c3-6207ef8a7683', 
    })).data;
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

function MenuButton() {
  const { toggleMenu } = useMenu();
  return (
    <TouchableOpacity onPress={toggleMenu} style={{ marginLeft: 15 }}>
      <Icon name="bars" size={22} color="#333333" />
    </TouchableOpacity>
  );
}

function BellButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/notifications')} style={{ marginRight: 15 }}>
      <RegularIcon name="bell" size={22} color="#333333" />
    </TouchableOpacity>
  );
}

function AdminBackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.replace('/dashboard')} style={{ marginLeft: 15 }}>
      <Ionicons name="chevron-back" size={28} color="#333" />
    </TouchableOpacity>
  );
}

function AppStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'PU BLOOD CONNECT', 
          headerTitleAlign: 'center', 
          headerBackVisible: false,
          headerTitleStyle: { fontSize: 18, color: '#de0101ff', fontWeight: 'bold' },
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'PU BLOOD CONNECT', 
          headerTitleAlign: 'center', 
          headerBackVisible: false,
          headerTitleStyle: { fontSize: 18, color: '#de0101ff', fontWeight: 'bold' },
        }} 
      />
      
      <Stack.Screen 
        name="dashboard" 
        options={{
          title: 'PU BLOOD CONNECT',
          headerTitleAlign: 'center',
          headerLeft: () => <MenuButton />,
          headerRight: () => <BellButton />,
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontSize: 18, color: '#de0101ff', fontWeight: 'bold' },
        }} 
      />
      <Stack.Screen name='History' options={{ title: 'History', headerTitleAlign: 'center' }} />
      <Stack.Screen name="feedback" options={{ presentation: 'modal', title: 'Share Your Feedback' }} />
      <Stack.Screen name="request" options={{ title: 'Request Blood', headerTitleAlign: 'center' }} />
      <Stack.Screen name="donate" options={{ title: 'Find Donors', headerTitleAlign: 'center' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications', headerTitleAlign: 'center' }} />
      <Stack.Screen name="upload-credential" options={{ title: 'Upload Credential', headerTitleAlign: 'center' }} />
      <Stack.Screen name="admin" options={{ title: 'Admin Panel', headerTitleAlign: 'center', headerLeft: () => <AdminBackButton /> }} />
      <Stack.Screen name="certificate" options={{ title: 'Your Certificate', headerTitleAlign: 'center' }} />
      <Stack.Screen name="my-requests" options={{ title: 'My Requests', headerTitleAlign: 'center' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile', headerTitleAlign: 'center' }} />
      <Stack.Screen name="blood-banks" options={{ title: 'Nearby Blood Banks', headerTitleAlign: 'center' }} />
      <Stack.Screen name="add-blood-bank" options={{ title: 'Add New Blood Bank', headerTitleAlign: 'center' }} />
      <Stack.Screen name="events" options={{ title: 'Events & Camps', headerTitleAlign: 'center' }} />
      <Stack.Screen name="add-event" options={{ title: 'Manage Event', headerTitleAlign: 'center' }} />
      <Stack.Screen name="recent-donors" options={{ title: 'Recent Donors', headerTitleAlign: 'center' }} />
      <Stack.Screen name="faq" options={{ title: 'FAQ', headerTitleAlign: 'center' }} />
      <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy', headerTitleAlign: 'center' }} />
      <Stack.Screen name="terms-and-conditions" options={{ title: 'Terms & Conditions', headerTitleAlign: 'center' }} />
      <Stack.Screen name="contact-us" options={{ title: 'Contact Us', headerTitleAlign: 'center' }} />
      <Stack.Screen name="gallery" options={{ title: 'Gallery', headerTitleAlign: 'center' }} />
      <Stack.Screen name="top-donors" options={{ title: 'Top Donors', headerTitleAlign: 'center' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile', headerTitleAlign: 'center' }} />

    </Stack>
  );
}

export default function RootLayout() {
  const progress = useSharedValue(0);
  const router = useRouter();
  const segments = useSegments();
  const [authLoading, setAuthLoading] = useState(true);

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthLoading(false);
      
      const inApp = segments[0] !== 'login' && segments[0] !== 'register';
      
      // if (user && user.emailVerified) {
        if (user) {

        if (!inApp) {
          router.replace('/dashboard');
        }
      } else {
        if (inApp) {
          router.replace('/login');
        }
      }
    });
    return () => unsubscribe();
  }, [segments]);
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

  if (authLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuContext.Provider value={{ toggleMenu }}>
        <View style={styles.container}>
          <StatusBar style="light" />
          <MenuBar />
          <Animated.View style={[styles.stackContainer, styles.shadow, animatedStyle]}>
            <AppStack />
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