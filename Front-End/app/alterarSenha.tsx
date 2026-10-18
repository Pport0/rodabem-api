import Button from "@/shared/ui/base/button";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { alterarSenha } from "@/services/userService";
import { useToast } from "@/shared/ui/molecules/Toast";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

export default function AlterarSenha() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;
  const { show } = useToast();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => alterarSenha(senhaAtual, novaSenha),
    onSuccess: () => {
      show("Senha alterada com sucesso", { type: "success", backgroundColor: "#10B981" });
      router.back();
    },
    onError: () => show("Não foi possível alterar a senha. Verifique sua senha atual e tente novamente.", { type: "error", backgroundColor: "#bf0a30" }),
  });

  const submit = () => {
    if (!senhaAtual) return setError("Informe sua senha atual.");
    if (novaSenha.length < 6) return setError("A nova senha deve ter no mínimo 6 caracteres.");
    if (novaSenha !== confirmarSenha) return setError("As senhas não coincidem.");
    setError("");
    mutation.mutate();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>ALTERAR SENHA</Text>
      <Text style={styles.subtitle}>Confirme sua senha atual e escolha uma nova senha.</Text>
      <View style={styles.field}>
        <Text style={styles.label}>SENHA ATUAL</Text>
        <Input placeholder="Digite sua senha atual" value={senhaAtual} onChangeText={setSenhaAtual} type="password" />
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
      <Button
        height={56}
        width={Dimensions.get("window").width - 40}
        backgroundColor={primaryColor}
        onPress={submit}
        isLoading={mutation.isPending}
        disabled={mutation.isPending}
      >
        <Text style={styles.buttonText}>SALVAR NOVA SENHA</Text>
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
});
