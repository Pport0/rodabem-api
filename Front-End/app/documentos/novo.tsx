import Input from "@/components/input";
import { useToast } from "@/shared/ui/molecules/Toast";
import { CreateDocumentoDto } from "@/@types/documento";
import { createDocumento } from "@/services/documentoService";
import { queryClient } from "@/utils/queryClient";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DateField } from "@/components/dateField";

interface FormErrors {
  nome?: string;
  numero?: string;
  dataEmissao?: string;
  dataVencimento?: string;
}

export default function NovoDocumento() {
  const { caminhaoId } = useLocalSearchParams<{ caminhaoId: string }>();
  const { show } = useToast();

  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const [dataEmissao, setDataEmissao] = useState<Date | null>(null);
  const [dataVencimento, setDataVencimento] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateDocumentoDto) => createDocumento({...data}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      show("Documento cadastrado com sucesso!", {
        type: "success",
        backgroundColor: "#10B981",
      });
      router.back();
    },
    onError: () => {
      show("Erro ao cadastrar documento", {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!nome.trim()) newErrors.nome = "Nome do documento é obrigatório";
    if (!numero.trim()) newErrors.numero = "Número é obrigatório";
    if (!dataEmissao) newErrors.dataEmissao = "Data de emissão obrigatória";
    if (!dataVencimento) newErrors.dataVencimento = "Data de vencimento obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutate({
      nome: nome.trim(),
      numero: numero.trim(),
      dataEmissao: dataEmissao!.toISOString(),
      dataVencimento: dataVencimento!.toISOString(),
      observacao: observacao.trim() || undefined,
      caminhaoId: caminhaoId ? Number(caminhaoId) : undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>NOVO DOCUMENTO</Text>
          <Text style={styles.subtitle}>Preencha os dados do documento</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>NOME DO DOCUMENTO *</Text>
          <Input
            placeholder="Ex: CRLV, CNH, Seguro"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />
          {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>NÚMERO *</Text>
          <Input
            placeholder="Número do documento"
            value={numero}
            onChangeText={setNumero}
          />
          {errors.numero && (
            <Text style={styles.errorText}>{errors.numero}</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <DateField
              label="DATA DE EMISSÃO *"
              value={dataEmissao}
              onChange={setDataEmissao}
              error={errors.dataEmissao}
            />
          </View>
          <View style={styles.flex}>
            <DateField
              label="DATA DE VENCIMENTO *"
              value={dataVencimento}
              onChange={setDataVencimento}
              error={errors.dataVencimento}
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>OBSERVAÇÃO</Text>
          <Input
            placeholder="Observações adicionais (opcional)"
            value={observacao}
            onChangeText={setObservacao}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            isPending && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>CADASTRAR DOCUMENTO</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  titleContainer: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 0.4,
  },
  fieldContainer: {
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  submitButton: {
    backgroundColor: "#FC6A03",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
