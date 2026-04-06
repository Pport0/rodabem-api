import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Header from '@/components/header';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/authContext';
import { ToastProviderWithViewport } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const token = SecureStore.getItem(process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token');
    const user = JSON.parse(SecureStore.getItem(process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user') || '{}');
    if (!token || !user?.nome) {
      router.push('/');
    } else {
      router.push('/(drawer)/home');
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ToastProviderWithViewport>
          <AuthProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: true, header: () => <Header /> }} />
                <Stack.Screen name="register" options={{ headerShown: true, header: () => <Header /> }} />
                <Stack.Screen name="forgotPassword" options={{ headerShown: true, header: () => <Header /> }} />
                <Stack.Screen name="caminhoes/novo" options={{ headerShown: true, header: () => <Header title="Novo Caminhão" /> }} />
                <Stack.Screen name="documentos/novo" options={{ headerShown: true, header: () => <Header title="Novo Documento" /> }} />
                <Stack.Screen name="perfil" options={{ headerShown: false }} />
                <Stack.Screen name="meusDocumentos" options={{ headerShown: true, header: () => <Header title="Meus Documentos" /> }} />
              </Stack>
            </ThemeProvider>
          </AuthProvider>
        </ToastProviderWithViewport>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
