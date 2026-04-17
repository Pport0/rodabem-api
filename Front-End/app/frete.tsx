import { HistoricoFreteItem, TipoCarga } from "@/@types/frete";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { getHistoricoFrete, simularFrete } from "@/services/freteService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const loadOptions: { value: TipoCarga; label: string }[] = [
  { value: "GERAL", label: "Geral" },
  { value: "GRANEL_SOLIDO", label: "Granel solido" },
  { value: "GRANEL_LIQUIDO", label: "Granel liquido" },
  { value: "FRIGORIFICADA", label: "Frigorificada" },
  { value: "PERIGOSA", label: "Perigosa" },
  { value: "CONTEINER", label: "Container" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} min`;
  return `${hours}h ${mins}min`;
}

function HistoryCard({ item, primaryColor }: { item: HistoricoFreteItem; primaryColor: string }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyRoute}>{item.origem}</Text>
          <Text style={styles.historyArrow}>ate {item.destino}</Text>
        </View>
        <Text style={[styles.historyValue, { color: primaryColor }]}>
          {formatCurrency(item.valorLiquidoEstimado)}
        </Text>
      </View>
      <View style={styles.historyMetaRow}>
        <Text style={styles.historyMeta}>{item.distanciaKm.toFixed(1)} km</Text>
        <Text style={styles.historyMeta}>{formatCurrency(item.valorMinimoAntt)} ANTT</Text>
        <Text style={styles.historyMeta}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function FreteScreen() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;

  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [paradas, setParadas] = useState("");
  const [tipoCarga, setTipoCarga] = useState<TipoCarga>("GERAL");
  const [consumoManual, setConsumoManual] = useState("");
  const [precoCombustivel, setPrecoCombustivel] = useState("");
  const [pedagiosManual, setPedagiosManual] = useState("");
  const [retornoVazio, setRetornoVazio] = useState(false);
  const [altoDesempenho, setAltoDesempenho] = useState(false);

  const historicoQuery = useQuery({
    queryKey: ["historico-frete"],
    queryFn: getHistoricoFrete,
  });

  const simulationMutation = useMutation({
    mutationFn: simularFrete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico-frete"] });
      Toast.show("Simulacao realizada com sucesso.", {
        type: "success",
        backgroundColor: "#10B981",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Nao foi possivel calcular o frete.";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const latestResult = simulationMutation.data;

  const summary = useMemo(() => {
    if (!latestResult) return null;
    return [
      { label: "Distancia", value: `${latestResult.distanciaKm.toFixed(1)} km` },
      { label: "Duracao", value: durationLabel(latestResult.duracaoMinutos) },
      { label: "Combustivel", value: formatCurrency(latestResult.custoCombustivel) },
      { label: "Pedagios", value: formatCurrency(latestResult.pedagiosEstimados) },
    ];
  }, [latestResult]);

  const handleSubmit = () => {
    if (!origem.trim() || !destino.trim() || !precoCombustivel.trim()) {
      Toast.show("Preencha origem, destino e preco do combustivel.", {
        type: "error",
        backgroundColor: "#E53E3E",
      });
      return;
    }

    simulationMutation.mutate({
      origem: origem.trim(),
      destino: destino.trim(),
      paradasIntermediarias: paradas
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      tipoCarga,
      consumoMedioKmLOverride: consumoManual
        ? Number(consumoManual.replace(",", "."))
        : undefined,
      precoCombustivel: Number(precoCombustivel.replace(",", ".")),
      pedagiosManual: pedagiosManual
        ? Number(pedagiosManual.replace(",", "."))
        : undefined,
      retornoVazio,
      altoDesempenho,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={historicoQuery.isRefetching}
          onRefresh={() => historicoQuery.refetch()}
          tintColor={primaryColor}
        />
      }
    >
      <View style={[styles.heroCard, { backgroundColor: primaryColor }]}>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>CALCULADORA DE FRETE</Text>
          <Text style={styles.heroTitle}>Simule custos, ANTT e retorno estimado.</Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="trail-sign-outline" size={28} color="#fff" />
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>DADOS DA VIAGEM</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>ORIGEM *</Text>
          <Input placeholder="Cidade, estado ou endereco" value={origem} onChangeText={setOrigem} />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>DESTINO *</Text>
          <Input placeholder="Cidade, estado ou endereco" value={destino} onChangeText={setDestino} />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>PARADAS INTERMEDIARIAS</Text>
          <Input
            placeholder="Uma parada por linha"
            value={paradas}
            onChangeText={setParadas}
            multiline
            numberOfLines={3}
          />
        </View>

        <Text style={[styles.groupLabel, { color: primaryColor }]}>TIPO DE CARGA</Text>
        <View style={styles.chipsRow}>
          {loadOptions.map((option) => {
            const active = option.value === tipoCarga;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chip,
                  active && { backgroundColor: primaryColor, borderColor: primaryColor },
                ]}
                onPress={() => setTipoCarga(option.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, styles.flex]}>
            <Text style={styles.label}>PRECO COMBUSTIVEL *</Text>
            <Input
              placeholder="Ex: 6.29"
              value={precoCombustivel}
              onChangeText={(text) => setPrecoCombustivel(text.replace(/[^0-9.,]/g, ""))}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.fieldContainer, styles.flex]}>
            <Text style={styles.label}>PEDAGIOS</Text>
            <Input
              placeholder="Opcional"
              value={pedagiosManual}
              onChangeText={(text) => setPedagiosManual(text.replace(/[^0-9.,]/g, ""))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>CONSUMO MEDIO MANUAL (KM/L)</Text>
          <Input
            placeholder="Opcional, use para sobrescrever a media do app"
            value={consumoManual}
            onChangeText={(text) => setConsumoManual(text.replace(/[^0-9.,]/g, ""))}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextGroup}>
            <Text style={styles.switchTitle}>Retorno vazio</Text>
            <Text style={styles.switchSubtitle}>Dobra distancia e pedagios para volta sem carga.</Text>
          </View>
          <Switch
            value={retornoVazio}
            onValueChange={setRetornoVazio}
            trackColor={{ false: "#ddd", true: "#f5b08c" }}
            thumbColor={retornoVazio ? primaryColor : "#fff"}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextGroup}>
            <Text style={styles.switchTitle}>Alto desempenho</Text>
            <Text style={styles.switchSubtitle}>Guarda a simulacao com essa classificacao.</Text>
          </View>
          <Switch
            value={altoDesempenho}
            onValueChange={setAltoDesempenho}
            trackColor={{ false: "#ddd", true: "#f5b08c" }}
            thumbColor={altoDesempenho ? primaryColor : "#fff"}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: primaryColor },
            simulationMutation.isPending && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={simulationMutation.isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {simulationMutation.isPending ? "CALCULANDO..." : "SIMULAR FRETE"}
          </Text>
        </TouchableOpacity>
      </View>

      {latestResult && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionTitle}>ULTIMA SIMULACAO</Text>
            <Text
              style={[
                styles.resultProfit,
                { color: latestResult.abaixoMinimoAntt ? "#E53E3E" : "#10B981" },
              ]}
            >
              {formatCurrency(latestResult.valorLiquidoEstimado)}
            </Text>
          </View>

          <Text style={styles.resultRoute}>
            {latestResult.origem} ate {latestResult.destino}
          </Text>

          <View style={styles.summaryGrid}>
            {summary?.map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Valor minimo ANTT</Text>
            <Text style={styles.detailValue}>{formatCurrency(latestResult.valorMinimoAntt)}</Text>
          </View>
          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Litros necessarios</Text>
            <Text style={styles.detailValue}>{latestResult.litrosNecessarios.toFixed(2)} L</Text>
          </View>
          <View style={styles.detailLine}>
            <Text style={styles.detailLabel}>Consumo usado</Text>
            <Text style={styles.detailValue}>{latestResult.consumoMedioKmL.toFixed(2)} km/L</Text>
          </View>

          {!!latestResult.aviso && <Text style={styles.warningText}>{latestResult.aviso}</Text>}
        </View>
      )}

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>HISTORICO DE SIMULACOES</Text>
        {historicoQuery.data?.length ? (
          historicoQuery.data.map((item) => (
            <HistoryCard key={item.id} item={item} primaryColor={primaryColor} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#d8d8d8" />
            <Text style={styles.emptyTitle}>Nenhuma simulacao registrada</Text>
            <Text style={styles.emptySubtitle}>A primeira simulacao aparecera aqui.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
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
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  heroBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ececec",
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 0.9,
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  chipText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 14,
  },
  switchTextGroup: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  switchSubtitle: {
    fontSize: 12,
    color: "#8a8a8a",
    lineHeight: 17,
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
  buttonDisabled: {
    opacity: 0.65,
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ececec",
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  resultProfit: {
    fontSize: 20,
    fontWeight: "700",
  },
  resultRoute: {
    fontSize: 15,
    color: "#222",
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: "#f8f8f8",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#888",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
  warningText: {
    color: "#E53E3E",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  historySection: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ececec",
    gap: 10,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  historyRoute: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  historyArrow: {
    fontSize: 13,
    color: "#7d7d7d",
    marginTop: 2,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  historyMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  historyMeta: {
    fontSize: 12,
    color: "#8a8a8a",
    backgroundColor: "#f8f8f8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
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
  },
});
