import { Abastecimento } from "@/@types/abastecimento";
import colors from "@/constants/colors";
import { QueryErrorState } from "@/components/queryErrorState";
import {
  deleteAbastecimento,
  getRelatorioAbastecimentos,
  getMediaConsumo,
} from "@/services/abastecimentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

function toDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(date)
    .toLocaleUpperCase("pt-BR");
}

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
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });
  const dataInicio = toDateParam(mesSelecionado);
  const dataFim = toDateParam(new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + 1, 0));
  const tituloMes = formatMonth(mesSelecionado);

  const relatorioQuery = useQuery({
    queryKey: ["abastecimentos-relatorio", dataInicio],
    queryFn: () => getRelatorioAbastecimentos({ dataInicio, dataFim }),
  });

  const mediaQuery = useQuery({
    queryKey: ["media-consumo"],
    queryFn: getMediaConsumo,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAbastecimento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
      queryClient.invalidateQueries({ queryKey: ["abastecimentos-relatorio"] });
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

  const handleDelete = (item: Pick<Abastecimento, "id" | "dataAbastecimento">) => {
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

  const isRefreshing = relatorioQuery.isRefetching || mediaQuery.isRefetching;

  return (
    <View style={styles.container}>
      <FlatList
        data={relatorioQuery.data?.abastecimentos ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void relatorioQuery.refetch();
              void mediaQuery.refetch();
            }}
            tintColor={primaryColor}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={[styles.heroCard, { backgroundColor: primaryColor }]}>
              <View style={styles.heroText}>
                <Text style={styles.heroEyebrow}>MÉDIA DE CONSUMO GERAL</Text>
                <Text style={styles.heroValue}>
                  {mediaQuery.data?.mediaConsumo != null
                    ? `${mediaQuery.data.mediaConsumo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mediaQuery.data.unidade}`
                    : "--"}
                </Text>
                <Text style={styles.heroDescription}>
                  Considera todos os abastecimentos registrados.
                </Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="speedometer-outline" size={30} color="#fff" />
              </View>
            </View>
            {mediaQuery.isError && (
              <QueryErrorState
                compact
                message="Não foi possível carregar a média de consumo."
                onRetry={() => { void mediaQuery.refetch(); }}
              />
            )}

            <View style={styles.monthSelector}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                style={styles.monthArrow}
                onPress={() => setMesSelecionado((mes) => new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
              >
                <Ionicons name="chevron-back" size={22} color={primaryColor} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{tituloMes}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                style={styles.monthArrow}
                onPress={() => setMesSelecionado((mes) => new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
              >
                <Ionicons name="chevron-forward" size={22} color={primaryColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthExpenseCard}>
              <Text style={styles.expenseLabel}>GASTO DO MÊS</Text>
              {relatorioQuery.isLoading ? (
                <ActivityIndicator color={primaryColor} />
              ) : relatorioQuery.isError ? (
                <Text style={styles.expenseValue}>--</Text>
              ) : (
                <Text style={styles.expenseValue}>{formatCurrency(relatorioQuery.data?.totalGasto ?? 0)}</Text>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{tituloMes}</Text>
              <Text style={styles.sectionSubtitle}>
                {relatorioQuery.data?.totalAbastecimentos ?? 0} registros encontrados
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          relatorioQuery.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Carregando abastecimentos...</Text>
            </View>
          ) : relatorioQuery.isError ? (
            <QueryErrorState
              message="Não foi possível carregar o relatório do mês."
              onRetry={() => { void relatorioQuery.refetch(); }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={50} color="#d8d8d8" />
              <Text style={styles.emptyTitle}>Nenhum abastecimento em {tituloMes.toLocaleLowerCase("pt-BR")}</Text>
              <Text style={styles.emptySubtitle}>
                Registre seus abastecimentos para acompanhar os gastos do período.
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
                <Text style={styles.infoText}>{item.totalLitros.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L</Text>
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
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  monthArrow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    color: "#333",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  monthExpenseCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ececec",
    padding: 18,
    gap: 8,
  },
  expenseLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  expenseValue: {
    color: "#1f2937",
    fontSize: 25,
    fontWeight: "700",
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
