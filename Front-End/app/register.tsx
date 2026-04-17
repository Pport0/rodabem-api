import colors from '@/constants/colors';
import Input from '@/components/input';
import { useAuth } from '@/contexts/authContext';
import Button from '@/shared/ui/base/button';
import Ionicons from '@expo/vector-icons/Ionicons';
import { maskCpf } from '@/utils/maskCpf';
import { maskPhone } from '@/utils/maskPhone';
import { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

interface FormErrors {
  nome?: string;
  cpf?: string;
  telefone?: string;
  senha?: string;
  confirmarSenha?: string;
  email?: string;
}

export default function Register() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const { signUp } = useAuth();

  const isMinLength = senha.length >= 6;
  const hasChars = senha.length > 0;
  const normalizedEmail = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nome.trim()) {
      newErrors.nome = 'Nome completo e obrigatorio';
    }
    if (cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF invalido';
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone invalido';
    }
    if (!normalizedEmail) {
      newErrors.email = 'Email e obrigatorio';
    } else if (!isEmailValid) {
      newErrors.email = 'Email invalido';
    }
    if (!senha) {
      newErrors.senha = 'Senha e obrigatoria';
    } else if (!isMinLength) {
      newErrors.senha = 'A senha deve ter no minimo 6 caracteres';
    }
    if (!confirmarSenha) {
      newErrors.confirmarSenha = 'Confirmacao de senha e obrigatoria';
    } else if (senha !== confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas nao coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    await signUp({
      cpf: cpf.replace(/\D/g, ''),
      telefone: telefone.replace(/\D/g, ''),
      senha,
      email: normalizedEmail,
      nome: nome.trim(),
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>CRIAR CONTA</Text>
        <Text style={styles.subtitle}>Informe os seus dados pessoais</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>NOME COMPLETO*</Text>
        <Input
          placeholder="Digite aqui o seu nome completo"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
        />
        {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>CPF*</Text>
        <Input
          placeholder="000.000.000-00"
          value={cpf}
          onChangeText={(text) => setCpf(maskCpf(text))}
          keyboardType="numeric"
        />
        {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>TELEFONE*</Text>
        <Input
          placeholder="(00) 00000-0000"
          value={telefone}
          onChangeText={(text) => setTelefone(maskPhone(text))}
          keyboardType="numeric"
        />
        {errors.telefone && (
          <Text style={styles.errorText}>{errors.telefone}</Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>EMAIL*</Text>
        <Input
          placeholder="Digite aqui o seu email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>SENHA DE ACESSO*</Text>
        <Input
          placeholder="Digite uma senha"
          value={senha}
          onChangeText={setSenha}
          type="password"
        />
        <View style={styles.passwordHints}>
          <View style={styles.passwordHint}>
            <Ionicons
              name={hasChars ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18}
              color={hasChars ? '#10B981' : '#aaa'}
            />
            <Text style={[styles.hintText, hasChars && styles.hintTextValid]}>
              Pode conter letras, numeros e simbolos
            </Text>
          </View>
          <View style={styles.passwordHint}>
            <Ionicons
              name={
                isMinLength ? 'checkmark-circle' : 'checkmark-circle-outline'
              }
              size={18}
              color={isMinLength ? '#10B981' : '#aaa'}
            />
            <Text
              style={[styles.hintText, isMinLength && styles.hintTextValid]}
            >
              Minimo de 6 caracteres
            </Text>
          </View>
        </View>
        {errors.senha && <Text style={styles.errorText}>{errors.senha}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>CONFIRME SUA SENHA*</Text>
        <Input
          placeholder="Confirme a sua senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          type="password"
        />
        {errors.confirmarSenha && (
          <Text style={styles.errorText}>{errors.confirmarSenha}</Text>
        )}
      </View>

      <Button
        height={60}
        width={Dimensions.get('window').width - 40}
        backgroundColor={primaryColor}
        onPress={handleRegister}
      >
        <Text style={styles.buttonText}>CONTINUAR</Text>
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 5,
    width: '100%',
    marginBottom: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  inputContainer: {
    gap: 8,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    color: '#E53E3E',
  },
  passwordHints: {
    gap: 6,
    paddingHorizontal: 2,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 13,
    color: '#aaa',
  },
  hintTextValid: {
    color: '#10B981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
