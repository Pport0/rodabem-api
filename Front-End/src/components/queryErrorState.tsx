import ScaledText from '@/components/scaledText';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface QueryErrorStateProps {
  onRetry: () => void;
  message?: string;
  compact?: boolean;
}

export function QueryErrorState({
  onRetry,
  message = "Não foi possível carregar estes dados.",
  compact = false,
}: QueryErrorStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <ScaledText style={styles.message}>{message}</ScaledText>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Tentar carregar novamente"
        style={styles.retryButton}
        activeOpacity={0.75}
      >
        <ScaledText style={styles.retryText}>Tentar novamente</ScaledText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#FECACA",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    width: "100%",
  },
  compact: {
    padding: 10,
  },
  message: {
    color: "#7F1D1D",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
