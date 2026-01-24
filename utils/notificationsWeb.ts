import * as ExpoNotifications from "expo-notifications";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { Platform } from "react-native";
import { firebaseApp } from "../firebase";

/**
 * Notifications utilities with web support
 */

// Configure notification handler
if (Platform.OS !== "web") {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const requestNotificationPermissions = async () => {
  if (Platform.OS === "web") {
    // Web push notifications
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return { status: "denied" };
    }

    const permission = await Notification.requestPermission();
    return {
      status: permission,
      granted: permission === "granted",
    };
  }

  // Mobile notifications
  const { status: existingStatus } =
    await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return {
    status: finalStatus,
    granted: finalStatus === "granted",
  };
};

export const getNotificationToken = async () => {
  if (Platform.OS === "web") {
    try {
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, {
        vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
      });
      return token;
    } catch (error) {
      console.error("Error getting web push token:", error);
      return null;
    }
  }

  // Mobile notifications
  try {
    const token = (
      await ExpoNotifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      })
    ).data;
    return token;
  } catch (error) {
    console.error("Error getting mobile push token:", error);
    return null;
  }
};

export const scheduleNotification = async (
  title: string,
  body: string,
  seconds: number = 5,
) => {
  if (Platform.OS === "web") {
    // Web notifications use Notification API
    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon-192x192.png",
          badge: "/icon-72x72.png",
          tag: "notification",
          requireInteraction: false,
        });
      }
    }, seconds * 1000);
    return;
  }

  // Mobile notifications
  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {},
    },
    trigger: { seconds } as any,
  });
};

export const showLocalNotification = async (
  title: string,
  body: string,
  data?: any,
) => {
  if (Platform.OS === "web") {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "notification",
        data,
      });
    }
    return;
  }

  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null,
  });
};

// Initialize web push notifications listener
export const initializeWebPushNotifications = () => {
  if (Platform.OS === "web" && "serviceWorker" in navigator) {
    const messaging = getMessaging(firebaseApp);

    onMessage(messaging, (payload) => {
      const notificationTitle = payload.notification?.title || "New Message";
      const notificationOptions = {
        body: payload.notification?.body || "",
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        data: payload.data,
      };

      if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
      }
    });
  }
};
