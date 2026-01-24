import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  type?: "error" | "warning" | "info";
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  type = "error",
}) => {
  const getIconName = () => {
    switch (type) {
      case "warning":
        return "warning";
      case "info":
        return "information-circle";
      default:
        return "alert-circle";
    }
  };

  const getColor = () => {
    switch (type) {
      case "warning":
        return "#FFA500";
      case "info":
        return "#007AFF";
      default:
        return "#FF3B30";
    }
  };

  return (
    <View style={[styles.container, { borderColor: getColor() }]}>
      <Ionicons name={getIconName()} size={24} color={getColor()} />
      <Text style={[styles.message, { color: getColor() }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: getColor() }]}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    margin: 16,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  retryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ErrorMessage;
