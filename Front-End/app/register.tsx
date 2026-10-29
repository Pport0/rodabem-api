import colors from "@/constants/colors";
import Input from "@/components/input";
import { useAuth } from "@/contexts/authContext";
import { getTermoVigente } from "@/services/termosService";
import Button from "@/shared/ui/base/button";
import { maskCpf } from "@/utils/maskCpf";
import { maskPhone } from "@/utils/maskPhone";
import { validateEmail } from "@/utils/userValidation";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";

interface FormErrors {
  nome?: string;
  cpf?: string;
  telefone?: string;
  senha?: string;
  confirmarSenha?: string;
  email?: string;
  termo?: string;
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
  const [aceitouTermo, setAceitouTermo] = useState(false);
  const termoQuery = useQuery({ queryKey: ["termo-vigente"], queryFn: getTermoVigente });

  const { signUp, signUpIsPending } = useAuth();

  const isMinLength = senha.length >= 6;
  const hasChars = senha.length > 0;
  const telefoneDigits = telefone.replace(/\D/g, '');

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nome.trim()) {
      newErrors.nome = 'Nome completo é obrigatório';
    }
    if (cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF inválido';
    }
    // Telefone e opcional (RNE-01), mas se informado tem que estar completo.
    if (telefoneDigits && telefoneDigits.length < 10) {
      newErrors.telefone = 'Telefone inválido';
    }
    const emailError = validateEmail(email);
    if (emailError) {
      newErrors.email = emailError;
    }
    if (!senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (!isMinLength) {
      newErrors.senha = 'A senha deve ter no mínimo 6 caracteres';
    }
    if (!confirmarSenha) {
      newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
    } else if (senha !== confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (signUpIsPending || !validate()) return;
    if (!aceitouTermo) {
      setErrors((atual) => ({ ...atual, termo: "Marque a caixa para liberar o cadastro." }));
      return;
    }
    if (!termoQuery.data) return;
    // Vazio vai como undefined: telefone e unico no banco, e "" colidiria entre usuarios sem telefone.
    signUp({ cpf: cpf.replace(/\D/g, ''), telefone: telefoneDigits || undefined, senha, email: email.trim(), nome: nome.trim(), termoVersao: termoQuery.data.versao });
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
          onChangeText={(t) => setCpf(maskCpf(t))}
          keyboardType="numeric"
        />
        {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>TELEFONE</Text>
        <Input
          placeholder="(00) 00000-0000"
          value={telefone}
          onChangeText={(t) => setTelefone(maskPhone(t))}
          keyboardType="numeric"
        />
        {errors.telefone && <Text style={styles.errorText}>{errors.telefone}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>EMAIL*</Text>
        <Input
          placeholder="Digite aqui o seu email"
          value={email}
          onChangeText={(t) => setEmail(t)}
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
              name={hasChars ? "checkmark-circle" : "checkmark-circle-outline"}
              size={18}
              color={hasChars ? '#10B981' : '#aaa'}
            />
            <Text style={[styles.hintText, hasChars && styles.hintTextValid]}>
              Pode conter letras, números e símbolos
            </Text>
          </View>
          <View style={styles.passwordHint}>
            <Ionicons
              name={isMinLength ? "checkmark-circle" : "checkmark-circle-outline"}
              size={18}
              color={isMinLength ? '#10B981' : '#aaa'}
            />
            <Text style={[styles.hintText, isMinLength && styles.hintTextValid]}>
              Mínimo de 6 caracteres
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

      <View style={styles.termSection}>
        {termoQuery.isLoading ? (
          <ActivityIndicator color={primaryColor} />
        ) : termoQuery.isError ? (
          <View style={styles.termLoadError}>
            <Text style={styles.errorText}>Não foi possível carregar o termo antes de criar sua conta.</Text>
            <TouchableOpacity onPress={() => { void termoQuery.refetch(); }}>
              <Text style={[styles.termLink, { color: primaryColor }]}>Tentar carregar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.termRow}>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: aceitouTermo }}
                accessibilityLabel="Aceitar Termo de Uso e Isenção de Responsabilidade"
                style={[styles.termCheckbox, aceitouTermo && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                onPress={() => {
                  setAceitouTermo((marcado) => !marcado);
                  setErrors((atual) => ({ ...atual, termo: undefined }));
                }}
              >
                {aceitouTermo && <Ionicons name="checkmark" size={18} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.termText}>Li e aceito o </Text>
              <Pressable onPress={() => router.push("/termos")}>
                <Text style={[styles.termLink, { color: primaryColor }]}>Termo de Uso e Isenção de Responsabilidade</Text>
              </Pressable>
            </View>
            {!aceitouTermo && (
              <Text style={styles.termHint}>Marque a caixa para liberar o botão CONTINUAR.</Text>
            )}
            {errors.termo && <Text style={styles.errorText}>{errors.termo}</Text>}
          </>
        )}
      </View>

      <Button
        height={60}
        width={Dimensions.get('window').width - 40}
        backgroundColor={primaryColor}
        onPress={handleRegister}
        isLoading={signUpIsPending}
        loadingText="Criando conta..."
        showLoadingIndicator
        disabled={signUpIsPending || !aceitouTermo || !termoQuery.data || termoQuery.isLoading}
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
  termSection: {
    width: "100%",
    gap: 6,
  },
  termLoadError: {
    gap: 8,
  },
  termRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  termCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#777",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    backgroundColor: "#fff",
  },
  termText: {
    color: "#333",
    fontSize: 13,
  },
  termLink: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  termHint: {
    color: "#777",
    fontSize: 12,
    marginLeft: 33,
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
