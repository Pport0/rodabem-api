import { Abastecimento } from "@/@types/abastecimento";
import colors from "@/constants/colors";
import {
  deleteAbastecimento,
  getAbastecimentos,
  getMediaConsumo,
} from "@/services/abastecimentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function fuelLabel(value: Abastecimento["tipoCombustivel"]) {
  switch (value) {
    case "DIESEL_S10":
      return "Diesel S10";
    case "DIESEL_S500":
      return "Diesel S500";
    case "ARLA_32":
      return "Arla 32";
    default:
      return value;
  }
}

export default function AbastecimentosScreen() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;

  const abastecimentosQuery = useQuery({
    queryKey: ["abastecimentos"],
    queryFn: getAbastecimentos,
  });

  const mediaQuery = useQuery({
    queryKey: ["media-consumo"],
    queryFn: getMediaConsumo,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAbastecimento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
      queryClient.invalidateQueries({ queryKey: ["media-consumo"] });
      Toast.show("Abastecimento removido com sucesso.", {
        type: "success",
        backgroundColor: "#10B981",
      });
    },
    onError: () => {
      Toast.show("Nao foi possivel excluir o abastecimento.", {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const handleDelete = (item: Abastecimento) => {
    Alert.alert(
      "Excluir abastecimento",
      `Deseja remover o registro de ${formatDate(item.dataAbastecimento)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]
    );
  };

  const isRefreshing = abastecimentosQuery.isRefetching || mediaQuery.isRefetching;

  return (
    <View style={styles.container}>
      <FlatList
        data={abastecimentosQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              abastecimentosQuery.refetch();
              mediaQuery.refetch();
            }}
            tintColor={primaryColor}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={[styles.heroCard, { backgroundColor: primaryColor }]}>
              <View style={styles.heroText}>
                <Text style={styles.heroEyebrow}>MEDIA DE CONSUMO</Text>
                <Text style={styles.heroValue}>
                  {mediaQuery.data?.mediaConsumo
                    ? `${mediaQuery.data.mediaConsumo.toFixed(2)} ${mediaQuery.data.unidade}`
                    : "--"}
                </Text>
                <Text style={styles.heroDescription}>
                  {mediaQuery.data?.mensagem ?? "Acompanhe sua eficiencia por abastecimento."}
                </Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="speedometer-outline" size={30} color="#fff" />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>HISTORICO DE ABASTECIMENTOS</Text>
              <Text style={styles.sectionSubtitle}>
                {mediaQuery.data?.totalAbastecimentos ?? 0} registros encontrados
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          abastecimentosQuery.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Carregando abastecimentos...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={50} color="#d8d8d8" />
              <Text style={styles.emptyTitle}>Nenhum abastecimento cadastrado</Text>
              <Text style={styles.emptySubtitle}>
                Registre seus abastecimentos para acompanhar consumo e custos.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardTitle}>{fuelLabel(item.tipoCombustivel)}</Text>
                <Text style={styles.cardDate}>{formatDate(item.dataAbastecimento)}</Text>
              </View>
              <Text style={[styles.cardValue, { color: primaryColor }]}>
                {formatCurrency(item.valorTotal)}
              </Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Km</Text>
                <Text style={styles.infoText}>{item.quilometragem.toLocaleString("pt-BR")}</Text>
              </View>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Litros</Text>
                <Text style={styles.infoText}>{item.totalLitros.toFixed(2)} L</Text>
              </View>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Preco/L</Text>
                <Text style={styles.infoText}>{formatCurrency(item.precoPorLitro)}</Text>
              </View>
            </View>

            {!!item.postoIdentificado && (
              <Text style={styles.metaText}>Posto: {item.postoIdentificado}</Text>
            )}
            {!!item.localDescricao && <Text style={styles.metaText}>Local: {item.localDescricao}</Text>}
            {!!item.observacao && <Text style={styles.metaText}>Obs: {item.observacao}</Text>}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push({
                    pathname: "/abastecimentos/novo",
                    params: { id: String(item.id) },
                  } as any)
                }
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color={primaryColor} />
                <Text style={[styles.actionText, { color: primaryColor }]}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#E53E3E" />
                <Text style={[styles.actionText, { color: "#E53E3E" }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: primaryColor }]}
          onPress={() => router.push("/abastecimentos/novo" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>NOVO ABASTECIMENTO</Text>
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
  content: {
    padding: 20,
    paddingBottom: 110,
    gap: 14,
  },
  headerContent: {
    gap: 18,
    marginBottom: 6,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  heroValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  heroDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 18,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#555",
    fontWeight: "700",
    letterSpacing: 0.9,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#8a8a8a",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ececec",
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  cardDate: {
    fontSize: 13,
    color: "#8b8b8b",
    marginTop: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  infoPill: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: "#888",
    textTransform: "uppercase",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
  metaText: {
    fontSize: 13,
    color: "#5e5e5e",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9a9a9a",
    textAlign: "center",
    maxWidth: 280,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#f5f5f5",
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
