import ScaledText from '@/components/scaledText';
import colors from "@/constants/colors";
import { User } from "@/@types/user";
import { Caminhao } from "@/@types/caminhao";
import { useAuth } from "@/contexts/authContext";
import { useUser } from "@/hooks/useUser";
import { getMeuCaminhao } from "@/services/caminhaoService";
import { getMeuPerfil, deleteUser } from "@/services/userService";
import { updateDiasAlertaVencimento } from "@/services/userService";
import { getNotificationPermission, getNotificationPreference, requestNotificationPermission, setNotificationPreference, syncExpiryNotifications } from "@/services/vencimentoNotifications";
import { getInitials } from "@/shared/ui/base/avatar/initials";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { InfoRow } from "@/components/infoRow";
import { PlacaBadge } from "@/components/placaBadge";
import { QueryErrorState } from "@/components/queryErrorState";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === "string") return message;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}

export default function Perfil() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;

  const { user } = useUser();
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getNotificationPreference(), getNotificationPermission()]).then(([enabled, permission]) => {
      if (!active || !permission) return;
      setNotificationsEnabled(enabled && permission.granted);
      setPermissionDenied(!permission.granted && permission.status !== "undetermined");
    });
    return () => { active = false; };
  }, []);

  const perfilQuery = useQuery<User | null>({
    queryKey: ["perfil"],
    queryFn: () => getMeuPerfil(),
  });

  const caminhaoQuery = useQuery<Caminhao | null>({
    queryKey: ["caminhao"],
    queryFn: () => getMeuCaminhao(),
  });
  const perfil = perfilQuery.data;
  const caminhao = caminhaoQuery.data;

  const daysMutation = useMutation({
    mutationFn: (days: 7 | 15 | 30 | 60) => {
      if (!(perfil?.id ?? user?.id)) throw new Error("ID do usuário não encontrado.");
      return updateDiasAlertaVencimento(days);
    },
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["perfil"], updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["documentos"] });
      await queryClient.invalidateQueries({ queryKey: ["documentos", "alertas"] });
      await syncExpiryNotifications();
      Toast.show("Antecedência dos alertas atualizada.", { type: "success", backgroundColor: "#10B981" });
    },
    onError: (error) => Toast.show(getErrorMessage(error), { type: "error", backgroundColor: "#E53E3E" }),
  });

  const toggleNotifications = async (enabled: boolean) => {
    try {
      if (!enabled) {
        await setNotificationPreference(false);
        setNotificationsEnabled(false);
        return;
      }
      const granted = await requestNotificationPermission();
      setPermissionDenied(!granted);
      if (!granted) {
        setNotificationsEnabled(false);
        Toast.show("Permita notificações nas configurações do aparelho para ativar os avisos.", { type: "warning", backgroundColor: "#D97706" });
        return;
      }
      await setNotificationPreference(true);
      setNotificationsEnabled(true);
      await syncExpiryNotifications();
    } catch {
      Toast.show("Não foi possível atualizar as notificações.", { type: "error", backgroundColor: "#E53E3E" });
    }
  };

  // ── Mutation: excluir conta ──────────────────────────
  const deleteUserMutation = useMutation({
    mutationFn: () => {
      const userId = perfil?.id ?? user?.id;
      if (!userId) throw new Error("ID do usuário não encontrado.");
      return deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.clear();
      Toast.show("Conta excluída com sucesso.", {
        type: "success",
        backgroundColor: "#10B981",
      });
      logout();
    },
    onError: (error: unknown) => {
      Toast.show(getErrorMessage(error), {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir conta",
      "Tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteUserMutation.mutate(),
        },
      ]
    );
  };

  const perfilExibido = perfil ?? user;
  const initials = getInitials(perfilExibido?.nome);

  return (
    <View style={styles.wrapper}>
      <SafeAreaView
        style={[styles.headerSafe, { backgroundColor: primaryColor }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <ScaledText style={styles.headerTitle}>PERFIL</ScaledText>
          <View style={{ width: 30 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: primaryColor }]}>
            <ScaledText style={styles.avatarInitials}>{initials}</ScaledText>
          </View>
          <ScaledText style={styles.userName}>{perfilExibido?.nome ?? "Usuário"}</ScaledText>
          <ScaledText style={[styles.userRole, { color: primaryColor }]}>
            MOTORISTA
          </ScaledText>
        </View>

        {/* Dados pessoais */}
        <View style={styles.card}>
          <ScaledText style={styles.cardSectionTitle}>MEUS DADOS</ScaledText>
          {perfilQuery.isError && (
            <QueryErrorState
              compact
              message="Não foi possível atualizar os dados do perfil."
              onRetry={() => { void perfilQuery.refetch(); }}
            />
          )}
          <InfoRow label="Nome" value={perfilExibido?.nome} />
          <View style={styles.separator} />
          <InfoRow label="CPF" value={perfilExibido?.cpf} />
          <View style={styles.separator} />
          <InfoRow label="Telefone" value={perfilExibido?.telefone} />
          <View style={styles.separator} />
          <InfoRow label="E-mail" value={perfilExibido?.email} />
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.editTruckLink}
            onPress={() => router.push("/editarPerfil" as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={primaryColor} />
            <ScaledText style={[styles.editTruckLinkText, { color: primaryColor }]}>
              Editar dados
            </ScaledText>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <ScaledText style={styles.cardSectionTitle}>ALERTAS DE VENCIMENTO</ScaledText>
          <ScaledText style={styles.preferenceLabel}>Avisar sobre vencimentos com</ScaledText>
          <View style={styles.daysOptions}>
            {([7, 15, 30, 60] as const).map((days) => {
              const selected = (perfil?.diasAlertaVencimento ?? 30) === days;
              return (
                <TouchableOpacity
                  key={days}
                  disabled={daysMutation.isPending}
                  onPress={() => { if (!selected) daysMutation.mutate(days); }}
                  style={[styles.dayOption, selected && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                >
                  <ScaledText style={[styles.dayOptionText, selected && styles.dayOptionTextSelected]}>{days} dias</ScaledText>
                </TouchableOpacity>
              );
            })}
          </View>
          {daysMutation.isPending && <ActivityIndicator color={primaryColor} style={{ marginTop: 10 }} />}
          <View style={styles.separator} />
          <View style={styles.notificationRow}>
            <View style={styles.notificationCopy}>
              <ScaledText style={styles.preferenceLabel}>Notificações no aparelho</ScaledText>
              <ScaledText style={styles.notificationHint}>Receba avisos mesmo com o aplicativo fechado.</ScaledText>
            </View>
            <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ true: primaryColor }} />
          </View>
          {permissionDenied && (
            <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsLink}>
              <ScaledText style={[styles.editTruckLinkText, { color: primaryColor }]}>Como ativar: abrir configurações do aparelho</ScaledText>
            </TouchableOpacity>
          )}
        </View>

        {/* Caminhão */}
        <View style={styles.card}>
          <ScaledText style={styles.cardSectionTitle}>MEU CAMINHÃO</ScaledText>
          {caminhaoQuery.isLoading ? (
            <ActivityIndicator
              color={primaryColor}
              style={{ paddingVertical: 20 }}
            />
          ) : caminhaoQuery.isError ? (
            <QueryErrorState
              compact
              message="Não foi possível carregar os dados do caminhão."
              onRetry={() => { void caminhaoQuery.refetch(); }}
            />
          ) : caminhao ? (
            <>
              <View style={styles.infoRow}>
                <ScaledText style={styles.infoLabel}>Placa</ScaledText>
                <PlacaBadge placa={caminhao.placa} />
              </View>
              <View style={styles.separator} />
              <InfoRow label="Modelo" value={caminhao.modelo} />
              {caminhao.marca && (
                <>
                  <View style={styles.separator} />
                  <InfoRow label="Marca" value={caminhao.marca} />
                </>
              )}
              {caminhao.anoFabricacao && (
                <>
                  <View style={styles.separator} />
                  <InfoRow label="Ano" value={String(caminhao.anoFabricacao)} />
                </>
              )}
              {caminhao.cor && (
                <>
                  <View style={styles.separator} />
                  <InfoRow label="Cor" value={caminhao.cor} />
                </>
              )}
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.editTruckLink}
                onPress={() => router.push("/caminhoes/editar" as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={primaryColor} />
                <ScaledText style={[styles.editTruckLinkText, { color: primaryColor }]}>
                  Editar caminhão
                </ScaledText>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyTruck}>
              <Ionicons name="bus-outline" size={40} color="#e0e0e0" />
              <ScaledText style={styles.emptyTruckText}>
                Nenhum caminhão cadastrado
              </ScaledText>
              <TouchableOpacity
                style={[styles.addTruckBtn, { backgroundColor: primaryColor }]}
                onPress={() => router.push("/caminhoes/novo" as any)}
                activeOpacity={0.85}
              >
                <ScaledText style={styles.addTruckBtnText}>Cadastrar Caminhão</ScaledText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Alterar senha */}
        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: primaryColor }]}
          onPress={() => router.push("/alterarSenha" as any)}
          activeOpacity={0.85}
        >
          <ScaledText style={[styles.outlineButtonText, { color: primaryColor }]}>
            ALTERAR SENHA
          </ScaledText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: primaryColor }]}
          onPress={() => router.push("/termos")}
          activeOpacity={0.85}
        >
          <ScaledText style={[styles.outlineButtonText, { color: primaryColor }]}>TERMOS DE USO</ScaledText>
        </TouchableOpacity>

        {/* ── Zona de perigo ── */}
        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <Ionicons name="warning-outline" size={15} color="#E53E3E" />
            <ScaledText style={styles.dangerSectionLabel}>ZONA DE PERIGO</ScaledText>
          </View>
          <TouchableOpacity
            style={[
              styles.dangerButton,
              deleteUserMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={deleteUserMutation.isPending}
            activeOpacity={0.85}
          >
            {deleteUserMutation.isPending ? (
              <ActivityIndicator color="#E53E3E" />
            ) : (
              <ScaledText style={styles.dangerButtonText}>EXCLUIR MINHA CONTA</ScaledText>
            )}
          </TouchableOpacity>
          <ScaledText style={styles.dangerHint}>
            A conta só pode ser excluída se não houver caminhão, documentos,
            abastecimentos ou simulações de frete cadastrados.
          </ScaledText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerSafe: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 4,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 1.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 52,
    gap: 20,
  },
  avatarSection: {
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
  },
  userRole: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#aaa",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  preferenceLabel: { fontSize: 14, color: "#333", fontWeight: "600" },
  daysOptions: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 16 },
  dayOption: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", paddingVertical: 10, alignItems: "center" },
  dayOptionText: { fontSize: 12, fontWeight: "600", color: "#555" },
  dayOptionTextSelected: { color: "#fff" },
  notificationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 14 },
  notificationCopy: { flex: 1, paddingRight: 12 },
  notificationHint: { fontSize: 12, lineHeight: 17, color: "#888", marginTop: 4 },
  settingsLink: { alignSelf: "flex-start", marginTop: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: "#888",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#222",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "#f5f5f5",
  },
  editTruckLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    justifyContent: "flex-end",
  },
  editTruckLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyTruck: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyTruckText: {
    fontSize: 14,
    color: "#aaa",
  },
  addTruckBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  addTruckBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  outlineButtonText: {
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  // ── Zona de perigo ──────────────────────────────────
  dangerSection: {
    gap: 12,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dangerSectionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#E53E3E",
    letterSpacing: 1,
  },
  dangerButton: {
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E53E3E",
    backgroundColor: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerButtonText: {
    color: "#E53E3E",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  dangerHint: {
    fontSize: 12,
    color: "#bbb",
    textAlign: "center",
    lineHeight: 17,
  },
});
