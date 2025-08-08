// app/(tabs)/_layout.tsx
import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,    // ← disable all default headers here
      }}
    >
      {/* List out your tab screens */}
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="otherTab1" />
      <Stack.Screen name="otherTab2" />
      {/* etc. */}
    </Stack>
  );
}
