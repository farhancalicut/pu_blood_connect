import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

/**
 * WebProvider - Handles web-specific initialization
 * Wraps the app to provide PWA functionality
 * Note: No font loading needed - using Lucide SVG icons
 */
export default function WebProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (Platform.OS === "web") {
      // Add PWA meta tags for proper app-like experience
      const addMetaTag = (name: string, content: string, property?: string) => {
        const existingTag = property 
          ? document.querySelector(`meta[property="${property}"]`)
          : document.querySelector(`meta[name="${name}"]`);
        
        if (!existingTag) {
          const meta = document.createElement("meta");
          if (property) {
            meta.setAttribute("property", property);
          } else {
            meta.setAttribute("name", name);
          }
          meta.setAttribute("content", content);
          document.head.appendChild(meta);
        }
      };

      // PWA meta tags
      addMetaTag("mobile-web-app-capable", "yes");
      addMetaTag("apple-mobile-web-app-capable", "yes");
      addMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent");
      addMetaTag("apple-mobile-web-app-title", "PU NSS Connect");
      addMetaTag("theme-color", "#EF4444");
      addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no");

      // Add apple-touch-icon
      const appleIconLink = document.createElement("link");
      appleIconLink.rel = "apple-touch-icon";
      appleIconLink.href = "/apple-touch-icon.png";
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        document.head.appendChild(appleIconLink);
      }

      // Ensure manifest is linked
      const manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "/manifest.json";
      if (!document.querySelector('link[rel="manifest"]')) {
        document.head.appendChild(manifestLink);
      }

      // Inject CSS to prevent overscroll and rubber-band effect
      const style = document.createElement("style");
      style.textContent = `
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: fixed;
          background-color: #f0f0f0;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }
        body {
          overscroll-behavior-y: none;
          overscroll-behavior-x: none;
          touch-action: pan-y;
        }
        #root {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
        * {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        input, textarea {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `;
      document.head.appendChild(style);

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
