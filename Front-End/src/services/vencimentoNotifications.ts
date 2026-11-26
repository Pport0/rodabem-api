import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const userKey = process.env.EXPO_PUBLIC_USER_KEY || "rodabem_user";
let syncQueue: Promise<void> = Promise.resolve();

async function getUserId(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(userKey);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as { id?: number | string };
    return user.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

function preferenceKey(userId: string) {
  return `rodabem_notificacoes_ativo_${userId}`;
}

function introKey(userId: string) {
  return `rodabem_notificacoes_intro_visto_${userId}`;
}

export async function getNotificationPreference(): Promise<boolean> {
  const id = await getUserId();
  if (!id) return false;
  return (await SecureStore.getItemAsync(preferenceKey(id))) === "true";
}

export async function hasNotificationPreference(): Promise<boolean> {
  const id = await getUserId();
  return id ? (await SecureStore.getItemAsync(preferenceKey(id))) !== null : false;
}

export async function setNotificationPreference(enabled: boolean): Promise<void> {
  const id = await getUserId();
  if (!id) return;
  await SecureStore.setItemAsync(preferenceKey(id), String(enabled));
  if (!enabled) await cancelExpiryNotifications();
}

export async function hasSeenNotificationIntro(): Promise<boolean> {
  const id = await getUserId();
  return id ? (await SecureStore.getItemAsync(introKey(id))) === "true" : true;
}

export async function markNotificationIntroSeen(): Promise<void> {
  const id = await getUserId();
  if (id) await SecureStore.setItemAsync(introKey(id), "true");
}

export async function getNotificationPermission() {
  if (Platform.OS === "web") return { granted: false, status: "undetermined" } as Notifications.NotificationPermissionsStatus;
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("documentos-vencimento", {
      name: "Vencimento de documentos",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function cancelAllNow(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function cancelExpiryNotifications(): Promise<void> {
  syncQueue = syncQueue.catch(() => undefined).then(cancelAllNow).catch(() => undefined);
  return syncQueue;
}

function dateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 9, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function syncExpiryNotifications(platform: string = Platform.OS): Promise<void> {
  syncQueue = syncQueue.catch(() => undefined).then(async () => {
    if (platform === "web") return;
    const userId = await getUserId();
    if (!userId || (await SecureStore.getItemAsync(preferenceKey(userId))) !== "true") {
      await cancelAllNow();
      return;
    }

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
      await cancelAllNow();
      return;
    }

    const { getDocumentos } = require("./documentoService") as typeof import("./documentoService");
    const { getMeuPerfil } = require("./userService") as typeof import("./userService");
    const [documentos, perfil] = await Promise.all([getDocumentos(), getMeuPerfil()]);
    const antecedencia = perfil?.diasAlertaVencimento ?? 30;
    await cancelAllNow();
    const now = Date.now();

    for (const documento of documentos) {
      const vencimento = dateOnly(documento.dataVencimento);
      if (!vencimento || vencimento.getTime() <= now) continue;

      const avisoAntecipado = new Date(vencimento);
      avisoAntecipado.setDate(avisoAntecipado.getDate() - antecedencia);
      if (avisoAntecipado.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Documento perto do vencimento",
            body: `${documento.nome} vence em ${antecedencia} dias.`,
            data: { path: "/meusDocumentos", documentoId: documento.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: avisoAntecipado },
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Documento vence hoje",
          body: `${documento.nome} vence hoje.`,
          data: { path: "/meusDocumentos", documentoId: documento.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: vencimento },
      });
    }
  }).catch(() => undefined);
  return syncQueue;
}
