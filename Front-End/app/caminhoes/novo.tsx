import { CreateCaminhaoDto } from "@/@types/caminhao";
import Input from "@/components/input";
import colors from "@/constants/colors";
import {
  createCaminhao,
  getMeuCaminhao,
  scanCaminhao,
  updateCaminhao,
} from "@/services/caminhaoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
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

interface FormErrors {
  placa?: string;
  modelo?: string;
  renavam?: string;
  numeroEixos?: string;
}

function cleanNumber(value: string) {
  return value.replace(/\D/g, "");
}

function resolveMimeType(fileName: string, mimeType?: string | null) {
  if (mimeType) return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

function normalizeFileName(name?: string | null, fallback = "scan.jpg") {
  return name?.trim() || fallback;
}

export default function NovoCaminhao() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;

  const { data: existingCaminhao, isLoading: isLoadingCaminhao } = useQuery({
    queryKey: ["caminhao"],
    queryFn: getMeuCaminhao,
  });

  const isEditing = Boolean(existingCaminhao);

  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [renavam, setRenavam] = useState("");
  const [marca, setMarca] = useState("");
  const [cor, setCor] = useState("");
  const [anoFabricacao, setAnoFabricacao] = useState("");
  const [numeroEixos, setNumeroEixos] = useState("");
  const [crv, setCrv] = useState("");
  const [especieTipo, setEspecieTipo] = useState("");
  const [chassi, setChassi] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanConfidence, setScanConfidence] = useState<"alta" | "media" | "baixa" | "">("");
  const [scanArquivoUrl, setScanArquivoUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const scanStatusText = useMemo(() => {
    if (!scanMessage) return "";
    return scanConfidence
      ? `${scanMessage} | Confianca: ${scanConfidence.toUpperCase()}`
      : scanMessage;
  }, [scanConfidence, scanMessage]);

  useEffect(() => {
    if (!existingCaminhao) return;

    setPlaca(existingCaminhao.placa ?? "");
    setModelo(existingCaminhao.modelo ?? "");
    setRenavam(existingCaminhao.renavam ?? "");
    setMarca(existingCaminhao.marca ?? "");
    setCor(existingCaminhao.cor ?? "");
    setAnoFabricacao(
      existingCaminhao.anoFabricacao ? String(existingCaminhao.anoFabricacao) : ""
    );
    setNumeroEixos(
      existingCaminhao.numeroEixos ? String(existingCaminhao.numeroEixos) : ""
    );
  }, [existingCaminhao]);

  const createCaminhaoMutation = useMutation({
    mutationFn: (caminhao: CreateCaminhaoDto) => createCaminhao(caminhao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caminhao"] });
      Toast.show("Caminhao cadastrado com sucesso", {
        type: "success",
        backgroundColor: "#10B981",
      });
      router.back();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Erro ao cadastrar caminhao";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const updateCaminhaoMutation = useMutation({
    mutationFn: (caminhao: CreateCaminhaoDto) => updateCaminhao(caminhao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caminhao"] });
      Toast.show("Caminhao atualizado com sucesso", {
        type: "success",
        backgroundColor: "#10B981",
      });
      router.back();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Erro ao atualizar caminhao";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const numeroEixosValue = Number(numeroEixos);

    if (!placa.trim() || placa.replace(/[^A-Z0-9]/g, "").length < 7) {
      newErrors.placa = "Placa invalida (ex: ABC1234 ou ABC1D23)";
    }
    if (!modelo.trim()) newErrors.modelo = "Modelo e obrigatorio";
    if (!renavam.trim() || renavam.replace(/\D/g, "").length < 9) {
      newErrors.renavam = "RENAVAM invalido";
    }
    if (!numeroEixos.trim()) {
      newErrors.numeroEixos = "Numero de eixos e obrigatorio";
    } else if (!Number.isInteger(numeroEixosValue) || numeroEixosValue < 2) {
      newErrors.numeroEixos = "Informe um numero de eixos valido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const applyScanResult = (result: Awaited<ReturnType<typeof scanCaminhao>>) => {
    const dados = result.dadosExtraidos;
    if (dados.placa) setPlaca(dados.placa.toUpperCase());
    if (dados.modelo) setModelo(dados.modelo);
    if (dados.renavam) setRenavam(dados.renavam);
    if (dados.marca) setMarca(dados.marca);
    if (dados.cor) setCor(dados.cor);
    if (dados.anoFabricacao) setAnoFabricacao(String(dados.anoFabricacao));
    if (dados.especieTipo) setEspecieTipo(dados.especieTipo);
    if (dados.chassi) setChassi(dados.chassi);

    setScanArquivoUrl(result.arquivoUrl);
    setScanConfidence(result.confianca);
    setScanMessage(result.mensagem);
    setErrors({});

    const missing = result.camposObrigatoriosFaltando?.length
      ? `Campos faltando: ${result.camposObrigatoriosFaltando.join(", ")}`
      : "Tudo pronto para revisar e salvar.";

    Toast.show(missing, {
      type: result.camposObrigatoriosFaltando?.length ? "warning" : "success",
      backgroundColor: result.camposObrigatoriosFaltando?.length ? "#D97706" : "#10B981",
    });
  };

  const pickFileAndScan = async (source: "camera" | "library" | "document") => {
    try {
      let uri = "";
      let name = "";
      let type = "";

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Toast.show("Permissao de camera negada", {
            type: "error",
            backgroundColor: "#E53E3E",
          });
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
        });

        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        uri = asset.uri;
        name = normalizeFileName(asset.fileName, `caminhao-${Date.now()}.jpg`);
        type = resolveMimeType(name, asset.mimeType);
      } else if (source === "library") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
        });

        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        uri = asset.uri;
        name = normalizeFileName(asset.fileName, `caminhao-${Date.now()}.jpg`);
        type = resolveMimeType(name, asset.mimeType);
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["application/pdf", "image/*"],
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        uri = asset.uri;
        name = normalizeFileName(asset.name, `caminhao-${Date.now()}`);
        type = resolveMimeType(name, asset.mimeType);
      }

      const response = await scanCaminhao({ uri, name, type });
      applyScanResult(response);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao executar o scan do caminhão";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: CreateCaminhaoDto = {
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      renavam: cleanNumber(renavam),
      marca: marca.trim() || undefined,
      cor: cor.trim() || undefined,
      anoFabricacao: anoFabricacao ? Number(anoFabricacao) : undefined,
      numeroEixos: numeroEixos ? Number(numeroEixos) : undefined,
      crv: crv.trim() || undefined,
      especieTipo: especieTipo.trim() || undefined,
      chassi: chassi.trim() || undefined,
    };

    if (isEditing) {
      updateCaminhaoMutation.mutate(payload);
      return;
    }

    createCaminhaoMutation.mutate(payload);
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
        {isLoadingCaminhao ? (
          <ActivityIndicator color={primaryColor} style={{ marginTop: 24 }} />
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>
              {isEditing ? "EDITAR CAMINHAO" : "SCAN DO CAMINHAO"}
            </Text>
            <Text style={styles.heroTitle}>
              {isEditing
                ? "Revise os dados extraidos e salve as alteracoes."
                : "Envie a foto ou PDF e preencha o cadastro automaticamente."}
            </Text>
            <Text style={styles.heroSubtitle}>
              O OCR tenta extrair placa, RENAVAM, marca, ano e chassi para acelerar o cadastro.
            </Text>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: primaryColor }]}>
            <Ionicons name="scan-outline" size={26} color="#fff" />
          </View>
        </View>

        <View style={styles.scanActions}>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: primaryColor }]}
            onPress={() => pickFileAndScan("camera")}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.scanButtonText}>Escanear camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => pickFileAndScan("document")}
            activeOpacity={0.85}
          >
            <Ionicons name="document-attach-outline" size={18} color={primaryColor} />
            <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>
              PDF ou imagem
            </Text>
          </TouchableOpacity>
        </View>

        {!!scanStatusText && (
          <View style={styles.scanCard}>
            <Text style={styles.scanCardLabel}>Resultado do scan</Text>
            <Text style={styles.scanCardText}>{scanStatusText}</Text>
            {!!scanArquivoUrl && (
              <Text style={styles.scanCardMeta} numberOfLines={2}>
                Arquivo enviado: {scanArquivoUrl}
              </Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        <Text style={[styles.groupLabel, { color: primaryColor }]}>DADOS OBRIGATORIOS</Text>

        <View style={styles.fieldContainer}>
            <Text style={styles.label}>PLACA *</Text>
          <Input
            placeholder="ABC1234 ou ABC1D23"
            value={placa}
            onChangeText={(text) =>
              setPlaca(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))
            }
            autoCapitalize="characters"
          />
            {errors.placa && <Text style={styles.errorText}>{errors.placa}</Text>}
          </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>MODELO *</Text>
          <Input
            placeholder="Ex: Scania R450"
            value={modelo}
            onChangeText={setModelo}
            autoCapitalize="words"
          />
          {errors.modelo && <Text style={styles.errorText}>{errors.modelo}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>RENAVAM *</Text>
          <Input
            placeholder="00000000000"
            value={renavam}
            onChangeText={(text) => setRenavam(cleanNumber(text).slice(0, 11))}
            keyboardType="numeric"
          />
          {errors.renavam && <Text style={styles.errorText}>{errors.renavam}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>NUMERO DE EIXOS *</Text>
          <Input
            placeholder="Ex: 6"
            value={numeroEixos}
            onChangeText={(text) => setNumeroEixos(cleanNumber(text).slice(0, 1))}
            keyboardType="numeric"
          />
          {errors.numeroEixos && <Text style={styles.errorText}>{errors.numeroEixos}</Text>}
        </View>

        <View style={styles.divider} />

        <Text style={[styles.groupLabel, { color: primaryColor }]}>DADOS OPCIONAIS</Text>

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
          <Text style={styles.label}>ANO DE FABRICACAO</Text>
          <Input
            placeholder="Ex: 2022"
            value={anoFabricacao}
            onChangeText={(text) => setAnoFabricacao(cleanNumber(text).slice(0, 4))}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.flexField}>
            <Text style={styles.label}>CRV</Text>
            <Input placeholder="Opcional" value={crv} onChangeText={setCrv} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexField}>
            <Text style={styles.label}>ESPECIE/TIPO</Text>
            <Input
              placeholder="Ex: Carga"
              value={especieTipo}
              onChangeText={setEspecieTipo}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexField}>
            <Text style={styles.label}>CHASSI</Text>
            <Input
              placeholder="Numero do chassi"
              value={chassi}
              onChangeText={setChassi}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: primaryColor },
            (createCaminhaoMutation.isPending || updateCaminhaoMutation.isPending) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createCaminhaoMutation.isPending || updateCaminhaoMutation.isPending}
          activeOpacity={0.85}
        >
          {createCaminhaoMutation.isPending || updateCaminhaoMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? "SALVAR ALTERACOES" : "CADASTRAR CAMINHAO"}
            </Text>
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
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ececec",
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#D97706",
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  scanActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    flex: 1,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#fff",
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  scanCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ececec",
    gap: 6,
  },
  scanCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scanCardText: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },
  scanCardMeta: {
    fontSize: 12,
    color: "#8a8a8a",
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
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.4,
  },
  fieldContainer: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flexField: {
    flex: 1,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#E53E3E",
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
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
