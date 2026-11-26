import ScaledText from '@/components/scaledText';
import { CategoriaLancamento, LancamentoInput, TipoLancamento } from "@/@types/lancamento";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { createLancamento, getLancamento, updateLancamento } from "@/services/lancamentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";

const revenues: CategoriaLancamento[] = ["FRETE", "OUTROS"];
const expenses: CategoriaLancamento[] = ["PEDAGIO", "MANUTENCAO", "ALIMENTACAO", "PERNOITE", "OUTROS"];
const labels: Record<string, string> = { FRETE: "Frete", PEDAGIO: "Pedágio", MANUTENCAO: "Manutenção", ALIMENTACAO: "Alimentação", PERNOITE: "Pernoite", OUTROS: "Outros" };

function formatAmount(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmount(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

export default function NovoLancamentoScreen() {
  const scheme = useColorScheme();
  const primary = colors[scheme ?? "light"].primary;
  const params = useLocalSearchParams<{ id?: string }>();
  const id = useMemo(() => Number(params.id) || null, [params.id]);
  const launchQuery = useQuery({ queryKey: ["lancamento", id], queryFn: () => getLancamento(id!), enabled: Boolean(id) });
  const [type, setType] = useState<TipoLancamento>("RECEITA");
  const [category, setCategory] = useState<CategoriaLancamento>("FRETE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const available = type === "RECEITA" ? revenues : expenses;

  useEffect(() => {
    const launch = launchQuery.data;
    if (!launch) return;
    setType(launch.tipo);
    setCategory(launch.categoria);
    setAmount(Number(launch.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setDescription(launch.descricao ?? "");
  }, [launchQuery.data]);
  useEffect(() => { if (!available.includes(category)) setCategory(available[0]); }, [type]);

  const mutation = useMutation({
    mutationFn: (payload: LancamentoInput) => id ? updateLancamento(id, payload) : createLancamento(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lancamentos-relatorio"] });
      await queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
      Toast.show(id ? "Lançamento atualizado." : "Lançamento registrado.", { type: "success", backgroundColor: "#10B981" });
      router.back();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      Toast.show(Array.isArray(message) ? message[0] : message || "Não foi possível salvar o lançamento.", { type: "error", backgroundColor: "#E53E3E" });
    },
  });

  const save = () => {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Toast.show("Informe um valor maior que zero.", { type: "warning", backgroundColor: "#D97706" });
      return;
    }
    mutation.mutate({ tipo: type, categoria: category, valor: value, descricao: description.trim() });
  };

  if (id && launchQuery.isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScaledText style={styles.label}>Tipo de lançamento</ScaledText>
      <View style={styles.typeRow}>
        {(["RECEITA", "DESPESA"] as const).map((item) => <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.typeButton, type === item && { backgroundColor: primary, borderColor: primary }]}><Ionicons name={item === "RECEITA" ? "trending-up-outline" : "trending-down-outline"} size={18} color={type === item ? "#fff" : primary}/><ScaledText style={[styles.typeText, type === item && styles.activeText]}>{item === "RECEITA" ? "Receita" : "Despesa"}</ScaledText></TouchableOpacity>)}
      </View>
      <ScaledText style={styles.label}>Categoria</ScaledText>
      <View style={styles.categories}>{available.map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.categoryButton, category === item && { borderColor: primary, backgroundColor: "#fff5ee" }]}><ScaledText style={[styles.categoryText, category === item && { color: primary }]}>{labels[item]}</ScaledText></TouchableOpacity>)}</View>
      <ScaledText style={styles.label}>Valor</ScaledText>
      <Input placeholder="0,00" value={amount} onChangeText={(value) => setAmount(formatAmount(value))} keyboardType="decimal-pad" accessibilityLabel="Valor do lançamento" />
      <ScaledText style={styles.label}>Descrição (opcional)</ScaledText>
      <Input placeholder="Ex.: frete Anápolis–Santos" value={description} onChangeText={setDescription} maxLength={240} accessibilityLabel="Descrição" />
      <ScaledText style={styles.helper}>A data do lançamento será registrada automaticamente.</ScaledText>
      <TouchableOpacity onPress={save} disabled={mutation.isPending} style={[styles.saveButton, { backgroundColor: primary, opacity: mutation.isPending ? 0.7 : 1 }]}>
        {mutation.isPending ? <ActivityIndicator color="#fff"/> : <ScaledText style={styles.saveText}>{id ? "SALVAR ALTERAÇÕES" : "REGISTRAR LANÇAMENTO"}</ScaledText>}
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: "#f5f5f5" }, content: { padding: 20, gap: 12, paddingBottom: 40 }, label: { fontSize: 14, fontWeight: "700", color: "#333", marginTop: 8 }, typeRow: { flexDirection: "row", gap: 10 }, typeButton: { flex: 1, flexDirection: "row", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff" }, typeText: { color: "#333", fontWeight: "700" }, activeText: { color: "#fff" }, categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, categoryButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: "#fff" }, categoryText: { fontSize: 13, color: "#555", fontWeight: "600" }, helper: { fontSize: 12, color: "#888", marginTop: 4 }, saveButton: { marginTop: 16, minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 0.4 }, center: { flex: 1, alignItems: "center", justifyContent: "center" } });
