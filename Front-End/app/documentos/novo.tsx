import { CreateDocumentoDto } from "@/@types/documento";
import { DateField } from "@/components/dateField";
import Input from "@/components/input";
import colors from "@/constants/colors";
import { getMeuCaminhao } from "@/services/caminhaoService";
import { createDocumento, scanDocumento } from "@/services/documentoService";
import { Toast } from "@/shared/ui/molecules/Toast";
import { queryClient } from "@/utils/queryClient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

interface FormErrors {
  nome?: string;
  numero?: string;
  dataEmissao?: string;
  dataVencimento?: string;
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

function parseOCRDate(value?: string | null) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function NovoDocumento() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? "light"].primary;

  const { caminhaoId } = useLocalSearchParams<{ caminhaoId?: string }>();
  const { data: meuCaminhao } = useQuery({
    queryKey: ["caminhao"],
    queryFn: getMeuCaminhao,
  });

  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const [dataEmissao, setDataEmissao] = useState<Date | null>(null);
  const [dataVencimento, setDataVencimento] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanConfidence, setScanConfidence] = useState<"alta" | "media" | "baixa" | "">("");
  const [vincularAoCaminhao, setVincularAoCaminhao] = useState(Boolean(caminhaoId || meuCaminhao?.id));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (caminhaoId) setVincularAoCaminhao(true);
  }, [caminhaoId]);

  useEffect(() => {
    if (meuCaminhao?.id && !caminhaoId) {
      setVincularAoCaminhao(true);
    }
  }, [meuCaminhao?.id, caminhaoId]);

  const scanStatusText = useMemo(() => {
    if (!scanMessage) return "";
    return scanConfidence
      ? `${scanMessage} | Confianca: ${scanConfidence.toUpperCase()}`
      : scanMessage;
  }, [scanConfidence, scanMessage]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateDocumentoDto) => createDocumento({ ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      Toast.show("Documento cadastrado com sucesso!", {
        type: "success",
        backgroundColor: "#10B981",
      });
      router.back();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Erro ao cadastrar documento";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nome.trim()) newErrors.nome = "Nome do documento e obrigatorio";
    if (!numero.trim()) newErrors.numero = "Numero e obrigatorio";
    if (!dataEmissao) newErrors.dataEmissao = "Data de emissao obrigatoria";
    if (!dataVencimento) {
      newErrors.dataVencimento = "Data de vencimento obrigatoria";
    }
    if (dataEmissao && dataVencimento && dataVencimento < dataEmissao) {
      newErrors.dataVencimento =
        "A data de vencimento nao pode ser anterior a emissao";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const applyScanResult = (
    result: Awaited<ReturnType<typeof scanDocumento>>
  ) => {
    const dados = result.dadosExtraidos;

    if (dados.nome) setNome(dados.nome);
    if (dados.numero) setNumero(dados.numero);
    if (dados.dataEmissao) setDataEmissao(parseOCRDate(dados.dataEmissao));
    if (dados.dataVencimento) setDataVencimento(parseOCRDate(dados.dataVencimento));
    if (dados.observacao) setObservacao(dados.observacao);
    setArquivoUrl(result.arquivoUrl);
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
        name = normalizeFileName(asset.fileName, `documento-${Date.now()}.jpg`);
        type = resolveMimeType(name, asset.mimeType);
      } else if (source === "library") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
        });

        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        uri = asset.uri;
        name = normalizeFileName(asset.fileName, `documento-${Date.now()}.jpg`);
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
        name = normalizeFileName(asset.name, `documento-${Date.now()}`);
        type = resolveMimeType(name, asset.mimeType);
      }

      const response = await scanDocumento({ uri, name, type });
      applyScanResult(response);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao executar o scan do documento";
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: "error",
        backgroundColor: "#E53E3E",
      });
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const resolvedCaminhaoId = vincularAoCaminhao
      ? Number(caminhaoId || meuCaminhao?.id || 0) || undefined
      : undefined;

    mutate({
      nome: nome.trim(),
      numero: numero.trim(),
      dataEmissao: dataEmissao!.toISOString(),
      dataVencimento: dataVencimento!.toISOString(),
      observacao: observacao.trim() || undefined,
      arquivoUrl: arquivoUrl || undefined,
      caminhaoId: resolvedCaminhaoId,
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
        <View style={styles.heroCard}>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>SCAN DO DOCUMENTO</Text>
            <Text style={styles.heroTitle}>
              Envie a foto ou PDF e preencha o documento automaticamente.
            </Text>
            <Text style={styles.heroSubtitle}>
              O OCR tenta extrair nome, numero e datas para acelerar o cadastro.
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
            {!!arquivoUrl && (
              <Text style={styles.scanCardMeta} numberOfLines={2}>
                Arquivo enviado: {arquivoUrl}
              </Text>
            )}
          </View>
        )}

        {!!meuCaminhao?.id && (
          <View style={styles.linkCard}>
            <View style={styles.linkCardText}>
              <Text style={styles.linkCardTitle}>Vincular ao meu caminhão</Text>
              <Text style={styles.linkCardSubtitle}>
                {caminhaoId
                  ? "Este documento sera vinculado ao caminhão selecionado."
                  : "Se ligado, o documento entra no contexto do caminhão atual."}
              </Text>
            </View>
            <Switch
              value={vincularAoCaminhao}
              onValueChange={setVincularAoCaminhao}
              trackColor={{ false: "#ddd", true: "#f5b08c" }}
              thumbColor={vincularAoCaminhao ? primaryColor : "#fff"}
            />
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.titleContainer}>
          <Text style={styles.title}>NOVO DOCUMENTO</Text>
          <Text style={styles.subtitle}>
            {vincularAoCaminhao
              ? "Preencha os dados do documento do caminhão"
              : "Preencha os dados do documento do motorista"}
          </Text>
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
          <Text style={styles.label}>NUMERO *</Text>
          <Input
            placeholder="Numero do documento"
            value={numero}
            onChangeText={setNumero}
          />
          {errors.numero && <Text style={styles.errorText}>{errors.numero}</Text>}
        </View>

        <View style={styles.row}>
          <View style={styles.flexField}>
            <DateField
              label="DATA DE EMISSAO *"
              value={dataEmissao}
              onChange={setDataEmissao}
              error={errors.dataEmissao}
            />
          </View>
          <View style={styles.flexField}>
            <DateField
              label="DATA DE VENCIMENTO *"
              value={dataVencimento}
              onChange={setDataVencimento}
              error={errors.dataVencimento}
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>OBSERVACAO</Text>
          <Input
            placeholder="Observacoes adicionais (opcional)"
            value={observacao}
            onChangeText={setObservacao}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: primaryColor },
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
  linkCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ececec",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkCardText: {
    flex: 1,
    gap: 4,
  },
  linkCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  linkCardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flexField: {
    flex: 1,
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
