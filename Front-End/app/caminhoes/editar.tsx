import { Caminhao, UpdateCaminhaoDto } from '@/@types/caminhao';
import Input from '@/components/input';
import colors from '@/constants/colors';
import { getMeuCaminhao, updateCaminhao } from '@/services/caminhaoService';
import { Toast } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
} from 'react-native';

interface FormErrors {
  placa?: string;
  modelo?: string;
  renavam?: string;
  numeroEixos?: string;
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
  const [errors, setErrors] = useState<FormErrors>({});

  const { data: caminhao, isLoading } = useQuery<Caminhao | null>({
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
    setAnoFabricacao(
      caminhao.anoFabricacao ? String(caminhao.anoFabricacao) : ''
    );
    setNumeroEixos(caminhao.numeroEixos ? String(caminhao.numeroEixos) : '');
  }, [caminhao]);

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
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao atualizar caminhao';
      Toast.show(Array.isArray(message) ? message[0] : message, {
        type: 'error',
        backgroundColor: '#E53E3E',
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const numeroEixosValue = Number(numeroEixos);

    if (!placa.trim() || placa.replace(/[^A-Z0-9]/g, '').length < 7) {
      newErrors.placa = 'Placa invalida (ex: ABC1234 ou ABC1D23)';
    }
    if (!modelo.trim()) {
      newErrors.modelo = 'Modelo e obrigatorio';
    }
    if (!renavam.trim() || renavam.replace(/\D/g, '').length < 9) {
      newErrors.renavam = 'RENAVAM invalido';
    }
    if (!numeroEixos.trim()) {
      newErrors.numeroEixos = 'Numero de eixos e obrigatorio';
    } else if (!Number.isInteger(numeroEixosValue) || numeroEixosValue < 2) {
      newErrors.numeroEixos = 'Informe um numero de eixos valido';
    }

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

  if (!caminhao) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.emptyText}>
          Nenhum caminhao cadastrado para edicao.
        </Text>
      </View>
    );
  }

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
          <Text style={styles.title}>EDITAR CAMINHAO</Text>
          <Text style={styles.subtitle}>Atualize os dados do veiculo</Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.groupLabel, { color: primaryColor }]}>
          DADOS OBRIGATORIOS
        </Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>PLACA *</Text>
          <Input
            placeholder="ABC1234 ou ABC1D23"
            value={placa}
            onChangeText={(text) =>
              setPlaca(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))
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
          {errors.modelo && (
            <Text style={styles.errorText}>{errors.modelo}</Text>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>RENAVAM *</Text>
          <Input
            placeholder="00000000000"
            value={renavam}
            onChangeText={(text) =>
              setRenavam(text.replace(/\D/g, '').slice(0, 11))
            }
            keyboardType="numeric"
          />
          {errors.renavam && (
            <Text style={styles.errorText}>{errors.renavam}</Text>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>NUMERO DE EIXOS *</Text>
          <Input
            placeholder="Ex: 6"
            value={numeroEixos}
            onChangeText={(text) =>
              setNumeroEixos(text.replace(/\D/g, '').slice(0, 1))
            }
            keyboardType="numeric"
          />
          {errors.numeroEixos && (
            <Text style={styles.errorText}>{errors.numeroEixos}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={[styles.groupLabel, { color: primaryColor }]}>
          DADOS OPCIONAIS
        </Text>

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
            onChangeText={(text) =>
              setAnoFabricacao(text.replace(/\D/g, '').slice(0, 4))
            }
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: primaryColor },
            updateCaminhaoMutation.isPending && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={updateCaminhaoMutation.isPending}
          activeOpacity={0.85}
        >
          {updateCaminhaoMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>SALVAR ALTERACOES</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: 40,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
