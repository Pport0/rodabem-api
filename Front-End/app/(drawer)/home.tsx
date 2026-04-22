import { ActionCard } from '@/components/actionCard';
import colors from '@/constants/colors';
import { useFontSize } from '@/contexts/fontSizeContext';
import { useUser } from '@/hooks/useUser';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function Home() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;
  const { scaleFont } = useFontSize();

  const { user } = useUser();
  const firstName = user?.nome?.split(' ')[0] || 'Motorista';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greetingSection}>
        <Text style={[styles.greeting, { fontSize: scaleFont(26) }]}>
          Olá, {firstName}!
        </Text>
        <Text style={[styles.subGreeting, { fontSize: scaleFont(14) }]}>
          O que você precisa hoje?
        </Text>
      </View>

      <View style={styles.cardsSection}>
        <ActionCard
          title="MEU CAMINHÃO"
          subtitle="Acesse os dados do seu veículo"
          iconName="bus-outline"
          backgroundColor={primaryColor}
          onPress={() => router.push('/perfil' as any)}
        />
        <ActionCard
          title="MEUS DOCUMENTOS"
          subtitle="Acesse CRLV, CNH e outros"
          iconName="document-text-outline"
          backgroundColor="#2D3748"
          onPress={() => router.push('/meusDocumentos' as any)}
        />
        <ActionCard
          title="ABASTECIMENTOS"
          subtitle="Registre abastecimentos e acompanhe a média"
          iconName="water-outline"
          backgroundColor="#D97706"
          onPress={() => router.push('/abastecimentos' as any)}
        />
        <ActionCard
          title="CALCULADORA DE FRETE"
          subtitle="Simule custos, ANTT e retorno estimado"
          iconName="trail-sign-outline"
          backgroundColor="#166534"
          onPress={() => router.push('/frete' as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    fontWeight: 'bold',
    color: '#111',
  },
  subGreeting: {
    color: '#888',
  },
  cardsSection: {
    gap: 16,
  },
});
