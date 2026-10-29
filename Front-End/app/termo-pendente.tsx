import { QueryErrorState } from "@/components/queryErrorState";
import { useAuth } from "@/contexts/authContext";
import { aceitarTermo, getTermoVigente } from "@/services/termosService";
import { getMeuPerfil } from "@/services/userService";
import { queryClient, } from "@/utils/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return new Date(value).toLocaleDateString("pt-BR");
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

export default function TermoPendente() {
  const { logout } = useAuth();
  const termoQuery = useQuery({ queryKey: ["termo-vigente"], queryFn: getTermoVigente });
  const perfilQuery = useQuery({ queryKey: ["perfil-termo"], queryFn: getMeuPerfil });
  const aceiteMutation = useMutation({
    mutationFn: (versao: string) => aceitarTermo(versao, perfilQuery.data?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["perfil-termo"] });
      await queryClient.invalidateQueries({ queryKey: ["perfil"] });
      router.replace("/(drawer)/home");
    },
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Aceite necessário</Text>
      <Text style={styles.intro}>Para continuar usando o RodaBem, leia e aceite a versão vigente do termo.</Text>
      {termoQuery.isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : termoQuery.isError ? (
        <QueryErrorState message="Não foi possível carregar o termo vigente." onRetry={() => { void termoQuery.refetch(); }} />
      ) : termoQuery.data ? (
        <>
          <Text style={styles.meta}>Termo de Uso e Isenção de Responsabilidade · versão {termoQuery.data.versao}</Text>
          <Text style={styles.meta}>Publicado em {formatDate(termoQuery.data.publicadoEm)}</Text>
          <ScrollView style={styles.termScroll} contentContainerStyle={styles.termContent}>
            <Text style={styles.termText}>{termoQuery.data.conteudo}</Text>
          </ScrollView>
          {!!aceiteMutation.error && (
            <Text style={styles.errorText}>Não foi possível registrar o aceite. Verifique sua conexão e tente novamente.</Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.acceptButton, aceiteMutation.isPending && styles.disabledButton]}
            disabled={aceiteMutation.isPending}
            onPress={() => aceiteMutation.mutate(termoQuery.data.versao)}
          >
            {aceiteMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>ACEITAR E CONTINUAR</Text>}
          </TouchableOpacity>
        </>
      ) : null}
      <TouchableOpacity accessibilityRole="button" style={styles.logoutButton} onPress={() => { void logout(); }}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5", padding: 20, paddingTop: 30, gap: 12 },
  heading: { color: "#202124", fontSize: 25, fontWeight: "700" },
  intro: { color: "#4b5563", fontSize: 15, lineHeight: 21 },
  meta: { color: "#6b7280", fontSize: 13 },
  termScroll: { flex: 1, backgroundColor: "#fff", borderRadius: 16 },
  termContent: { padding: 18 },
  termText: { color: "#333", fontSize: 15, lineHeight: 23 },
  loading: { flex: 1 },
  acceptButton: { minHeight: 54, backgroundColor: "#248b61", borderRadius: 13, alignItems: "center", justifyContent: "center" },
  acceptText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },
  disabledButton: { opacity: 0.65 },
  logoutButton: { alignSelf: "center", padding: 12 },
  logoutText: { color: "#555", textDecorationLine: "underline", fontWeight: "600" },
  errorText: { color: "#b91c1c", fontSize: 13 },
});
