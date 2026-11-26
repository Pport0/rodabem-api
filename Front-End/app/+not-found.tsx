import ScaledText from '@/components/scaledText';
import colors from '@/constants/colors';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <ScaledText style={styles.title}>Esta tela não existe.</ScaledText>
        <Link href="/" style={styles.link}>
          <ScaledText style={[styles.linkText, { color: primaryColor }]}>Voltar para o início</ScaledText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
