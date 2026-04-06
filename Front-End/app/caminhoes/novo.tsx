import Input from "@/components/input";
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
import { Toast } from "@/shared/ui/molecules/Toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/utils/queryClient";
import { CreateCaminhaoDto } from "@/@types/caminhao";
import { createCaminhao } from "@/services/caminhaoService";

interface FormErrors {
  placa?: string;
  modelo?: string;
  renavam?: string;
}

export default function NovoCaminhao() {
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [renavam, setRenavam] = useState("");
  const [marca, setMarca] = useState("");
  const [cor, setCor] = useState("");
  const [anoFabricacao, setAnoFabricacao] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const createCaminhaoMutation = useMutation({
    mutationFn: (caminhao: CreateCaminhaoDto) => createCaminhao(caminhao),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['caminhao'] });  
        Toast.show('Caminhão cadastrado com sucesso', {
            type: 'success',
            backgroundColor: '#10B981',
        });
    },
    onError: () => {
        Toast.show('Erro ao cadastrar caminhão', {
            type: 'error',
            backgroundColor: '#E53E3E',
        });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!placa.trim() || placa.replace(/[^A-Z0-9]/g, "").length < 7)
      newErrors.placa = "Placa inválida (ex: ABC1234 ou ABC1D23)";
    if (!modelo.trim()) newErrors.modelo = "Modelo é obrigatório";
    if (!renavam.trim() || renavam.replace(/\D/g, "").length < 9)
      newErrors.renavam = "RENAVAM inválido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createCaminhaoMutation.mutate({
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      renavam: renavam.replace(/\D/g, ""),
      marca: marca.trim() || undefined,
      cor: cor.trim() || undefined,
      anoFabricacao: anoFabricacao ? Number(anoFabricacao) : undefined,
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
          <Text style={styles.title}>NOVO CAMINHÃO</Text>
          <Text style={styles.subtitle}>Preencha os dados do veículo</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.groupLabel}>DADOS OBRIGATÓRIOS</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>PLACA *</Text>
          <Input
            placeholder="ABC1234 ou ABC1D23"
            value={placa}
            onChangeText={(t) =>
              setPlaca(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))
            }
            autoCapitalize="characters"
          />
          {errors.placa && (
            <Text style={styles.errorText}>{errors.placa}</Text>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>MODELO *</Text>
          <Input
            placeholder="Ex: Scania R450"
            value={modelo}
            onChangeText={setModelo}
            autoCapitalize="words"
          />
          {errors.modelo && (
            <Text style={styles.errorText}>{errors.modelo}</Text>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>RENAVAM *</Text>
          <Input
            placeholder="000000000-0"
            value={renavam}
            onChangeText={(t) =>
              setRenavam(t.replace(/\D/g, "").slice(0, 11))
            }
            keyboardType="numeric"
          />
          {errors.renavam && (
            <Text style={styles.errorText}>{errors.renavam}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.groupLabel}>DADOS OPCIONAIS</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>MARCA</Text>
          <Input
            placeholder="Ex: Scania, Volvo, Mercedes"
            value={marca}
            onChangeText={setMarca}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>COR</Text>
          <Input
            placeholder="Ex: Branco, Vermelho"
            value={cor}
            onChangeText={setCor}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>ANO DE FABRICAÇÃO</Text>
          <Input
            placeholder="Ex: 2022"
            value={anoFabricacao}
            onChangeText={(t) =>
              setAnoFabricacao(t.replace(/\D/g, "").slice(0, 4))
            }
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, createCaminhaoMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createCaminhaoMutation.isPending}
          activeOpacity={0.85}
        >
          {createCaminhaoMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>CADASTRAR CAMINHÃO</Text>
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
  groupLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FC6A03",
    letterSpacing: 1,
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
