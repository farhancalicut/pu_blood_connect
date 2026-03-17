import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Platform,
  Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * InstallPWA - Shows install prompt for Progressive Web App
 * Only visible on web when app is not yet installed
 */
export default function InstallPWA() {
  const [showInstall, setShowInstall] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Check if already installed
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (isInstalled) return;

    // Show install option immediately for browsers that don't fire the event
    const timer = setTimeout(() => {
      if (!deferredPrompt) {
        setShowInstall(true); // Show manual instructions
      }
    }, 3000); // Show after 3 seconds if no prompt

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
      clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Handle successful installation
    const handleAppInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstructions(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }

    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    setShowInstructions(false);
  };

  if (Platform.OS !== "web" || !showInstall) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconFallback}>+</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Install PU NSS Connect</Text>
          <Text style={styles.subtitle}>
            Add to home screen for quick access
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={handleInstallClick}
            style={styles.installButton}
          >
            <Text style={styles.installButtonText}>Install</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissButtonText}>X</Text>
          </TouchableOpacity>
        </View>
      </View>
      {showInstructions ? (
        <Pressable style={styles.instructionsOverlay} onPress={() => setShowInstructions(false)}>
          <Pressable style={styles.instructionsCard} onPress={() => {}}>
            <View style={styles.instructionsHeader}>
              <Text style={styles.instructionsTitle}>Install this app</Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.instructionsCloseButton}>
                <Text style={styles.dismissButtonText}>X</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.instructionsText}>
              On iPhone or iPad Safari, tap Share and choose Add to Home Screen.
            </Text>
            <Text style={styles.instructionsText}>
              On Chrome or Edge, open the browser menu and choose Install app or Add to Home screen.
            </Text>
            <Text style={styles.instructionsText}>
              On Firefox, open the browser menu and choose Install.
            </Text>
            <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.instructionsAction}>
              <Text style={styles.instructionsActionText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
  },
  banner: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconFallback: {
    color: "#EF4444",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  installButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  installButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  dismissButton: {
    padding: 8,
  },
  dismissButtonText: {
    color: "#666",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
  instructionsOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
    padding: 16,
  },
  instructionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  instructionsCloseButton: {
    padding: 6,
  },
  instructionsText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 12,
  },
  instructionsAction: {
    alignSelf: "flex-end",
    backgroundColor: "#EF4444",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  instructionsActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
