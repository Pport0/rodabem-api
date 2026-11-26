import ScaledText from '@/components/scaledText';
import colors from "@/constants/colors";
import { Documento } from "@/@types/documento";
import { DocumentoCard } from "@/components/documentoCard";
import { QueryErrorState } from "@/components/queryErrorState";
import { deleteDocumento, getDocumentos } from "@/services/documentoService";
import { syncExpiryNotifications } from "@/services/vencimentoNotifications";
import { queryClient } from "@/utils/queryClient";
import { Toast } from "@/shared/ui/molecules/Toast";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";


export default function MeusDocumentos() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const { data: documentos, isLoading, isError, refetch } = useQuery<Documento[]>({
    queryKey: ['documentos'],
    queryFn: () => getDocumentos(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumento,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documentos"] });
      await syncExpiryNotifications();
      Toast.show("Documento excluído.", { type: "success", backgroundColor: "#10B981" });
    },
    onError: () => Toast.show("Não foi possível excluir o documento.", { type: "error", backgroundColor: "#E53E3E" }),
  });

  const confirmDelete = (item: Documento) => Alert.alert(
    "Excluir documento",
    `Deseja excluir ${item.nome}? Os avisos de vencimento também serão removidos.`,
    [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => item.id && deleteMutation.mutate(item.id) }],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator
          color={primaryColor}
          size="large"
          style={{ marginTop: 60 }}
        />
      ) : isError ? (
        <QueryErrorState
          message="Não foi possível carregar seus documentos."
          onRetry={() => { void refetch(); }}
        />
      ) : (
        <FlatList
          data={documentos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DocumentoCard documento={item} onEdit={() => router.push({ pathname: "/documentos/editar", params: { id: String(item.id), nome: item.nome, numero: item.numero, dataEmissao: item.dataEmissao, dataVencimento: item.dataVencimento, observacao: item.observacao ?? "" } } as any)} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <ScaledText style={styles.sectionTitle}>DOCUMENTOS DO MOTORISTA</ScaledText>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={52}
                color="#e0e0e0"
              />
              <ScaledText style={styles.emptyTitle}>Nenhum documento cadastrado</ScaledText>
              <ScaledText style={styles.emptySubtitle}>
                Adicione seus documentos de motorista
              </ScaledText>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: primaryColor }]}
          onPress={() => router.push("/documentos/novo" as any)}
          activeOpacity={0.85}
        >
          <ScaledText style={styles.addBtnText}>ADICIONAR DOCUMENTO</ScaledText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContent: {
    padding: 20,
    paddingBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
  },
  footer: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#f5f5f5",
  },
  addBtn: {
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
