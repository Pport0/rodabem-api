import Button from "@/shared/ui/base/button";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { forgotPassword } from "@/services/authService";
import { validateEmail } from "@/utils/userValidation";
import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return message[0];
    if (typeof message === "string" && message) return message;
  }
  return "Não foi possível enviar agora. Verifique sua conexão e tente novamente.";
}

// Sem useMutation nem Toast de proposito: a tela e aberta antes do login e e testada isolada (abertura.test.tsx).
export default function ForgotPassword() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagemEnviada, setMensagemEnviada] = useState("");

  const submit = async () => {
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    setError("");
    setEnviando(true);
    try {
      const { message } = await forgotPassword(email.trim());
      setMensagemEnviada(message);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Esqueci minha senha</Text>
      <Text style={styles.subtitle}>
        Informe o e-mail da sua conta. Enviaremos um link e um código para você criar uma nova senha.
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>E-MAIL</Text>
        <Input
          placeholder="Digite o e-mail cadastrado"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button
        height={56}
        width={Dimensions.get("window").width - 40}
        backgroundColor={primaryColor}
        onPress={submit}
        isLoading={enviando}
        disabled={enviando}
      >
        <Text style={styles.buttonText}>{mensagemEnviada ? "ENVIAR NOVAMENTE" : "ENVIAR"}</Text>
      </Button>
      {!!mensagemEnviada && (
        <View style={styles.sentBox}>
          <Text style={styles.sentText}>{mensagemEnviada}</Text>
          <Text style={styles.hint}>O link e o código valem por 30 minutos. Confira também a caixa de spam.</Text>
          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: primaryColor }]}
            onPress={() => router.push("/reset-password" as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.outlineButtonText, { color: primaryColor }]}>JÁ TENHO O CÓDIGO</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 20 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#222", textTransform: "uppercase" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center" },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 },
  error: { fontSize: 13, color: "#E53E3E" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 },
  sentBox: { gap: 12, padding: 16, borderRadius: 14, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" },
  sentText: { fontSize: 15, color: "#166534", textAlign: "center" },
  hint: { fontSize: 13, color: "#666", textAlign: "center" },
  outlineButton: { borderWidth: 1.5, borderRadius: 14, height: 52, justifyContent: "center", alignItems: "center" },
  outlineButtonText: { fontWeight: "bold", fontSize: 14, letterSpacing: 0.5 },
});
