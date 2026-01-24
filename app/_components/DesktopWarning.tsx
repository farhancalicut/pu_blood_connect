import React, { useEffect, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";

const DesktopWarning = () => {
  const [showWarning, setShowWarning] = useState(() => {
    if (Platform.OS !== "web") {
      console.log("[DesktopWarning] Not on web platform");
      return false;
    }
    const { width } = Dimensions.get("window");
    const shouldShow = width > 768;
    console.log(
      "[DesktopWarning] Initial width:",
      width,
      "shouldShow:",
      shouldShow,
    );
    return shouldShow;
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      console.log("[DesktopWarning] useEffect: Not on web platform");
      return;
    }

    console.log("[DesktopWarning] useEffect: Setting up resize listener");
    const checkScreenSize = ({ window }: { window: { width: number } }) => {
      const newShowWarning = window.width > 768;
      console.log(
        "[DesktopWarning] Resize detected - width:",
        window.width,
        "newShowWarning:",
        newShowWarning,
      );
      setShowWarning((prev) => {
        // Only update if the state actually changes
        if (prev !== newShowWarning) {
          console.log(
            "[DesktopWarning] State changing from",
            prev,
            "to",
            newShowWarning,
          );
          return newShowWarning;
        }
        return prev;
      });
    };

    // Listen for window resize
    const subscription = Dimensions.addEventListener("change", checkScreenSize);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Only show on web platform when screen is wide
  console.log(
    "[DesktopWarning] Render - Platform.OS:",
    Platform.OS,
    "showWarning:",
    showWarning,
  );
  if (Platform.OS !== "web" || !showWarning) {
    console.log("[DesktopWarning] Returning null");
    return null;
  }

  console.log("[DesktopWarning] Rendering warning overlay");
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>Mobile Only App</Text>
        <Text style={styles.message}>
          This application is designed for mobile devices.
        </Text>
        <Text style={styles.instruction}>
          Please resize your browser window to a mobile size to use this app.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1a1f36",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    maxWidth: 600,
    alignItems: "center",
    textAlign: "center",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    opacity: 0.9,
  },
  instruction: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
  },
});

export default DesktopWarning;
