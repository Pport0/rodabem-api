import colors from "@/constants/colors";
import Input from "@/components/input";
import { useAuth } from "@/contexts/authContext";
import Button from "@/shared/ui/base/button";
import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

export default function Login() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const [cpfOrPhone, setCpfOrPhone] = useState('');
  const [password, setPassword] = useState(''); 
  const { login } = useAuth();

  const handleLogin = () => {
    login({ cpfOrPhone, password });
  }

  return <View style={styles.container}>
    <View style={styles.titleContainer}>
      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>Insira suas credenciais para acessar</Text>
    </View>
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        CPF ou Telefone
      </Text>
      <Input placeholder="Insira o seu cpf ou telefone" value={cpfOrPhone} onChangeText={setCpfOrPhone} type="text" />
    </View>
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        Senha
      </Text>
      <Input placeholder="Insira a sua senha" value={password} onChangeText={setPassword} type="password" />
    </View>
    <Button borderRadius={10} height={60} width={Dimensions.get('window').width - 40} backgroundColor={primaryColor} onPress={handleLogin}>
      <Text style={styles.buttonText}>Acessar</Text>
    </Button>
    <Pressable onPress={() =>  router.navigate('/forgotPassword')}>
      <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
    </Pressable>
  </View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,    
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    gap: 5,
    width: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    gap: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});