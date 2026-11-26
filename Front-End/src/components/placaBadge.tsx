import ScaledText from '@/components/scaledText';
import { StyleSheet, Text, View } from "react-native";

export function PlacaBadge({ placa }: { placa: string }) {
    return (
      <View style={styles.placaBadge}>
        <ScaledText style={styles.placaText}>{placa}</ScaledText>
      </View>
    );
  }

const styles = StyleSheet.create({
    placaBadge: {
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: "#ddd",
      },
      placaText: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#222",
        letterSpacing: 1.5,
      },
  });
