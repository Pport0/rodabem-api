import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Header from '@/components/header';
import { AppState, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '@/contexts/authContext';
import { ToastProviderWithViewport } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { getMeuPerfil } from '@/services/userService';
import { syncExpiryNotifications } from '@/services/vencimentoNotifications';
import { FontSizeProvider } from '@/contexts/fontSizeContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
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
    void syncExpiryNotifications();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncExpiryNotifications();
    });
    const openDocuments = (response: Notifications.NotificationResponse) => {
      const path = response.notification.request.content.data?.path;
      if (path === '/meusDocumentos') router.push('/meusDocumentos' as any);
    };
    const responseSub = Notifications.addNotificationResponseReceivedListener(openDocuments);
    return () => {
      appState.remove();
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    const verificarSessao = async () => {
      const token = await SecureStore.getItemAsync(process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token');
      const user = JSON.parse(await SecureStore.getItemAsync(process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user') || '{}');
      if (!ativo) return;
      if (!token || !user?.nome) {
        router.replace('/');
        return;
      }
      try {
        const perfil = await getMeuPerfil();
        if (ativo) {
          router.replace(perfil?.termoPendente ? '/termo-pendente' : '/(drawer)/home');
          try {
            const response = await Notifications.getLastNotificationResponseAsync();
            if (ativo && response?.notification.request.content.data?.path === '/meusDocumentos') {
              router.push('/meusDocumentos' as any);
              await Notifications.clearLastNotificationResponseAsync();
            }
          } catch {
            // O erro ao consultar o toque não deve interromper a navegação normal.
          }
        }
      } catch {
        if (ativo) router.replace('/login');
      }
    };
    void verificarSessao();
    return () => { ativo = false; };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ToastProviderWithViewport>
          <FontSizeProvider>
            <AuthProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: true, header: () => <Header /> }} />
                <Stack.Screen name="register" options={{ headerShown: true, header: () => <Header /> }} />
                <Stack.Screen name="termos" options={{ headerShown: true, header: () => <Header title="Termos de uso" /> }} />
                <Stack.Screen name="termo-pendente" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="forgotPassword" options={{ headerShown: true, header: () => <Header /> }} />
                <Stack.Screen name="reset-password" options={{ headerShown: true, header: () => <Header title="Redefinir Senha" /> }} />
                <Stack.Screen name="alterarSenha" options={{ headerShown: true, header: () => <Header title="Alterar Senha" /> }} />
                <Stack.Screen name="editarPerfil" options={{ headerShown: true, header: () => <Header title="Editar Perfil" /> }} />
                <Stack.Screen name="caminhoes/novo" options={{ headerShown: true, header: () => <Header title="Novo Caminhão" /> }} />
                <Stack.Screen name="documentos/novo" options={{ headerShown: true, header: () => <Header title="Novo Documento" /> }} />
                <Stack.Screen name="abastecimentos/index" options={{ headerShown: true, header: () => <Header title="Abastecimentos" /> }} />
                <Stack.Screen name="abastecimentos/novo" options={{ headerShown: true, header: () => <Header title="Novo Abastecimento" /> }} />
                <Stack.Screen name="financeiro" options={{ headerShown: true, header: () => <Header title="Financeiro" /> }} />
                <Stack.Screen name="lancamentos/novo" options={{ headerShown: true, header: () => <Header title="Lançamento" /> }} />
                <Stack.Screen name="frete" options={{ headerShown: true, header: () => <Header title="Calculadora de Frete" /> }} />
                <Stack.Screen name="perfil" options={{ headerShown: false }} />
                <Stack.Screen name="meusDocumentos" options={{ headerShown: true, header: () => <Header title="Meus Documentos" /> }} />
                </Stack>
              </ThemeProvider>
            </AuthProvider>
          </FontSizeProvider>
        </ToastProviderWithViewport>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
