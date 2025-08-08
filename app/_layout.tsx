import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* Login screen */}
      <Stack.Screen
        name="login"
        options={{
          headerShown: false, // set to true if you want RN header here
        }}
      />

      {/* Register screen */}
      <Stack.Screen
        name="register"
        options={{
          headerShown: false, // set to true if you want RN header here
        }}
      />

      {/* Main dashboard and other app tabs */}
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false, // ✅ disable RN header — show your custom header inside screens
        }}
      />
    </Stack>
  );
}
