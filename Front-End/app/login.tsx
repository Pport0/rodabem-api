import colors from "@/constants/colors";
import Input from "@/components/input";
import { useAuth } from "@/contexts/authContext";
import Button from "@/shared/ui/base/button";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

// Motivos com que o app traz o usuario de volta ao login depois de encerrar a sessao (#67).
const MENSAGENS_MOTIVO: Record<string, string> = {
  'sessao-expirada': 'Sua sessão expirou. Faça login novamente.',
  'senha-alterada': 'Senha alterada com sucesso. Entre novamente com a nova senha.',
};

export default function Login() {
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();
  const mensagemMotivo =
    typeof motivo === 'string' && Object.prototype.hasOwnProperty.call(MENSAGENS_MOTIVO, motivo)
      ? MENSAGENS_MOTIVO[motivo]
      : undefined;
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const [cpfOrPhone, setCpfOrPhone] = useState('');
  const [password, setPassword] = useState(''); 
  const [errors, setErrors] = useState<{ cpfOrPhone?: string; password?: string }>({});
  const { login, loginIsPending } = useAuth();

  const handleLogin = () => {
    const nextErrors: { cpfOrPhone?: string; password?: string } = {};
    if (!cpfOrPhone.trim()) nextErrors.cpfOrPhone = 'Informe seu CPF ou telefone.';
    if (!password.trim()) nextErrors.password = 'Informe sua senha.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (loginIsPending) return;
    login({ cpfOrPhone, password });
  }

  return <View style={styles.container}>
    <View style={styles.titleContainer}>
      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>Insira suas credenciais para acessar</Text>
    </View>
    {mensagemMotivo && <Text style={styles.motivoText}>{mensagemMotivo}</Text>}
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        CPF ou Telefone
      </Text>
      <Input placeholder="Insira o seu cpf ou telefone" value={cpfOrPhone} onChangeText={setCpfOrPhone} type="text" />
      {errors.cpfOrPhone && <Text style={styles.errorText}>{errors.cpfOrPhone}</Text>}
    </View>
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        Senha
      </Text>
      <Input placeholder="Insira a sua senha" value={password} onChangeText={setPassword} type="password" />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
    </View>
    <Button
      borderRadius={10}
      height={60}
      width={Dimensions.get('window').width - 40}
      backgroundColor={primaryColor}
      onPress={handleLogin}
      isLoading={loginIsPending}
      loadingText="Entrando..."
      showLoadingIndicator
      disabled={loginIsPending}
    >
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
  errorText: {
    fontSize: 13,
    color: '#E53E3E',
  },
  motivoText: {
    fontSize: 15,
    color: '#2D3748',
    textAlign: 'center',
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
