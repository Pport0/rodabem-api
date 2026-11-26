import ScaledText from '@/components/scaledText';
import { LancamentoHistoricoItem } from "@/@types/lancamento";
import { QueryErrorState } from "@/components/queryErrorState";
import colors from "@/constants/colors";
import { deleteLancamento, getRelatorioLancamentos } from "@/services/lancamentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";

const labels: Record<string, string> = {
  FRETE: "Frete", COMBUSTIVEL: "Combustível", PEDAGIO: "Pedágio", MANUTENCAO: "Manutenção",
  ALIMENTACAO: "Alimentação", PERNOITE: "Pernoite", OUTROS: "Outros",
};
const currency = (value: number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const paramDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function HistoricoRow({ item, onDelete, onEdit }: { item: LancamentoHistoricoItem; onDelete: () => void; onEdit: () => void }) {
  const receita = item.tipo === "RECEITA";
  const combustivel = item.categoria === "COMBUSTIVEL";
  return <View style={styles.historyRow}>
    <View style={[styles.historyIcon, { backgroundColor: receita ? "#dcfce7" : "#fee2e2" }]}>
      <Ionicons name={receita ? "arrow-down-outline" : combustivel ? "water-outline" : "arrow-up-outline"} size={19} color={receita ? "#15803d" : "#dc2626"} />
    </View>
    <View style={styles.historyCopy}>
      <ScaledText style={styles.historyTitle}>{labels[item.categoria] ?? item.categoria}</ScaledText>
      <ScaledText style={styles.historySubtitle}>{item.descricao || (receita ? "Receita" : "Despesa")} · {new Date(item.data).toLocaleDateString("pt-BR")}</ScaledText>
    </View>
    <View style={styles.historyValueGroup}>
      <ScaledText style={[styles.historyValue, { color: receita ? "#15803d" : "#dc2626" }]}>{receita ? "+" : "−"}{currency(item.valor)}</ScaledText>
      {item.origem === "lancamento" && <View style={styles.rowActions}>
        <TouchableOpacity accessibilityLabel="Editar lançamento" onPress={onEdit}><Ionicons name="create-outline" size={17} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Excluir lançamento" onPress={onDelete}><Ionicons name="trash-outline" size={17} color="#dc2626" /></TouchableOpacity>
      </View>}
    </View>
  </View>;
}

export default function FinanceiroScreen() {
  const scheme = useColorScheme();
  const primary = colors[scheme ?? "light"].primary;
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const start = paramDate(month);
  const end = `${paramDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))}T23:59:59.999Z`;
  const report = useQuery({ queryKey: ["lancamentos-relatorio", start], queryFn: () => getRelatorioLancamentos({ dataInicio: start, dataFim: end }) });
  const deleteMutation = useMutation({
    mutationFn: deleteLancamento,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["lancamentos-relatorio"] }); Toast.show("Lançamento excluído.", { type: "success", backgroundColor: "#10B981" }); },
    onError: () => Toast.show("Não foi possível excluir o lançamento.", { type: "error", backgroundColor: "#E53E3E" }),
  });
  const goMonth = (offset: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month).toLocaleUpperCase("pt-BR");
  const data = report.data;
  const entries = data?.historico ?? [];
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);
  const confirmDelete = (item: LancamentoHistoricoItem) => Alert.alert("Excluir lançamento", "Deseja excluir este lançamento financeiro?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
  ]);

  const header = <View style={styles.listHeader}>
    <View style={styles.monthRow}>
      <TouchableOpacity accessibilityLabel="Mês anterior" style={styles.monthArrow} onPress={() => goMonth(-1)}><Ionicons name="chevron-back" size={20} color={primary} /></TouchableOpacity>
      <ScaledText style={styles.monthTitle}>{monthTitle}</ScaledText>
      <TouchableOpacity accessibilityLabel="Próximo mês" style={styles.monthArrow} onPress={() => goMonth(1)}><Ionicons name="chevron-forward" size={20} color={primary} /></TouchableOpacity>
    </View>
    <View style={styles.summaryRow}>
      <Summary title="Receitas" value={data?.totalReceitas ?? 0} color="#15803d" />
      <Summary title="Despesas" value={data?.totalDespesas ?? 0} color="#dc2626" />
      <Summary title="Saldo" value={data?.saldo ?? 0} color={(data?.saldo ?? 0) < 0 ? "#dc2626" : "#0f766e"} />
    </View>
    <ScaledText style={styles.sectionTitle}>TOTAL POR CATEGORIA</ScaledText>
    {Object.entries(data?.porCategoria ?? {}).filter(([, value]) => value > 0).map(([category, value]) => (
      <View style={styles.categoryRow} key={category}><ScaledText style={styles.categoryLabel}>{labels[category] ?? category}</ScaledText><ScaledText style={styles.categoryValue}>{currency(value)}</ScaledText></View>
    ))}
    <View style={styles.historyHeader}><ScaledText style={styles.sectionTitle}>HISTÓRICO DO MÊS</ScaledText><TouchableOpacity onPress={() => router.push("/lancamentos/novo" as any)} style={[styles.addButton, { backgroundColor: primary }]}><Ionicons name="add" size={19} color="#fff"/><ScaledText style={styles.addButtonText}>Novo</ScaledText></TouchableOpacity></View>
  </View>;

  if (report.isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;
  if (report.isError) return <QueryErrorState message="Não foi possível carregar o relatório financeiro." onRetry={() => { void report.refetch(); }} />;

  return <FlatList
    style={styles.container}
    data={entries}
    keyExtractor={(item, index) => `${item.origem}-${item.id}-${index}`}
    renderItem={({ item }) => <HistoricoRow item={item} onDelete={() => confirmDelete(item)} onEdit={() => router.push({ pathname: "/lancamentos/novo", params: { id: String(item.id) } } as any)} />}
    ListHeaderComponent={header}
    ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={40} color="#cbd5e1"/><ScaledText style={styles.emptyText}>Nenhum lançamento em {monthName}</ScaledText></View>}
    contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={report.isRefetching} onRefresh={() => { void report.refetch(); }} />}
  />;
}

function Summary({ title, value, color }: { title: string; value: number; color: string }) {
  return <View style={styles.summaryCard}><ScaledText style={styles.summaryTitle}>{title}</ScaledText><ScaledText style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{currency(value)}</ScaledText></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" }, content: { padding: 16, paddingBottom: 32 }, listHeader: { gap: 14, marginBottom: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, monthArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }, monthTitle: { color: "#222", fontSize: 16, fontWeight: "800", letterSpacing: 0.6 },
  summaryRow: { flexDirection: "row", gap: 8 }, summaryCard: { flex: 1, minHeight: 82, backgroundColor: "#fff", borderRadius: 14, padding: 10, justifyContent: "center", gap: 8, elevation: 1 }, summaryTitle: { color: "#888", fontSize: 11, fontWeight: "600" }, summaryValue: { fontSize: 15, fontWeight: "800" },
  sectionTitle: { color: "#555", fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }, categoryRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", padding: 13, borderRadius: 10 }, categoryLabel: { color: "#555", fontSize: 13 }, categoryValue: { color: "#222", fontSize: 13, fontWeight: "700" },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }, addButton: { flexDirection: "row", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", gap: 4 }, addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  historyRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 13, marginBottom: 8, padding: 12, gap: 10 }, historyIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, historyCopy: { flex: 1 }, historyTitle: { color: "#222", fontWeight: "700", fontSize: 14 }, historySubtitle: { color: "#888", fontSize: 11, marginTop: 3 }, historyValueGroup: { alignItems: "flex-end", gap: 7 }, historyValue: { fontWeight: "800", fontSize: 13 }, rowActions: { flexDirection: "row", gap: 12 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 40, backgroundColor: "#fff", borderRadius: 14 }, emptyText: { color: "#777", fontSize: 14, textAlign: "center" }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
