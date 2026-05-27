import { StyleSheet, Text, View } from "react-native";

export function InfoRow({ label, value }: { label: string; value?: string }) {
    return (
      <View  style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value || "—"}</Text>
      </View>
    );
  }

const styles = StyleSheet.create({
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
      },
      infoLabel: {
        fontSize: 13,
        color: "#888",
      },
      infoValue: {
        fontSize: 14,
        fontWeight: "500",
        color: "#222",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
      },
});