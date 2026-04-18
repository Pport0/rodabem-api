import { CreateDocumentoDto, DocumentoVinculo } from '@/@types/documento';
import { DateField } from '@/components/dateField';
import Input from '@/components/input';
import colors from '@/constants/colors';
import { createDocumento } from '@/services/documentoService';
import { useToast } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
  nome?: string;
  numero?: string;
  dataEmissao?: string;
  dataVencimento?: string;
  caminhaoId?: string;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === 'string') return message;
  }

  return 'Erro ao cadastrar documento';
}

export default function NovoDocumento() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;

  const { caminhaoId, tipoVinculo } = useLocalSearchParams<{
    caminhaoId?: string;
    tipoVinculo?: DocumentoVinculo;
  }>();
  const { show } = useToast();
  const vinculo: DocumentoVinculo =
    tipoVinculo === 'MOTORISTA' ? 'MOTORISTA' : 'CAMINHAO';

  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [dataEmissao, setDataEmissao] = useState<Date | null>(null);
  const [dataVencimento, setDataVencimento] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateDocumentoDto) => createDocumento({ ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      show('Documento cadastrado com sucesso!', {
        type: 'success',
        backgroundColor: '#10B981',
      });
      router.back();
    },
    onError: (error) => {
      show(getErrorMessage(error), {
        type: 'error',
        backgroundColor: '#E53E3E',
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nome.trim()) newErrors.nome = 'Nome do documento e obrigatorio';
    if (!numero.trim()) newErrors.numero = 'Numero e obrigatorio';
    if (!dataEmissao) newErrors.dataEmissao = 'Data de emissao obrigatoria';
    if (!dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento obrigatoria';
    }
    if (dataEmissao && dataVencimento && dataVencimento < dataEmissao) {
      newErrors.dataVencimento =
        'A data de vencimento nao pode ser anterior a emissao';
    }
    if (vinculo === 'CAMINHAO' && !caminhaoId) {
      newErrors.caminhaoId = 'Documento deve estar vinculado a um caminhao';
    }

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
      vinculo,
      caminhaoId:
        vinculo === 'CAMINHAO' && caminhaoId ? Number(caminhaoId) : undefined,
    });
  };

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
          <Text style={styles.title}>NOVO DOCUMENTO</Text>
          <Text style={styles.subtitle}>
            {vinculo === 'CAMINHAO'
              ? 'Preencha os dados do documento do caminhao'
              : 'Preencha os dados do documento do motorista'}
          </Text>
        </View>

        <View style={styles.divider} />

        {!!errors.caminhaoId && (
          <Text style={styles.errorText}>{errors.caminhaoId}</Text>
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>NOME DO DOCUMENTO *</Text>
          <Input
            placeholder="Ex: CRLV, ANTT, Seguro, CNH"
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
          {errors.numero && (
            <Text style={styles.errorText}>{errors.numero}</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.dateColumn}>
            <DateField
              label="DATA DE EMISSAO *"
              value={dataEmissao}
              onChange={setDataEmissao}
              error={errors.dataEmissao}
            />
          </View>
          <View style={styles.dateColumn}>
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dateColumn: {
    flex: 1,
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
