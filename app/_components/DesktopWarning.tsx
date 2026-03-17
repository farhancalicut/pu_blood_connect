import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const DesktopWarning = () => {
  // Only show on web AND if viewport is truly desktop-sized
  if (Platform.OS !== "web") {
    return null;
  }

  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const shouldShow = width > 768 && !isMobile;
      
      console.log("[DesktopWarning] Width:", width, "isMobile:", isMobile, "shouldShow:", shouldShow);
      setShowWarning(shouldShow);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (!showWarning) {
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
          Please resize your browser window to a mobile size or open on a mobile device.
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
