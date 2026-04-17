import { StyleSheet, Text, View } from "react-native";

export function PlacaBadge({ placa }: { placa: string }) {
    return (
      <View style={styles.placaBadge}>
        <Text style={styles.placaText}>{placa}</Text>
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
