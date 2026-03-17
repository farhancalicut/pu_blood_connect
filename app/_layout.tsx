import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Easing,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../firebase"; // Ensure Firebase is initialized before usage

import { Bell, ChevronLeft, Menu } from "lucide-react-native";
import { runReminderScheduler } from "../utils/reminderScheduler";
import DesktopWarning from "./_components/DesktopWarning";
import InstallPWA from "./_components/InstallPWA";
import WebProvider from "./_components/WebProvider";
import MenuContext, { useMenu } from "./context/MenuContext";
import MenuBar from "./MenuBar";

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {
  // On web or if there's an error, this is expected
  console.log("SplashScreen.preventAutoHideAsync not available");
});

const { width } = Dimensions.get("window");

// Configure how notifications are handled when app is in foreground
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web") {
    // Web push notifications handled by notificationsWeb.ts
    return null;
  }

  let token;
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "aab4fc2c-6891-4e42-a8c3-6207ef8a7683",
      })
    ).data;
  }
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  return token;
}

function MenuButton() {
  const { toggleMenu } = useMenu();
  return (
    <TouchableOpacity onPress={toggleMenu} style={{ marginLeft: 15 }}>
      <Menu size={22} color="#333333" />
    </TouchableOpacity>
  );
}

function BellButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      style={{ marginRight: 15 }}
    >
      <Bell size={22} color="#333333" />
    </TouchableOpacity>
  );
}

function AdminBackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/admin-dashboard")}
      style={{ marginLeft: 15 }}
    >
      <ChevronLeft size={28} color="#333" />
    </TouchableOpacity>
  );
}

function BackButton() {
  const router = useRouter();
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };
  return (
    <TouchableOpacity
      onPress={handleBack}
      style={{ marginLeft: 15 }}
    >
      <ChevronLeft size={28} color="#333" />
    </TouchableOpacity>
  );
}

function AppStack() {
  return (
    <Stack
      screenOptions={{
        animation: "none",
        contentStyle: { backgroundColor: "#F0F2F5" },
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          title: "PU NSS CONNECT",
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerLeft: () => null,
          headerTitleStyle: {
            fontSize: 18,
            color: "#de0101ff",
            fontWeight: "bold",
          },
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "PU NSS CONNECT",
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerLeft: () => null,
          headerTitleStyle: {
            fontSize: 18,
            color: "#de0101ff",
            fontWeight: "bold",
          },
        }}
      />

      <Stack.Screen
        name="dashboard"
        options={{
          title: "PU NSS CONNECT",
          headerTitleAlign: "center",
          headerLeft: () => <MenuButton />,
          headerRight: () => <BellButton />,
          headerStyle: { backgroundColor: "#ffffff" },
          contentStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: {
            fontSize: 18,
            color: "#de0101ff",
            fontWeight: "bold",
          },
        }}
      />
      <Stack.Screen
        name="History"
        options={{ title: "History", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="feedback"
        options={{ presentation: "modal", title: "Share Your Feedback" }}
      />
      <Stack.Screen
        name="request"
        options={{ title: "Request Blood", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="donate"
        options={{ title: "Find Donors", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: "Notifications", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="upload-credential"
        options={{ title: "Upload Credential", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin"
        options={{
          title: "Admin Panel",
          headerTitleAlign: "center",
          headerLeft: () => <AdminBackButton />,
        }}
      />
      <Stack.Screen
        name="admin-dashboard"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-users"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-events"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-donations"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-feedback"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-blood-banks"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-hospitals"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-nss"
        options={{
          headerShown: false,
        }}
      />

      {/* Hospital Screens */}
      <Stack.Screen
        name="hospital-dashboard"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="hospital-add-request"
        options={{
          title: "Add Blood Request",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="hospital-my-requests"
        options={{
          title: "My Blood Requests",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="hospital-request-details"
        options={{
          title: "Request Details",
          headerTitleAlign: "center",
        }}
      />

      <Stack.Screen
        name="certificate"
        options={{ title: "Your Certificate", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="my-requests"
        options={{ title: "My Requests", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="profile"
        options={{ title: "My Profile", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="blood-banks"
        options={{ title: "Nearby Blood Banks", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="add-blood-bank"
        options={{ title: "Add New Blood Bank", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="events"
        options={{ title: "Events & Camps", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="add-event"
        options={{ title: "Manage Event", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="recent-donors"
        options={{ title: "Recent Donors", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="faq"
        options={{ title: "FAQ", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{ title: "Privacy Policy", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="terms-and-conditions"
        options={{ title: "Terms & Conditions", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="contact-us"
        options={{ title: "Contact Us", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="gallery"
        options={{ title: "Gallery", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="top-donors"
        options={{ title: "Top Donors", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ title: "Edit Profile", headerTitleAlign: "center" }}
      />
    </Stack>
  );
}

// Simple Error Boundary for Web Debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
            Something went wrong.
          </Text>
          <Text style={{ color: "red" }}>{this.state.error?.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function RootLayoutContent() {
  const progress = useRef(new RNAnimated.Value(0)).current;
  const router = useRouter();
  const segments = useSegments();
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Hide splash screen on mount (no font loading needed for SVG icons)
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // On web or if there's an error, this is expected
      console.log("SplashScreen.hideAsync not available");
    });
  }, []);

  // Set up reminder scheduler - runs every 10 minutes
  useEffect(() => {
    // Run immediately on app start
    runReminderScheduler();

    // Then run every 10 minutes
    const intervalId = setInterval(
      () => {
        runReminderScheduler();
      },
      10 * 60 * 1000,
    ); // 10 minutes

    return () => clearInterval(intervalId);
  }, []);

  // Close menu when navigating
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      RNAnimated.timing(progress, {
        toValue: 0,
        duration: 350, // Slower closing animation
        easing: Easing.out(Easing.quad), // Smooth closing
        useNativeDriver: false,
      }).start();
    }
  }, [segments[0]]);

  useEffect(() => {
    let unsubscribe: () => void;
    let isRedirecting = false; // Prevent multiple simultaneous redirects

    try {
      unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
        // Prevent redirect loops
        if (isRedirecting) return;

        const inApp = segments[0] !== "login" && segments[0] !== "register";

        if (user) {
          // User is authenticated - check their email verification and role
          try {
            // Check if we can actually import these modules
            const { doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("../firebase");
            const { withNetworkRetry } = await import("../utils/networkStatus");

            if (!db) throw new Error("Firebase DB not initialized");

            const userDocRef = doc(db, "users", user.uid);
            
            // Use network retry for getDoc to handle offline states
            const userDoc = await withNetworkRetry(() => getDoc(userDocRef), 1, 500);

            const role = userDoc.exists() ? userDoc.data().role : "user";
            setUserRole(role);

            // Check email verification only for regular users (not admins or hospitals)
            if (
              !user.emailVerified &&
              role !== "admin" &&
              role !== "hospital"
            ) {
              // Email not verified for regular user - sign out and redirect to login
              const { signOut } = await import("firebase/auth");
              await signOut(getAuth());
              setUserRole(null);
              if (inApp) {
                router.replace("/login");
              }
              return;
            }

            // Only redirect if they're on login/register page or if they're on the wrong dashboard
            if (!inApp) {
              isRedirecting = true;
              // Coming from login/register page
              if (role === "admin") {
                setTimeout(() => router.replace("/admin-dashboard"), 100);
              } else if (role === "hospital") {
                setTimeout(() => router.replace("/hospital-dashboard"), 100);
              } else {
                setTimeout(() => router.replace("/dashboard"), 100);
              }
            } else {
              // Already in app - check if they're on the wrong dashboard
              const currentPage = segments[0];
              // Only redirect if they're actually on the wrong dashboard page
              if (role === "admin" && currentPage === "dashboard") {
                isRedirecting = true;
                // Admin on user dashboard - redirect to admin dashboard
                setTimeout(() => router.replace("/admin-dashboard"), 100);
              } else if (
                role === "hospital" &&
                (currentPage === "dashboard" ||
                  currentPage === "admin-dashboard")
              ) {
                isRedirecting = true;
                // Hospital on wrong dashboard - redirect to hospital dashboard
                setTimeout(() => router.replace("/hospital-dashboard"), 100);
              } else if (
                role !== "admin" &&
                role !== "hospital" &&
                (currentPage === "admin-dashboard" ||
                  currentPage?.startsWith("admin-") ||
                  currentPage === "hospital-dashboard" ||
                  currentPage?.startsWith("hospital-"))
              ) {
                isRedirecting = true;
                // Regular user on any admin or hospital page - redirect to user dashboard
                setTimeout(() => router.replace("/dashboard"), 100);
              }
              // Don't redirect for other pages - let users navigate freely
            }
          } catch (error: any) {
            // Handle offline errors more gracefully - don't log noisy errors
            const isOfflineError =
              error?.code === 'unavailable' ||
              error?.message?.includes('offline') ||
              error?.message?.includes('network') ||
              error?.message?.includes('timeout');

            if (!isOfflineError) {
              console.error("Error checking user role:", error);
            }
            
            setUserRole("user");
            if (!inApp) {
              router.replace("/dashboard");
            }
          }
        } else {
          // User is not authenticated
          setUserRole(null);
          if (inApp) {
            isRedirecting = true;
            setTimeout(() => router.replace("/login"), 100);
          }
        }

        // Add small delay to prevent flickering
        setTimeout(() => setAuthLoading(false), 100);
      });
    } catch (error) {
      console.error("Firebase auth check failed:", error);
      // Fallback to login if auth check crashes
      setAuthLoading(false);
      if (segments[0] !== "login" && segments[0] !== "register") {
        router.replace("/login");
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [segments]);

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
      duration: 500, // Slower animation (was 300)
      easing: Easing.out(Easing.cubic), // Smooth easing
      useNativeDriver: false,
    }).start();
  };

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F0F2F5",
        }}
      >
        <ActivityIndicator size="large" color="#9B0000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[
        { flex: 1 },
        Platform.OS === "web" && ({ height: "100vh" } as any),
      ]}
    >
      <WebProvider>
        <DesktopWarning />
        <MenuContext.Provider value={{ toggleMenu }}>
          <View style={styles.container}>
            <StatusBar style="light" />
            <MenuBar />
            <RNAnimated.View
              style={[styles.stackContainer, styles.shadow, animatedStyle]}
            >
              <AppStack />
            </RNAnimated.View>
            <InstallPWA />
          </View>
        </MenuContext.Provider>
      </WebProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
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
