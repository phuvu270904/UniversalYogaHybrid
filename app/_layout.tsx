import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </AuthProvider>
  );
}
