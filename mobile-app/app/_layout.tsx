import React, { useEffect, useState, useRef } from "react";
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View, ActivityIndicator, Animated as RNAnimated, Easing } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { onAuthStateChanged, getAuth } from "firebase/auth"; 
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
    <TouchableOpacity onPress={() => router.push('/admin-dashboard')} style={{ marginLeft: 15 }}>
      <Ionicons name="chevron-back" size={28} color="#333" />
    </TouchableOpacity>
  );
}

function AppStack() {
  return (
    <Stack screenOptions={{ 
      animation: 'none', 
      contentStyle: { backgroundColor: '#F0F2F5' },
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'PU NSS CONNECT', 
          headerTitleAlign: 'center', 
          headerBackVisible: false,
          headerTitleStyle: { fontSize: 18, color: '#de0101ff', fontWeight: 'bold' },
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'PU NSS CONNECT', 
          headerTitleAlign: 'center', 
          headerBackVisible: false,
          headerTitleStyle: { fontSize: 18, color: '#de0101ff', fontWeight: 'bold' },
        }} 
      />
      
      <Stack.Screen 
        name="dashboard" 
        options={{
          title: 'PU NSS CONNECT',
          headerTitleAlign: 'center',
          headerLeft: () => <MenuButton />,
          headerRight: () => <BellButton />,
          headerStyle: { backgroundColor: '#ffffff' },
          contentStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontSize: 18, color: '#de0101ff', fontWeight: 'bold' },
        }} 
      />
      <Stack.Screen name='History' options={{ title: 'History', headerTitleAlign: 'center' }} />
      <Stack.Screen name="feedback" options={{ presentation: 'modal', title: 'Share Your Feedback' }} />
      <Stack.Screen name="request" options={{ title: 'Request Blood', headerTitleAlign: 'center' }} />
      <Stack.Screen name="donate" options={{ title: 'Find Donors', headerTitleAlign: 'center' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications', headerTitleAlign: 'center'}} />
      <Stack.Screen name="upload-credential" options={{ title: 'Upload Credential', headerTitleAlign: 'center' }} />
      <Stack.Screen name="admin" options={{ title: 'Admin Panel', headerTitleAlign: 'center', headerLeft: () => <AdminBackButton /> }} />
      <Stack.Screen 
        name="admin-dashboard" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="admin-users" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="admin-events" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="admin-donations" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="admin-feedback" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="admin-blood-banks" 
        options={{ 
          headerShown: false
        }} 
      />
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
  const progress = useRef(new RNAnimated.Value(0)).current;
  const router = useRouter();
  const segments = useSegments();
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Close menu when navigating
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      RNAnimated.timing(progress, {
        toValue: 0,
        duration: 350,  // Slower closing animation
        easing: Easing.out(Easing.quad),  // Smooth closing
        useNativeDriver: false,
      }).start();
    }
  }, [segments[0]]);
  
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
    const inApp = segments[0] !== 'login' && segments[0] !== 'register';

    if (user) {
      // User is authenticated - check their email verification and role
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const role = userDoc.exists() ? userDoc.data().role : 'user';
        setUserRole(role);
        
        // Check email verification only for regular users (not admins)
        if (!user.emailVerified && role !== 'admin') {
          // Email not verified for regular user - sign out and redirect to login
          const { signOut } = await import('firebase/auth');
          await signOut(getAuth());
          setUserRole(null);
          if (inApp) {
            router.replace('/login');
          }
          return;
        }
        
        // Only redirect if they're on login/register page or if they're on the wrong dashboard
        if (!inApp) {
          // Coming from login/register page
          if (role === 'admin') {
            router.replace('/admin-dashboard');
          } else {
            router.replace('/dashboard');
          }
        } else {
          // Already in app - check if they're on the wrong dashboard
          const currentPage = segments[0];
          // Only redirect if they're actually on the wrong dashboard page
          if (role === 'admin' && currentPage === 'dashboard') {
            // Admin on user dashboard - redirect to admin dashboard
            router.replace('/admin-dashboard');
          } else if (role !== 'admin' && (currentPage === 'admin-dashboard' || currentPage?.startsWith('admin-'))) {
            // Regular user on any admin page - redirect to user dashboard
            router.replace('/dashboard');
          }
          // Don't redirect for other pages - let users navigate freely
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole('user');
        if (!inApp) {
          router.replace('/dashboard');
        }
      }
    } else {
      // User is not authenticated
      setUserRole(null);
      if (inApp) {
        router.replace('/login');
      }
    }
    
    // Add small delay to prevent flickering
    setTimeout(() => setAuthLoading(false), 100);
  });

  return () => unsubscribe();
}, [segments])

  const animatedStyle = {
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.83],
        }),
      },
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, width * 0.7],
        }),
      },
    ],
    borderRadius: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 25],
    }),
    shadowOpacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.2],
    }),
    elevation: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 15],
    }),
  };

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    setIsMenuOpen(!isMenuOpen);
    
    RNAnimated.timing(progress, {
      toValue,
      duration: 500,  // Slower animation (was 300)
      easing: Easing.out(Easing.cubic),  // Smooth easing
      useNativeDriver: false,
    }).start();
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5' }}>
        <ActivityIndicator size="large" color="#9B0000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuContext.Provider value={{ toggleMenu }}>
            <View style={styles.container}>
            <StatusBar style="light" />
             <MenuBar /> 
             <RNAnimated.View style={[styles.stackContainer, styles.shadow, animatedStyle]}>
             <AppStack />
            </RNAnimated.View>
        </View> 
        </MenuContext.Provider>
      </GestureHandlerRootView>




    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5", // Match the page background
  },
  menuBar: {
    // ... your menu bar styles
    zIndex: 1, // Ensure the menu bar is behind the main screen
  },
  stackContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden", // Force hidden on both platforms
    zIndex: 2000,
    backgroundColor: "#F0F2F5", // Ensure background consistency
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