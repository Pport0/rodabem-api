import { AlertaVencimento as Alerta } from "@/@types/documento";
import { getAlertasVencimento } from "@/services/documentoService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function descreverPrazo(diasRestantes: number) {
  if (diasRestantes <= 0) return "vence hoje";
  if (diasRestantes === 1) return "vence amanhã";
  return `vence em ${diasRestantes} dias`;
}

// RNE-11: alerta de vencimento na tela inicial. A janela e a ordenacao vem do back
// (GET /documentos/alertas, DIAS_ALERTA_VENCIMENTO); aqui so exibimos.
export function AlertaVencimento() {
  const { data } = useQuery({
    // Sob ["documentos"] para ser recarregado quando um documento e cadastrado ou editado.
    queryKey: ["documentos", "alertas"],
    queryFn: getAlertasVencimento,
  });

  const alertas: Alerta[] = data?.alertas ?? [];
  if (alertas.length === 0) return null;

  const [maisProximo, ...demais] = alertas;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      accessibilityRole="button"
      onPress={() => router.push("/meusDocumentos" as any)}
    >
      <View style={styles.iconBox}>
        <Ionicons name="warning" size={24} color="#fff" />
      </View>
      <View style={styles.textos}>
        <Text style={styles.titulo}>ALERTA</Text>
        <Text style={styles.mensagem}>
          {maisProximo.nome} {descreverPrazo(maisProximo.diasRestantes)}
        </Text>
        {demais.length > 0 && (
          <Text style={styles.complemento}>
            {demais.length === 1
              ? "e mais 1 documento perto do vencimento"
              : `e mais ${demais.length} documentos perto do vencimento`}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#E53E3E",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  mensagem: {
    color: "#fff",
    fontSize: 16,
  },
  complemento: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
  },
});
