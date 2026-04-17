import { TipoCombustivel } from "@/@types/abastecimento";
import Input from "@/components/input";
import colors from "@/constants/colors";
import {
  createAbastecimento,
  getAbastecimento,
  updateAbastecimento,
} from "@/services/abastecimentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const fuelOptions: { value: TipoCombustivel; label: string }[] = [
  { value: "DIESEL_S10", label: "Diesel S10" },
  { value: "DIESEL_S500", label: "Diesel S500" },
  { value: "ARLA_32", label: "Arla 32" },
];

interface FormErrors {
  precoPorLitro?: string;
  totalLitros?: string;
  quilometragem?: string;
}

export default function NovoAbastecimento() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [precoPorLitro, setPrecoPorLitro] = useState("");
  const [totalLitros, setTotalLitros] = useState("");
  const [quilometragem, setQuilometragem] = useState("");
  const [tipoCombustivel, setTipoCombustivel] = useState<TipoCombustivel>("DIESEL_S10");
  const [localDescricao, setLocalDescricao] = useState("");
  const [postoIdentificado, setPostoIdentificado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const abastecimentoQuery = useQuery({
    queryKey: ["abastecimento", id],
    queryFn: () => getAbastecimento(Number(id)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (!abastecimentoQuery.data) return;

    setPrecoPorLitro(String(abastecimentoQuery.data.precoPorLitro));
    setTotalLitros(String(abastecimentoQuery.data.totalLitros));
    setQuilometragem(String(abastecimentoQuery.data.quilometragem));
    setTipoCombustivel(abastecimentoQuery.data.tipoCombustivel);
    setLocalDescricao(abastecimentoQuery.data.localDescricao ?? "");
    setPostoIdentificado(abastecimentoQuery.data.postoIdentificado ?? "");
    setObservacao(abastecimentoQuery.data.observacao ?? "");
  }, [abastecimentoQuery.data]);

  const totalPreview = useMemo(() => {
    const preco = Number(precoPorLitro.replace(",", "."));
    const litros = Number(totalLitros.replace(",", "."));
    if (!preco || !litros) return null;
    return preco * litros;
  }, [precoPorLitro, totalLitros]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        precoPorLitro: Number(precoPorLitro.replace(",", ".")),
        totalLitros: Number(totalLitros.replace(",", ".")),
        quilometragem: Number(quilometragem),
        tipoCombustivel,
        localDescricao: localDescricao.trim() || undefined,
        postoIdentificado: postoIdentificado.trim() || undefined,
        observacao: observacao.trim() || undefined,
      };

      if (isEditing && id) {
        return updateAbastecimento(Number(id), payload);
      }

      return createAbastecimento(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
      queryClient.invalidateQueries({ queryKey: ["media-consumo"] });
      Toast.show(
        isEditing ? "Abastecimento atualizado com sucesso." : "Abastecimento cadastrado com sucesso.",
        {
          type: "success",
          backgroundColor: "#10B981",
        }
      );
      router.back();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Nao foi possivel salvar o abastecimento.";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const validate = () => {
    const nextErrors: FormErrors = {};
    const preco = Number(precoPorLitro.replace(",", "."));
    const litros = Number(totalLitros.replace(",", "."));
    const km = Number(quilometragem);

    if (!preco || preco <= 0) nextErrors.precoPorLitro = "Informe um preco por litro valido.";
    if (!litros || litros <= 0) nextErrors.totalLitros = "Informe a quantidade de litros.";
    if (!km || km < 0) nextErrors.quilometragem = "Informe a quilometragem atual.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
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
          <Text style={styles.title}>
            {isEditing ? "EDITAR ABASTECIMENTO" : "NOVO ABASTECIMENTO"}
          </Text>
          <Text style={styles.subtitle}>
            Registre custo, litros e quilometragem do abastecimento.
          </Text>
        </View>

        {abastecimentoQuery.isLoading ? (
          <ActivityIndicator color={primaryColor} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.divider} />

            <Text style={[styles.groupLabel, { color: primaryColor }]}>TIPO DE COMBUSTIVEL</Text>
            <View style={styles.chipsRow}>
              {fuelOptions.map((option) => {
                const active = option.value === tipoCombustivel;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      active && { backgroundColor: primaryColor, borderColor: primaryColor },
                    ]}
                    onPress={() => setTipoCombustivel(option.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>PRECO POR LITRO *</Text>
              <Input
                placeholder="Ex: 6.39"
                value={precoPorLitro}
                onChangeText={(text) => setPrecoPorLitro(text.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
              />
              {errors.precoPorLitro && <Text style={styles.errorText}>{errors.precoPorLitro}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>TOTAL DE LITROS *</Text>
              <Input
                placeholder="Ex: 320"
                value={totalLitros}
                onChangeText={(text) => setTotalLitros(text.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
              />
              {errors.totalLitros && <Text style={styles.errorText}>{errors.totalLitros}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>QUILOMETRAGEM *</Text>
              <Input
                placeholder="Ex: 182350"
                value={quilometragem}
                onChangeText={(text) => setQuilometragem(text.replace(/\D/g, ""))}
                keyboardType="numeric"
              />
              {errors.quilometragem && <Text style={styles.errorText}>{errors.quilometragem}</Text>}
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>VALOR TOTAL ESTIMADO</Text>
              <Text style={[styles.previewValue, { color: primaryColor }]}>
                {totalPreview
                  ? totalPreview.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "Preencha preco e litros"}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={[styles.groupLabel, { color: primaryColor }]}>DETALHES OPCIONAIS</Text>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>POSTO</Text>
              <Input
                placeholder="Ex: Posto Rota Norte"
                value={postoIdentificado}
                onChangeText={setPostoIdentificado}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>LOCAL</Text>
              <Input
                placeholder="Ex: BR-116, km 245"
                value={localDescricao}
                onChangeText={setLocalDescricao}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>OBSERVACAO</Text>
              <Input
                placeholder="Informacoes adicionais"
                value={observacao}
                onChangeText={setObservacao}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: primaryColor },
                mutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
              activeOpacity={0.85}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? "SALVAR ALTERACOES" : "CADASTRAR ABASTECIMENTO"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
  },
  divider: {
    height: 1,
    backgroundColor: "#ececec",
    marginVertical: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  chipText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.4,
  },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
  },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#efefef",
    gap: 6,
  },
  previewLabel: {
    fontSize: 11,
    color: "#8a8a8a",
    fontWeight: "700",
    letterSpacing: 1,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  submitButton: {
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
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
