import * as ExpoImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/**
 * Image Picker utilities with web support
 */

export const requestMediaLibraryPermissionsAsync = async () => {
  if (Platform.OS === "web") {
    // Web doesn't need permissions for file input
    return { status: "granted", granted: true };
  }

  return ExpoImagePicker.requestMediaLibraryPermissionsAsync();
};

export const launchImageLibraryAsync = async (options?: any) => {
  if (Platform.OS === "web") {
    // Use web file input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              canceled: false,
              assets: [
                {
                  uri: event.target?.result as string,
                  width: 0,
                  height: 0,
                  type: "image",
                  fileName: file.name,
                  fileSize: file.size,
                },
              ],
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve({ canceled: true });
        }
      };
      input.click();
    });
  }

  return ExpoImagePicker.launchImageLibraryAsync(options);
};

export const launchCameraAsync = async (options?: any) => {
  if (Platform.OS === "web") {
    // Use web camera input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              canceled: false,
              assets: [
                {
                  uri: event.target?.result as string,
                  width: 0,
                  height: 0,
                  type: "image",
                  fileName: file.name,
                  fileSize: file.size,
                },
              ],
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve({ canceled: true });
        }
      };
      input.click();
    });
  }

  return ExpoImagePicker.launchCameraAsync(options);
};
