import { Documento } from "@/@types/documento";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type DocumentStatus = "valido" | "vencendo" | "vencido";

function getDocumentStatus(dataVencimento: string): DocumentStatus {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diffDays = Math.ceil(
    (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "vencido";
  if (diffDays <= 30) return "vencendo";
  return "valido";
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; color: string; borderColor: string }
> = {
  valido: { label: "VÁLIDO", color: "#38A169", borderColor: "#38A169" },
  vencendo: {
    label: "VENCENDO EM BREVE",
    color: "#FC6A03",
    borderColor: "#FC6A03",
  },
  vencido: { label: "EXPIRADO", color: "#E53E3E", borderColor: "#E53E3E" },
};

export function DocumentoCard({ documento }: { documento: Documento }) {
  const status = getDocumentStatus(documento.dataVencimento);
  const { label, color, borderColor } = STATUS_CONFIG[status];
  const isExpired = status === "vencido";
  const isExpiring = status === "vencendo";

  const formattedDate = new Date(documento.dataVencimento).toLocaleDateString(
    "pt-BR"
  );

  return (
    <View style={[styles.docCard, { borderLeftColor: borderColor }]}>
      <View style={styles.docCardInner}>
        <View style={styles.docInfo}>
          <Text style={[styles.docStatus, { color }]}>{label}</Text>
          <Text style={styles.docNome}>{documento.nome}</Text>
          <Text style={styles.docDate}>
            {isExpired ? "Expirou em: " : "Vencimento: "}
            {formattedDate}
          </Text>
        </View>
        <View style={styles.docActions}>
          <View style={styles.eyeBtn}>
            <Ionicons
              name="eye-outline"
              size={18}
              color={isExpired ? "#E53E3E" : "#FC6A03"}
            />
          </View>
        </View>
      </View>

      {(isExpiring || isExpired) && (
        <TouchableOpacity style={styles.renewBtn} activeOpacity={0.7}>
          <Text style={styles.renewBtnText}>REGISTRAR RENOVAÇÃO</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
    docCard: {
      backgroundColor: "#fff",
      borderRadius: 12,
      borderLeftWidth: 4,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    docCardInner: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 16,
      gap: 12,
    },
    docInfo: {
      flex: 1,
      gap: 3,
    },
    docStatus: {
      fontSize: 11,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
    docNome: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#111",
      marginTop: 2,
    },
    docDate: {
      fontSize: 13,
      color: "#888",
      marginTop: 2,
    },
    docActions: {
      paddingTop: 2,
    },
    eyeBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: "#fff5ee",
      justifyContent: "center",
      alignItems: "center",
    },
    renewBtn: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: "#FC6A03",
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    renewBtnText: {
      color: "#FC6A03",
      fontWeight: "bold",
      fontSize: 13,
      letterSpacing: 0.5,
    },
  });