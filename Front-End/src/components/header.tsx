import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

function goBackToStartScreen() {
  router.back();
}

export default function Header({ title }: { title?: string }) {
  return <SafeAreaView style={styles.container}>
    <TouchableOpacity style={styles.backButton} onPress={goBackToStartScreen}>
      <Ionicons name="arrow-back" size={20} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.text}>{title ?? 'RB'}</Text>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FC6A03',
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
});