import colors from "@/constants/colors";
import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Text style={[styles.logoR, { color: primaryColor }]}>R</Text>
            <Text style={styles.logoB}>B</Text>
          </View>
          <Text style={styles.brandName}>RodaBem</Text>
        </View>

        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>ENTRAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: primaryColor }]}
            onPress={() => router.push("/register")}
            activeOpacity={0.85}
          >
            <Text style={[styles.outlineButtonText, { color: primaryColor }]}>CRIAR CONTA</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2025 - 2026 RodaBem</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 32,
  },
  logoSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  logoBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoR: {
    fontSize: 96,
    fontWeight: "900",
    lineHeight: 100,
    letterSpacing: -4,
  },
  logoB: {
    fontSize: 96,
    fontWeight: "900",
    color: "#2D3748",
    lineHeight: 100,
    letterSpacing: -4,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3748",
    letterSpacing: 0.5,
  },
  buttonsSection: {
    width: "100%",
    gap: 12,
    paddingBottom: 24,
  },
  primaryButton: {
    borderRadius: 14,
    height: 56,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 56,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  footer: {
    fontSize: 13,
    color: "#aaa",
  },
});
