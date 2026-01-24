import * as ExpoSharing from "expo-sharing";
import { Platform } from "react-native";

/**
 * Sharing utilities with web support
 */

export const isAvailableAsync = async () => {
  if (Platform.OS === "web") {
    return "share" in navigator;
  }

  return ExpoSharing.isAvailableAsync();
};

export const shareAsync = async (url: string, options?: any) => {
  if (Platform.OS === "web") {
    // Use Web Share API
    if ("share" in navigator) {
      try {
        // For web, we need to fetch the file first
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], options?.dialogTitle || "share.png", {
          type: blob.type,
        });

        await navigator.share({
          title: options?.dialogTitle,
          files: [file],
        });
      } catch (error) {
        console.error("Error sharing:", error);
        // Fallback: open in new tab
        window.open(url, "_blank");
      }
    } else {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
    return;
  }

  return ExpoSharing.shareAsync(url, options);
};
