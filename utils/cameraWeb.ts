import * as ExpoCamera from "expo-camera";
import { Platform } from "react-native";

/**
 * Camera utilities with web fallback
 */

export const useCameraPermissions = () => {
  if (Platform.OS === "web") {
    // Web doesn't need expo-camera permissions
    return [
      {
        status: "granted",
        granted: true,
        canAskAgain: false,
        expires: "never",
      },
      async () => ({ status: "granted", granted: true }),
    ];
  }

  return ExpoCamera.useCameraPermissions();
};

export const CameraView =
  Platform.OS === "web"
    ? () => {
        return null; // Web camera not supported for now
      }
    : ExpoCamera.CameraView;

export const requestCameraPermissionsAsync = async () => {
  if (Platform.OS === "web") {
    return { status: "granted", granted: true };
  }

  return ExpoCamera.Camera.requestCameraPermissionsAsync();
};

export const getCameraPermissionsAsync = async () => {
  if (Platform.OS === "web") {
    return { status: "granted", granted: true };
  }

  return ExpoCamera.Camera.getCameraPermissionsAsync();
};
