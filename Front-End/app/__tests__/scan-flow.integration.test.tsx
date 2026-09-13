jest.unmock('expo-router');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Text } from 'react-native';

import { api } from '@/services/api';
import { Toast } from '@/shared/ui/molecules/Toast';
import NovoCaminhao from '../caminhoes/novo';
import NovoDocumento from '../documentos/novo';

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
    marca: 'VOLVO',
    anoFabricacao: 2020,
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

const permitirCamera = (granted = true) =>
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
    granted,
  } as any);

const cameraDevolve = (asset: Record<string, unknown>) =>
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [asset],
  } as any);

const escanear = async () => {
  await fireEvent.press(screen.getByText('Escanear camera'));
};

const corpoEnviado = () =>
  jest.mocked(api.post).mock.calls.find((c) => String(c[0]).includes('/scan'))?.[1] as FormData;

const opcoesEnviadas = () =>
  jest.mocked(api.post).mock.calls.find((c) => String(c[0]).includes('/scan'))?.[2] as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({ data: { message: 'sem caminhao' } } as any);
  permitirCamera();
  cameraDevolve({ uri: 'file:///foto.jpg', fileName: 'foto.jpg', mimeType: 'image/jpeg' });
});

describe('Fluxo de scan do caminhao', () => {
  beforeEach(() => {
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanCaminhao } as any);
  });

  it('deve percorrer da tela ate a API e preencher o formulario', async () => {
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());
    expect(screen.getByDisplayValue('FH 540')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
  });

  it('deve chamar o endpoint de scan do caminhao', async () => {
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/caminhao/scan',
        expect.any(FormData),
        expect.anything(),
      ),
    );
  });

  it('deve montar o multipart com o arquivo no campo documento', async () => {
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() => expect(corpoEnviado()).toBeTruthy());
    expect(corpoEnviado().get('documento')).toBeTruthy();
    expect(opcoesEnviadas().headers['Content-Type']).toBe('multipart/form-data');
  });

  it('deve exibir o resultado com o nivel de confianca', async () => {
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() =>
      expect(
        screen.getByText('Dados extraídos com sucesso. | Confianca: ALTA'),
      ).toBeTruthy(),
    );
  });

  it('deve manter o usuario na tela quando a API recusa o arquivo', async () => {
    jest.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'Arquivo muito grande.' } },
    });
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Arquivo muito grande.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(screen.queryByDisplayValue('ABC1D23')).toBeNull();
  });

  it('nao deve chamar a API quando a permissao de camera e negada', async () => {
    permitirCamera(false);
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() => expect(Toast.show).toHaveBeenCalled());
    expect(
      jest.mocked(api.post).mock.calls.filter((c) => String(c[0]).includes('/scan')),
    ).toHaveLength(0);
  });
});

describe('Fluxo de scan do documento', () => {
  beforeEach(() => {
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanDocumento } as any);
  });

  it('deve percorrer da tela ate a API e preencher o formulario', async () => {
    await montarApp('/documentos/novo');

    await escanear();

    await waitFor(() => expect(screen.getByDisplayValue('CNH')).toBeTruthy());
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
  });

  it('deve chamar o endpoint de scan de documento', async () => {
    await montarApp('/documentos/novo');

    await escanear();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/documentos/scan',
        expect.any(FormData),
        expect.anything(),
      ),
    );
  });

  it('deve avisar sobre os campos que o OCR nao extraiu', async () => {
    await montarApp('/documentos/novo');

    await escanear();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Campos faltando: dataVencimento',
        expect.objectContaining({ type: 'warning' }),
      ),
    );
  });

  it('deve manter o usuario na tela quando a API recusa a requisicao', async () => {
    jest.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'Nenhum arquivo enviado.' } },
    });
    await montarApp('/documentos/novo');

    await escanear();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Nenhum arquivo enviado.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(screen.queryByDisplayValue('CNH')).toBeNull();
  });

  it('deve enviar PDF selecionado pelo seletor de arquivos', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cnh.pdf', name: 'cnh.pdf', mimeType: 'application/pdf' }],
    } as any);
    await montarApp('/documentos/novo');

    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/documentos/scan',
        expect.any(FormData),
        expect.anything(),
      ),
    );
  });
});

describe('Contrato entre front-end e back-end', () => {
  it('o front consome exatamente os campos que o back devolve no scan de caminhao', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanCaminhao } as any);
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());
    expect(screen.getByDisplayValue('VOLVO')).toBeTruthy();
    expect(screen.getByDisplayValue('2020')).toBeTruthy();
    expect(screen.getByText(/https:\/\/cdn\/crlv\.jpg/)).toBeTruthy();
  });

  it('o front tolera resposta do back sem os campos opcionais', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: {
        arquivoUrl: 'https://cdn/crlv.jpg',
        publicId: 'rodabem/crlv',
        dadosExtraidos: {},
        camposObrigatoriosFaltando: ['placa', 'modelo', 'renavam'],
        confianca: 'baixa',
        mensagem: 'Extração concluída.',
      },
    } as any);
    await montarApp('/caminhoes/novo');

    await escanear();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Campos faltando: placa, modelo, renavam',
        expect.objectContaining({ type: 'warning' }),
      ),
    );
    expect(screen.getByText(/Confianca: BAIXA/)).toBeTruthy();
  });
});
