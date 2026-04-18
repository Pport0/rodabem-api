import Input from '@/components/input';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/authContext';
import { useFontSize } from '@/contexts/fontSizeContext';
import Button from '@/shared/ui/base/button';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

export default function Login() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;
  const { scaleFont } = useFontSize();

  const [cpfOrPhone, setCpfOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = () => {
    login({ cpfOrPhone, password });
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { fontSize: scaleFont(48) }]}>Entrar</Text>
        <Text style={[styles.subtitle, { fontSize: scaleFont(16) }]}>
          Insira suas credenciais para acessar
        </Text>
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFont(16) }]}>
          CPF ou Telefone
        </Text>
        <Input
          placeholder="Insira o seu cpf ou telefone"
          value={cpfOrPhone}
          onChangeText={setCpfOrPhone}
          type="text"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFont(16) }]}>Senha</Text>
        <Input
          placeholder="Insira a sua senha"
          value={password}
          onChangeText={setPassword}
          type="password"
        />
      </View>
      <Button
        borderRadius={10}
        height={60}
        width={Dimensions.get('window').width - 40}
        backgroundColor={primaryColor}
        onPress={handleLogin}
      >
        <Text style={[styles.buttonText, { fontSize: scaleFont(20) }]}>
          Acessar
        </Text>
      </Button>
      <Pressable onPress={() => router.navigate('/forgotPassword')}>
        <Text style={[styles.forgotPasswordText, { fontSize: scaleFont(16) }]}>
          Esqueci minha senha
        </Text>
      </Pressable>
    </View>
  );
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
    fontWeight: 'bold',
  },
  subtitle: {},
  label: {
    fontWeight: 'bold',
  },
  inputContainer: {
    gap: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    color: '#000',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
