jest.unmock('expo-router');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Text } from 'react-native';

import { api } from '@/services/api';
import NovoCaminhao from '../caminhoes/novo';
import NovoDocumento from '../documentos/novo';

/**
 * Integracao de tela ate a camada HTTP, com o axios dublado no limite.
 *
 * O que justifica estes testes existirem alem dos de contrato da RNE-06: aqui o servico real e exercitado,
 * e com ele o acordo com o back — o endereco do endpoint e o nome do campo que carrega o arquivo. Se o back espera
 * `documento` e o front enviar outro nome, nenhum teste de tela percebe, porque todos dublam o servico.
 *
 * Esse acordo so e observavel na requisicao: nao existe saida de tela que o revele. E a excecao prevista no plano para afirmar forma de chamada.
 *
 * O E2E de aplicativo nao cobre esta lacuna: o scan depende da camera, que o Maestro nao consegue alimentar com um documento de verdade.
 */
jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const respostaScanCaminhao = {
  arquivoUrl: 'https://cdn/crlv.jpg',
  publicId: 'rodabem/crlv',
  dadosExtraidos: {
    placa: 'abc1d23',
    modelo: 'FH 540',
    renavam: '12345678901',
  },
  camposObrigatoriosFaltando: [],
  confianca: 'alta',
  mensagem: 'Dados extraídos com sucesso.',
};

const respostaScanDocumento = {
  arquivoUrl: 'https://cdn/cnh.jpg',
  publicId: 'rodabem/cnh',
  dadosExtraidos: { nome: 'CNH', numero: '12345678901' },
  camposObrigatoriosFaltando: ['dataVencimento'],
  confianca: 'media',
  mensagem: 'Extração concluída.',
};

const montarApp = async (initialUrl: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return renderRouter(
    {
      _layout: () => (
        <QueryClientProvider client={queryClient}>
          <Slot />
        </QueryClientProvider>
      ),
      index: () => <Text>TELA INICIAL</Text>,
      'caminhoes/novo': NovoCaminhao,
      'documentos/novo': NovoDocumento,
    },
    { initialUrl },
  );
};

const escanear = async () => {
  await fireEvent.press(screen.getByText('Escanear camera'));
};

const chamadaDeScan = () =>
  jest.mocked(api.post).mock.calls.find((c) => String(c[0]).includes('/scan'));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({ data: { message: 'sem caminhao' } } as any);
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
    granted: true,
  } as any);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///foto.jpg', fileName: 'foto.jpg', mimeType: 'image/jpeg' }],
  } as any);
});

describe('Scan — acordo entre o front e a API', () => {
  it('o scan de caminhao envia o arquivo ao endpoint do caminhao e aplica a resposta', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanCaminhao } as any);
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() => expect(chamadaDeScan()).toBeDefined());
    const [endereco, corpo] = chamadaDeScan()!;
    expect(endereco).toBe('/caminhao/scan');
    // O back le o arquivo do campo `documento`; outro nome e recusado por ele.
    expect((corpo as FormData).get('documento')).toBeTruthy();

    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());
  });

  it('o scan de documento envia o arquivo ao endpoint de documento e aplica a resposta', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanDocumento } as any);
    await montarApp('/documentos/novo');

    await escanear();

    await waitFor(() => expect(chamadaDeScan()).toBeDefined());
    const [endereco, corpo] = chamadaDeScan()!;
    expect(endereco).toBe('/documentos/scan');
    expect((corpo as FormData).get('documento')).toBeTruthy();

    await waitFor(() => expect(screen.getByDisplayValue('CNH')).toBeTruthy());
  });

  it('o front tolera resposta sem os campos opcionais, sem quebrar a tela', async () => {
    // O back pode devolver apenas parte dos campos. A tela precisa seguir utilizavel — e a mesma promessa de
    // "nao impedir o cadastro" da RNE-06, aqui verificada contra a forma real da resposta.
    jest.mocked(api.post).mockResolvedValue({
      data: { arquivoUrl: '', dadosExtraidos: {}, camposObrigatoriosFaltando: [] },
    } as any);
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() => expect(chamadaDeScan()).toBeDefined());
    expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy();
  });
});
