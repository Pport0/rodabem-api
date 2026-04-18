import { Documento, DocumentoVinculo } from '@/@types/documento';
import { DocumentoCard } from '@/components/documentoCard';
import colors from '@/constants/colors';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { deleteDocumento, getDocumentos } from '@/services/documentoService';
import { useToast } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

export default function MeusDocumentos() {
  const colorScheme = useColorScheme();
  const primaryColor = colors[colorScheme ?? 'light'].primary;
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<DocumentoVinculo>('CAMINHAO');

  const { data: documentos, isLoading, refetch } = useQuery<Documento[]>({
    queryKey: ['documentos'],
    queryFn: getDocumentos,
  });

  const { data: caminhao } = useQuery({
    queryKey: ['caminhao'],
    queryFn: getMeuCaminhao,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocumento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      show('Documento excluido com sucesso.', {
        type: 'success',
        backgroundColor: '#10B981',
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Nao foi possivel excluir o documento.';
      show(Array.isArray(message) ? message[0] : message, {
        type: 'error',
        backgroundColor: '#E53E3E',
      });
    },
  });

  const handleAddDocumento = () => {
    if (activeTab === 'CAMINHAO' && !caminhao?.id) {
      show('Cadastre um caminhao antes de adicionar um documento.', {
        type: 'error',
        backgroundColor: '#E53E3E',
      });
      return;
    }

    router.push({
      pathname: '/documentos/novo',
      params: {
        tipoVinculo: activeTab,
        ...(activeTab === 'CAMINHAO' && caminhao?.id
          ? { caminhaoId: String(caminhao.id) }
          : {}),
      },
    } as any);
  };

  const documentosFiltrados =
    documentos?.filter((documento) =>
      activeTab === 'CAMINHAO' ? !!documento.caminhaoId : !documento.caminhaoId
    ) ?? [];

  const headerTitle =
    activeTab === 'CAMINHAO'
      ? 'DOCUMENTOS DO CAMINHAO'
      : 'DOCUMENTOS DO MOTORISTA';

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator
          color={primaryColor}
          size="large"
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={documentosFiltrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DocumentoCard
              documento={item}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={
                deleteMutation.isPending && deleteMutation.variables === item.id
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text style={styles.sectionTitle}>{headerTitle}</Text>
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'CAMINHAO' && {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    },
                  ]}
                  onPress={() => setActiveTab('CAMINHAO')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === 'CAMINHAO' && styles.tabButtonTextActive,
                    ]}
                  >
                    Caminhao
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'MOTORISTA' && {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    },
                  ]}
                  onPress={() => setActiveTab('MOTORISTA')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === 'MOTORISTA' && styles.tabButtonTextActive,
                    ]}
                  >
                    Motorista
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={52}
                color="#e0e0e0"
              />
              <Text style={styles.emptyTitle}>Nenhum documento cadastrado</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'CAMINHAO'
                  ? 'Adicione os documentos vinculados ao seu caminhao'
                  : 'Adicione os documentos pessoais do motorista'}
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: primaryColor }]}
          onPress={handleAddDocumento}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>
            {activeTab === 'CAMINHAO'
              ? 'ADICIONAR DOCUMENTO DO CAMINHAO'
              : 'ADICIONAR DOCUMENTO DO MOTORISTA'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerContainer: {
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    letterSpacing: 0.8,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#f5f5f5',
  },
  addBtn: {
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
