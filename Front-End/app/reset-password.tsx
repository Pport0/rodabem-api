import Button from "@/shared/ui/base/button";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { resetPassword } from "@/services/authService";
import { useToast } from "@/shared/ui/molecules/Toast";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";

const MENSAGEM_TOKEN_INVALIDO = "Token inválido ou expirado.";

// Aceita o codigo puro ou o link inteiro do e-mail colado no campo.
function extrairToken(valor: string): string {
  const texto = valor.trim();
  const match = texto.match(/[?&]token=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]) : texto;
}

function getApiMessage(error: unknown): string | undefined {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return message[0];
    if (typeof message === "string" && message) return message;
  }
  return undefined;
}

// Rota /reset-password: e o caminho do link que o back envia (rodabem://reset-password?token=...).
export default function ResetPassword() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;
  const { show } = useToast();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [tokenInvalido, setTokenInvalido] = useState(false);

  // Abrir outro link com a tela ja aberta troca o codigo.
  useEffect(() => {
    if (params.token) setToken(params.token);
  }, [params.token]);

  const mutation = useMutation({
    mutationFn: () => resetPassword(extrairToken(token), novaSenha),
    onSuccess: ({ message }) => {
      show(message, { type: "success", backgroundColor: "#10B981" });
      router.replace("/login");
    },
    onError: (e: unknown) => {
      const message = getApiMessage(e);
      if (message === MENSAGEM_TOKEN_INVALIDO) {
        setTokenInvalido(true);
        return;
      }
      setError(message ?? "Não foi possível redefinir a senha. Verifique sua conexão e tente novamente.");
    },
  });

  const submit = () => {
    setTokenInvalido(false);
    if (!extrairToken(token)) return setError("Informe o código recebido por e-mail.");
    if (novaSenha.length < 6) return setError("A nova senha deve ter no mínimo 6 caracteres.");
    if (novaSenha !== confirmarSenha) return setError("As senhas não coincidem.");
    setError("");
    mutation.mutate();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>REDEFINIR SENHA</Text>
      <Text style={styles.subtitle}>Cole o código que enviamos por e-mail e escolha uma nova senha.</Text>
      <View style={styles.field}>
        <Text style={styles.label}>CÓDIGO</Text>
        <Input placeholder="Cole aqui o código do e-mail" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>NOVA SENHA</Text>
        <Input placeholder="Digite a nova senha" value={novaSenha} onChangeText={setNovaSenha} type="password" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>CONFIRME A NOVA SENHA</Text>
        <Input placeholder="Confirme a nova senha" value={confirmarSenha} onChangeText={setConfirmarSenha} type="password" />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {tokenInvalido && (
        <View style={styles.invalidBox}>
          <Text style={styles.invalidText}>
            Este código é inválido ou já expirou. Cada código vale por 30 minutos e só pode ser usado uma vez.
          </Text>
          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: primaryColor }]}
            onPress={() => router.replace("/forgotPassword")}
            activeOpacity={0.85}
          >
            <Text style={[styles.outlineButtonText, { color: primaryColor }]}>PEDIR NOVO E-MAIL</Text>
          </TouchableOpacity>
        </View>
      )}
      <Button
        height={56}
        width={Dimensions.get("window").width - 40}
        backgroundColor={primaryColor}
        onPress={submit}
        isLoading={mutation.isPending}
        disabled={mutation.isPending}
      >
        <Text style={styles.buttonText}>REDEFINIR SENHA</Text>
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 20 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#222" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center" },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 },
  error: { fontSize: 13, color: "#E53E3E" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 },
  invalidBox: { gap: 12, padding: 16, borderRadius: 14, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  invalidText: { fontSize: 14, color: "#991B1B", textAlign: "center" },
  outlineButton: { borderWidth: 1.5, borderRadius: 14, height: 52, justifyContent: "center", alignItems: "center" },
  outlineButtonText: { fontWeight: "bold", fontSize: 14, letterSpacing: 0.5 },
});
