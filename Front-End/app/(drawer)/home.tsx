import ScaledText from '@/components/scaledText';
import colors from "@/constants/colors";
import { ActionCard } from "@/components/actionCard";
import { AlertaVencimento } from "@/components/alertaVencimento";
import { useUser } from "@/hooks/useUser";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { getNotificationPermission, getNotificationPreference, hasNotificationPreference, hasSeenNotificationIntro, markNotificationIntroSeen, requestNotificationPermission, setNotificationPreference, syncExpiryNotifications } from "@/services/vencimentoNotifications";

export default function Home() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const { user } = useUser();
  const firstName = user?.nome?.split(" ")[0] || "Motorista";
  const [showNotificationIntro, setShowNotificationIntro] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([hasSeenNotificationIntro(), getNotificationPermission(), hasNotificationPreference(), getNotificationPreference()]).then(async ([seen, permission, hasPreference, enabled]) => {
      if (!active || !permission) return;
      if (permission.granted) {
        if (!hasPreference) await setNotificationPreference(true);
        if (enabled || !hasPreference) void syncExpiryNotifications();
        return;
      }
      if (!seen && permission.status === "undetermined") setShowNotificationIntro(true);
    });
    return () => { active = false; };
  }, []);

  const chooseNotificationPermission = async (accept: boolean) => {
    setShowNotificationIntro(false);
    try {
      await markNotificationIntroSeen();
      if (!accept) {
        await setNotificationPreference(false);
        return;
      }
      const granted = await requestNotificationPermission();
      await setNotificationPreference(granted);
      if (granted) await syncExpiryNotifications();
    } catch {
      await setNotificationPreference(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Modal visible={showNotificationIntro} transparent animationType="fade" onRequestClose={() => chooseNotificationPermission(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScaledText style={styles.modalTitle}>Avisos de vencimento</ScaledText>
            <ScaledText style={styles.modalText}>O RodaBem pode avisar quando seus documentos estiverem perto do vencimento e no dia do vencimento, mesmo com o aplicativo fechado. Você poderá alterar essa opção no perfil.</ScaledText>
            <TouchableOpacity style={[styles.modalPrimary, { backgroundColor: primaryColor }]} onPress={() => chooseNotificationPermission(true)}>
              <ScaledText style={styles.modalPrimaryText}>Continuar</ScaledText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondary} onPress={() => chooseNotificationPermission(false)}>
              <ScaledText style={styles.modalSecondaryText}>Agora não</ScaledText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AlertaVencimento />

      <View style={styles.greetingSection}>
        <ScaledText style={styles.greeting}>Olá, {firstName}!</ScaledText>
        <ScaledText style={styles.subGreeting}>O que você precisa hoje?</ScaledText>
      </View>

      <View style={styles.cardsSection}>
        <ActionCard
          title="MEU CAMINHÃO"
          subtitle="Acesse os dados do seu veículo"
          iconName="bus-outline"
          backgroundColor={primaryColor}
          onPress={() => router.push("/perfil" as any)}
        />
        <ActionCard
          title="MEUS DOCUMENTOS"
          subtitle="Acesse CRLV, CNH e outros"
          iconName="document-text-outline"
          backgroundColor="#2D3748"
          onPress={() => router.push("/meusDocumentos" as any)}
        />
        <ActionCard
          title="ABASTECIMENTOS"
          subtitle="Registre abastecimentos e acompanhe a media"
          iconName="water-outline"
          backgroundColor="#D97706"
          onPress={() => router.push("/abastecimentos" as any)}
        />
        <ActionCard
          title="FINANCEIRO"
          subtitle="Acompanhe receitas, despesas e saldo"
          iconName="wallet-outline"
          backgroundColor="#0F766E"
          onPress={() => router.push("/financeiro" as any)}
        />
        <ActionCard
          title="CALCULADORA DE FRETE"
          subtitle="Simule custos, ANTT e retorno estimado"
          iconName="trail-sign-outline"
          backgroundColor="#166534"
          onPress={() => router.push("/frete" as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 28,
  },
  greetingSection: {
    gap: 4,
    marginTop: 8,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111",
  },
  subGreeting: {
    fontSize: 14,
    color: "#888",
  },
  cardsSection: {
    gap: 16,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 22, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  modalText: { color: "#555", lineHeight: 21, fontSize: 14 },
  modalPrimary: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  modalPrimaryText: { color: "#fff", fontWeight: "700" },
  modalSecondary: { alignItems: "center", paddingVertical: 8 },
  modalSecondaryText: { color: "#666", fontWeight: "600" },
});
