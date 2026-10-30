import { QueryErrorState } from "@/components/queryErrorState";
import { getMeuPerfil } from "@/services/userService";
import { getAceiteLocal, getTermoVigente } from "@/services/termosService";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { AceiteTermoLocal } from "@/services/termosService";

function formatDate(value?: string) {
  if (!value) return "Não disponível";
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return new Date(value).toLocaleDateString("pt-BR");
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

export default function Termos() {
  const termoQuery = useQuery({ queryKey: ["termo-vigente"], queryFn: getTermoVigente });
  const perfilQuery = useQuery({ queryKey: ["perfil-termo"], queryFn: getMeuPerfil });
  const [aceiteLocal, setAceiteLocal] = useState<AceiteTermoLocal | null>(null);

  useEffect(() => {
    if (perfilQuery.data?.id !== undefined) {
      void getAceiteLocal(perfilQuery.data.id).then(setAceiteLocal);
    }
  }, [perfilQuery.data?.id]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Termo de Uso e Isenção de Responsabilidade</Text>
        {termoQuery.isLoading ? (
          <ActivityIndicator style={styles.loading} />
        ) : termoQuery.isError ? (
          <QueryErrorState message="Não foi possível carregar o termo vigente." onRetry={() => { void termoQuery.refetch(); }} />
        ) : termoQuery.data ? (
          <>
            <Text style={styles.meta}>Versão {termoQuery.data.versao}</Text>
            <Text style={styles.meta}>Publicado em {formatDate(termoQuery.data.publicadoEm)}</Text>
            <Text style={styles.acceptance}>
              {perfilQuery.isLoading
                ? "Verificando o registro do aceite..."
                : perfilQuery.data?.termoPendente === true
                  ? "O aceite desta versão está pendente."
                  : aceiteLocal?.versao === termoQuery.data.versao
                    ? `Aceite registrado neste dispositivo em ${formatDate(aceiteLocal.aceitoEm)}.`
                    : "A data do aceite não está disponível neste dispositivo."}
            </Text>
            {perfilQuery.isError && (
              <Text style={styles.meta}>Não foi possível consultar o status do aceite agora.</Text>
            )}
            <View style={styles.divider} />
            <Text style={styles.body}>{termoQuery.data.conteudo}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, backgroundColor: "#f5f5f5", flexGrow: 1 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 18, gap: 10 },
  title: { color: "#202124", fontSize: 20, fontWeight: "700" },
  meta: { color: "#6b7280", fontSize: 13 },
  acceptance: { color: "#374151", fontSize: 13, lineHeight: 19 },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
  body: { color: "#333", fontSize: 15, lineHeight: 23 },
  loading: { paddingVertical: 24 },
});
