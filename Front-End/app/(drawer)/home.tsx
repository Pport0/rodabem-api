import { ActionCard } from "@/components/actionCard";
import { useUser } from "@/hooks/useUser";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const { user } = useUser();
  const firstName = user?.nome?.split(" ")[0] || "Motorista";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>Olá, {firstName}!</Text>
        <Text style={styles.subGreeting}>O que você precisa hoje?</Text>
      </View>

      <View style={styles.cardsSection}>
        <ActionCard
          title="MEU CAMINHÃO"
          subtitle="Acesse os dados do seu veículo"
          iconName="bus-outline"
          backgroundColor="#FC6A03"
          onPress={() => router.push("/perfil" as any)}
        />
        <ActionCard
          title="MEUS DOCUMENTOS"
          subtitle="Acesse CRLV, CNH e outros"
          iconName="document-text-outline"
          backgroundColor="#2D3748"
          onPress={() => router.push("/meusDocumentos" as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 28,
  },
  greetingSection: {
    gap: 4,
    marginTop: 8,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111",
  },
  subGreeting: {
    fontSize: 14,
    color: "#888",
  },
  cardsSection: {
    gap: 16,
  },
});
