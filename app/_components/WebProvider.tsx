import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

/**
 * WebProvider - Handles web-specific initialization
 * Wraps the app to provide PWA functionality
 */
export default function WebProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (Platform.OS === "web") {
      // Initialize web push notifications (lazy load to avoid breaking)
      try {
        import("../../utils/notificationsWeb")
          .then((module) => {
            module.initializeWebPushNotifications();
          })
          .catch((err) => {
            console.log("Web notifications not available:", err);
          });
      } catch (error) {
        console.log("Web push notifications initialization skipped");
      }

      // Handle PWA install prompt
      let deferredPrompt: any;

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show custom install button or banner
        console.log("PWA install prompt available");
      });

      // Handle successful installation
      window.addEventListener("appinstalled", () => {
        console.log("PWA installed successfully");
        deferredPrompt = null;
      });

      // Check if app is running in standalone mode
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      if (isStandalone) {
        console.log("Running as installed PWA");
      }

      // Handle online/offline events
      const handleOnline = () => {
        console.log("App is back online");
        // You can show a toast or update UI here
      };

      const handleOffline = () => {
        console.log("App is offline");
        // You can show a toast or update UI here
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Handle service worker updates
      if ("serviceWorker" in navigator) {
        // Check for updates periodically
        setInterval(() => {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) {
              reg.update(); // Check for service worker updates
            }
          });
        }, 60000); // Check every minute

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("Service worker updated - reloading page");
          // Reload page when service worker updates to prevent stale content
          window.location.reload();
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "UPDATE_AVAILABLE") {
            console.log("New version available");
            // Optionally show "New version available" message
          }
        });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
