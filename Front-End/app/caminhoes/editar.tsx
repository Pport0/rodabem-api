import ScaledText from '@/components/scaledText';
import { Caminhao, UpdateCaminhaoDto } from '@/@types/caminhao';
import Input from '@/components/input';
import { QueryErrorState } from '@/components/queryErrorState';
import colors from '@/constants/colors';
import { getMeuCaminhao, updateCaminhao, deleteCaminhao } from '@/services/caminhaoService';
import { Toast } from '@/shared/ui/molecules/Toast';
import { CaminhaoFormErrors, validateCaminhao } from '@/utils/caminhaoValidation';
import { queryClient } from '@/utils/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === 'string') return message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export default function EditarCaminhao() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [renavam, setRenavam] = useState('');
  const [marca, setMarca] = useState('');
  const [cor, setCor] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState('');
  const [numeroEixos, setNumeroEixos] = useState('');
  const [errors, setErrors] = useState<CaminhaoFormErrors>({});

  const { data: caminhao, isLoading, isError, refetch } = useQuery<Caminhao | null>({
    queryKey: ['caminhao'],
    queryFn: getMeuCaminhao,
  });

  useEffect(() => {
    if (!caminhao) return;
    setPlaca(caminhao.placa ?? '');
    setModelo(caminhao.modelo ?? '');
    setRenavam(caminhao.renavam ?? '');
    setMarca(caminhao.marca ?? '');
    setCor(caminhao.cor ?? '');
    setAnoFabricacao(caminhao.anoFabricacao ? String(caminhao.anoFabricacao) : '');
    setNumeroEixos(caminhao.numeroEixos ? String(caminhao.numeroEixos) : '');
  }, [caminhao]);

  // ── Mutation: atualizar ──────────────────────────────
  const updateCaminhaoMutation = useMutation({
    mutationFn: (payload: UpdateCaminhaoDto) => updateCaminhao(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caminhao'] });
      Toast.show('Caminhao atualizado com sucesso', {
        type: 'success',
        backgroundColor: '#10B981',
      });
      router.back();
    },
    onError: (error: unknown) => {
      Toast.show(getErrorMessage(error), {
        type: 'error',
        backgroundColor: '#E53E3E',
      });
    },
  });

  // ── Mutation: excluir ────────────────────────────────
  const deleteCaminhaoMutation = useMutation({
    mutationFn: deleteCaminhao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caminhao'] });
      Toast.show('Caminhão removido com sucesso.', {
        type: 'success',
        backgroundColor: '#10B981',
      });
      router.back();
    },
    onError: (error: unknown) => {
      Toast.show(getErrorMessage(error), {
        type: 'error',
        backgroundColor: '#E53E3E',
      });
    },
  });

  const handleDeleteConfirm = () => {
    Alert.alert(
      'Excluir caminhão',
      'Tem certeza que deseja excluir este caminhão? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteCaminhaoMutation.mutate(),
        },
      ]
    );
  };

  const validate = (): boolean => {
    const newErrors = validateCaminhao({ placa, modelo, renavam, numeroEixos });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    updateCaminhaoMutation.mutate({
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      renavam: renavam.replace(/\D/g, ''),
      marca: marca.trim() || undefined,
      cor: cor.trim() || undefined,
      anoFabricacao: anoFabricacao ? Number(anoFabricacao) : undefined,
      numeroEixos: Number(numeroEixos),
    });
  };

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator color={primaryColor} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[loadingStyles.container, { padding: 20 }]}>
        <QueryErrorState
          message="Não foi possível carregar os dados do caminhão."
          onRetry={() => { void refetch(); }}
        />
      </View>
    );
  }

  if (!caminhao) {
    return (
      <View style={loadingStyles.container}>
        <ScaledText style={loadingStyles.emptyText}>
          Nenhum caminhao cadastrado para edicao.
        </ScaledText>
      </View>
    );
  }

  const isBusy = updateCaminhaoMutation.isPending || deleteCaminhaoMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <ScaledText style={styles.title}>EDITAR CAMINHAO</ScaledText>
          <ScaledText style={styles.subtitle}>Atualize os dados do veiculo</ScaledText>
        </View>

        <View style={styles.divider} />

        <ScaledText style={[styles.groupLabel, { color: primaryColor }]}>
          DADOS OBRIGATORIOS
        </ScaledText>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>PLACA *</ScaledText>
          <Input
            placeholder="ABC1234 ou ABC1D23"
            value={placa}
            onChangeText={(text) =>
              setPlaca(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))
            }
            autoCapitalize="characters"
          />
          {errors.placa && <ScaledText style={styles.errorText}>{errors.placa}</ScaledText>}
        </View>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>MODELO *</ScaledText>
          <Input
            placeholder="Ex: Scania R450"
            value={modelo}
            onChangeText={setModelo}
            autoCapitalize="words"
          />
          {errors.modelo && (
            <ScaledText style={styles.errorText}>{errors.modelo}</ScaledText>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>RENAVAM *</ScaledText>
          <Input
            placeholder="00000000000"
            value={renavam}
            onChangeText={(text) =>
              setRenavam(text.replace(/\D/g, '').slice(0, 11))
            }
            keyboardType="numeric"
          />
          {errors.renavam && (
            <ScaledText style={styles.errorText}>{errors.renavam}</ScaledText>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>NUMERO DE EIXOS *</ScaledText>
          <Input
            placeholder="Ex: 6"
            value={numeroEixos}
            onChangeText={(text) =>
              setNumeroEixos(text.replace(/\D/g, '').slice(0, 1))
            }
            keyboardType="numeric"
          />
          {errors.numeroEixos && (
            <ScaledText style={styles.errorText}>{errors.numeroEixos}</ScaledText>
          )}
        </View>

        <View style={styles.divider} />

        <ScaledText style={[styles.groupLabel, { color: primaryColor }]}>
          DADOS OPCIONAIS
        </ScaledText>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>MARCA</ScaledText>
          <Input
            placeholder="Ex: Scania, Volvo, Mercedes"
            value={marca}
            onChangeText={setMarca}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>COR</ScaledText>
          <Input
            placeholder="Ex: Branco, Vermelho"
            value={cor}
            onChangeText={setCor}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldContainer}>
          <ScaledText style={styles.label}>ANO DE FABRICACAO</ScaledText>
          <Input
            placeholder="Ex: 2022"
            value={anoFabricacao}
            onChangeText={(text) =>
              setAnoFabricacao(text.replace(/\D/g, '').slice(0, 4))
            }
            keyboardType="numeric"
          />
        </View>

        {/* ── Salvar ──────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: primaryColor },
            isBusy && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {updateCaminhaoMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ScaledText style={styles.submitButtonText}>SALVAR ALTERAÇÕES</ScaledText>
          )}
        </TouchableOpacity>

        {/* ── Excluir ─────────────────────────────────── */}
        <View style={styles.deleteSection}>
          <View style={styles.deleteDivider} />
          <ScaledText style={styles.deleteSectionLabel}>ZONA DE PERIGO</ScaledText>
          <TouchableOpacity
            style={[styles.deleteButton, isBusy && styles.buttonDisabled]}
            onPress={handleDeleteConfirm}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {deleteCaminhaoMutation.isPending ? (
              <ActivityIndicator color="#E53E3E" />
            ) : (
              <ScaledText style={styles.deleteButtonText}>EXCLUIR CAMINHÃO</ScaledText>
            )}
          </TouchableOpacity>
          <ScaledText style={styles.deleteHint}>
            O caminhão só pode ser excluído se não houver abastecimentos,
            documentos ou simulações de frete vinculados.
          </ScaledText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  titleContainer: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.4,
  },
  fieldContainer: {
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
  },
  submitButton: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // ── Delete section ──────────────────────────────────
  deleteSection: {
    gap: 12,
    marginTop: 8,
  },
  deleteDivider: {
    height: 1,
    backgroundColor: '#f0e0e0',
  },
  deleteSectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E53E3E',
    letterSpacing: 1,
  },
  deleteButton: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E53E3E',
    backgroundColor: '#fff',
  },
  deleteButtonText: {
    color: '#E53E3E',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  deleteHint: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 17,
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
