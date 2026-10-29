import { User } from "@/@types/user";
import Button from "@/shared/ui/base/button";
import Input from "@/components/input";
import { QueryErrorState } from "@/components/queryErrorState";
import colors from "@/constants/colors";
import { useUser } from "@/hooks/useUser";
import { getMeuPerfil, updateUser } from "@/services/userService";
import { useToast } from "@/shared/ui/molecules/Toast";
import { maskPhone } from "@/utils/maskPhone";
import { PerfilFormErrors, validatePerfil } from "@/utils/userValidation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || "rodabem_user";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return message[0];
    if (typeof message === "string" && message) return message;
  }
  return "Não foi possível atualizar seus dados. Tente novamente.";
}

export default function EditarPerfil() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;
  const { show } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const perfilQuery = useQuery<User | null>({
    queryKey: ["perfil"],
    queryFn: () => getMeuPerfil(),
  });
  const perfil = perfilQuery.data;

  const inicial = perfil ?? user;
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [telefone, setTelefone] = useState(maskPhone(inicial?.telefone ?? ""));
  const [errors, setErrors] = useState<PerfilFormErrors>({});

  // Se a API responder depois de a tela abrir com os dados do armazenamento, troca pelos dados da API uma unica vez,
  // e so se o usuario ainda nao comecou a digitar.
  const preenchidoPelaApi = useRef(!!perfil);
  const editado = useRef(false);
  const alterar = (setter: (valor: string) => void) => (valor: string) => {
    editado.current = true;
    setter(valor);
  };
  useEffect(() => {
    if (perfil && !preenchidoPelaApi.current && !editado.current) {
      preenchidoPelaApi.current = true;
      setNome(perfil.nome ?? "");
      setEmail(perfil.email ?? "");
      setTelefone(maskPhone(perfil.telefone ?? ""));
    }
  }, [perfil]);

  const mutation = useMutation({
    mutationFn: () => {
      const userId = perfil?.id ?? user?.id;
      if (!userId) throw new Error("ID do usuário não encontrado.");
      const telefoneDigits = telefone.replace(/\D/g, "");
      return updateUser(userId, {
        nome: nome.trim(),
        email: email.trim(),
        // null apaga o telefone; string vazia bateria no telefone unico do banco.
        telefone: telefoneDigits || null,
      });
    },
    onSuccess: async (atualizado) => {
      const dados = { nome: atualizado.nome, email: atualizado.email, telefone: atualizado.telefone ?? undefined };
      queryClient.setQueryData<User | null>(["perfil"], (anterior) => (anterior ? { ...anterior, ...dados } : anterior));
      // Home, menu e cabecalho leem o usuario do armazenamento seguro.
      await SecureStore.setItemAsync(CHAVE_USUARIO, JSON.stringify({ ...user, ...dados }));
      show("Dados atualizados com sucesso", { type: "success", backgroundColor: "#10B981" });
      router.back();
    },
    onError: (error: unknown) => show(getErrorMessage(error), { type: "error", backgroundColor: "#bf0a30" }),
  });

  const submit = () => {
    const newErrors = validatePerfil({ nome, email, telefone });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    mutation.mutate();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>EDITAR PERFIL</Text>
      <Text style={styles.subtitle}>Atualize seu nome, e-mail e telefone.</Text>
      {perfilQuery.isError && (
        <QueryErrorState
          compact
          message="Não foi possível atualizar seus dados do servidor. Você pode tentar novamente."
          onRetry={() => { void perfilQuery.refetch(); }}
        />
      )}
      <View style={styles.field}>
        <Text style={styles.label}>NOME COMPLETO*</Text>
        <Input placeholder="Digite seu nome completo" value={nome} onChangeText={alterar(setNome)} />
        {!!errors.nome && <Text style={styles.error}>{errors.nome}</Text>}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>EMAIL*</Text>
        <Input placeholder="Digite seu email" value={email} onChangeText={alterar(setEmail)}keyboardType="email-address" autoCapitalize="none" />
        {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>TELEFONE</Text>
        <Input placeholder="(00) 00000-0000" value={telefone} onChangeText={alterar((t) => setTelefone(maskPhone(t)))} keyboardType="numeric" />
        {!!errors.telefone && <Text style={styles.error}>{errors.telefone}</Text>}
      </View>
      <Button
        height={56}
        width={Dimensions.get("window").width - 40}
        backgroundColor={primaryColor}
        onPress={submit}
        isLoading={mutation.isPending}
        disabled={mutation.isPending}
      >
        <Text style={styles.buttonText}>SALVAR ALTERAÇÕES</Text>
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
