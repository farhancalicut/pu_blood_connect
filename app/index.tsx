import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to login after initial mount
    // Using setTimeout to ensure navigation system is ready
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#de0101ff" />
    </View>
  );
}
