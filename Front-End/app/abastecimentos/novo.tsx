import { TipoCombustivel } from "@/@types/abastecimento";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { StatusLocalizacao, useLocalizacaoAtual } from "@/hooks/useLocalizacaoAtual";
import {
  createAbastecimento,
  getAbastecimento,
  updateAbastecimento,
  scanHodometro,
  getPostosProximos,
} from "@/services/abastecimentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { pickScanFile } from "@/utils/scanFile";
import Ionicons from "@expo/vector-icons/Ionicons";
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

const textoLocalizacao: Partial<Record<StatusLocalizacao, string>> = {
  buscando: "Obtendo a localização do aparelho...",
  capturada: "Localização registrada com o abastecimento.",
  negada: "Localização não autorizada. O abastecimento será salvo sem ela.",
  indisponivel: "Localização indisponível. O abastecimento será salvo sem ela.",
};

const MENSAGEM_FALHA_POSTOS = "Não foi possível buscar postos próximos agora.";

function parsePtBrNumber(value: string): number {
  const normalized = value.trim();
  if (!normalized) return Number.NaN;
  return Number(normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized);
}

export default function NovoAbastecimento() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [precoPorLitro, setPrecoPorLitro] = useState("");
  const [totalLitros, setTotalLitros] = useState("");
  const [quilometragem, setQuilometragem] = useState("");
  const [lendoHodometro, setLendoHodometro] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [tipoCombustivel, setTipoCombustivel] = useState<TipoCombustivel>("DIESEL_S10");
  const [localDescricao, setLocalDescricao] = useState("");
  const [postoIdentificado, setPostoIdentificado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  // So no cadastro: na edicao, a posicao atual nao e onde o abastecimento aconteceu.
  const localizacao = useLocalizacaoAtual(!isEditing);

  // Sugestao de posto (#30): so com a posicao em maos; a falha nunca bloqueia o cadastro.
  const postosQuery = useQuery({
    queryKey: ["postos-proximos", localizacao.coordenadas?.latitude, localizacao.coordenadas?.longitude],
    queryFn: () => getPostosProximos(localizacao.coordenadas!),
    enabled: !isEditing && !!localizacao.coordenadas,
    retry: false,
  });
  const postosSugeridos = postosQuery.data?.postos ?? [];
  const mensagemPostos = postosQuery.isError
    ? MENSAGEM_FALHA_POSTOS
    : postosQuery.data?.mensagem ?? null;

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
    const preco = parsePtBrNumber(precoPorLitro);
    const litros = parsePtBrNumber(totalLitros);
    if (!preco || !litros) return null;
    return preco * litros;
  }, [precoPorLitro, totalLitros]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        precoPorLitro: parsePtBrNumber(precoPorLitro),
        totalLitros: parsePtBrNumber(totalLitros),
        quilometragem: Number(quilometragem),
        tipoCombustivel,
        localDescricao: localDescricao.trim() || undefined,
        postoIdentificado: postoIdentificado.trim() || undefined,
        observacao: observacao.trim() || undefined,
        ...(!isEditing && localizacao.coordenadas ? localizacao.coordenadas : {}),
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
    const preco = parsePtBrNumber(precoPorLitro);
    const litros = parsePtBrNumber(totalLitros);
    const km = Number(quilometragem);

    if (!preco || preco <= 0) nextErrors.precoPorLitro = "Informe um preco por litro valido.";
    if (!litros || litros <= 0) nextErrors.totalLitros = "Informe a quantidade de litros.";
    if (!quilometragem.trim() || Number.isNaN(km) || km < 0) {
      nextErrors.quilometragem = "Informe a quilometragem atual.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  // OCR e so apoio (#31): preenche o campo para revisao, nunca salva direto.
  const lerHodometro = async () => {
    try {
      const file = await pickScanFile("camera", "hodometro");
      if (!file) return;

      setLendoHodometro(true);
      const result = await scanHodometro(file);
      if (result.quilometragem !== null) {
        setQuilometragem(String(Math.round(result.quilometragem)));
      }
      setScanMessage(`${result.mensagem} | Confianca: ${result.confianca.toUpperCase()}`);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Nao foi possivel ler o hodometro. Digite a quilometragem.";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    } finally {
      setLendoHodometro(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
                placeholder="Ex: 6,39"
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
              <View style={styles.kmRow}>
                <View style={styles.flex1}>
                  <Input
                    placeholder="Ex: 182350"
                    value={quilometragem}
                    onChangeText={(text) => setQuilometragem(text.replace(/\D/g, ""))}
                    keyboardType="numeric"
                  />
                </View>
                {!isEditing && (
                  <TouchableOpacity
                    style={[styles.scanButton, { backgroundColor: primaryColor }]}
                    onPress={lerHodometro}
                    disabled={lendoHodometro}
                    activeOpacity={0.85}
                    accessibilityLabel="Ler hodômetro"
                  >
                    {lendoHodometro ? (
                      <ActivityIndicator color="#fff" testID="lendo-hodometro" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={18} color="#fff" />
                        <Text style={styles.scanButtonText}>Ler hodômetro</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {!!scanMessage && <Text style={styles.scanText}>{scanMessage}</Text>}
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
              {textoLocalizacao[localizacao.status] && (
                <Text style={styles.locationText}>{textoLocalizacao[localizacao.status]}</Text>
              )}
              {postosQuery.isFetching && (
                <Text style={styles.locationText}>Buscando postos próximos...</Text>
              )}
              {postosSugeridos.length > 0 && (
                <View style={styles.postosContainer}>
                  <Text style={styles.locationText}>Postos perto de você (toque para preencher):</Text>
                  <View style={styles.chipsRow}>
                    {postosSugeridos.map((posto) => {
                      const ativo = posto.nome === postoIdentificado;
                      return (
                        <TouchableOpacity
                          key={`${posto.nome}-${posto.distanciaMetros}`}
                          style={[
                            styles.chip,
                            ativo && { backgroundColor: primaryColor, borderColor: primaryColor },
                          ]}
                          onPress={() => setPostoIdentificado(posto.nome)}
                          activeOpacity={0.85}
                          accessibilityLabel={`Usar ${posto.nome}`}
                        >
                          <Text style={[styles.chipText, ativo && styles.chipTextActive]}>
                            {posto.nome} · {posto.distanciaMetros.toLocaleString("pt-BR")} m
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              {!postosQuery.isFetching && !!mensagemPostos && (
                <Text style={styles.locationText}>{mensagemPostos}</Text>
              )}
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

            <View style={styles.bottomSpacer} />
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
    paddingBottom: 120,
    gap: 16,
    flexGrow: 1,
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
  locationText: {
    fontSize: 12,
    color: "#888",
  },
  postosContainer: {
    gap: 8,
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
  bottomSpacer: {
    height: 32,
  },
  kmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 52,
    minWidth: 150,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  scanText: {
    fontSize: 12,
    color: "#666",
  },
});
