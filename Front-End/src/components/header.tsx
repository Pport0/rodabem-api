import colors from '@/constants/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

function goBackToStartScreen() {
  router.back();
}

export default function Header({ title }: { title?: string }) {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  return <SafeAreaView style={[styles.container, { backgroundColor: primaryColor }]}>
    <TouchableOpacity style={styles.backButton} onPress={goBackToStartScreen}>
      <Ionicons name="arrow-back" size={20} color="#fff" />
    </TouchableOpacity>
    {title ? <Text style={styles.text}>{title}</Text> : <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />}
  </SafeAreaView>
}

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    left: 20
  },
  logo: {
    width: 32,
    height: 32,
  },
});