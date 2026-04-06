import { Documento } from "@/@types/documento";
import { DocumentoCard } from "@/components/documentoCard";
import { getDocumentos } from "@/services/documentoService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


export default function MeusDocumentos() {
  const { data: documentos, isLoading, refetch } = useQuery<Documento[]>({
    queryKey: ['documentos'],
    queryFn: () => getDocumentos(),
  });

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator
          color="#FC6A03"
          size="large"
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={documentos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DocumentoCard documento={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>DOCUMENTOS DO MOTORISTA</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={52}
                color="#e0e0e0"
              />
              <Text style={styles.emptyTitle}>Nenhum documento cadastrado</Text>
              <Text style={styles.emptySubtitle}>
                Adicione seus documentos de motorista
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/documentos/novo" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>ADICIONAR DOCUMENTO</Text>
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
    backgroundColor: "#FC6A03",
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
