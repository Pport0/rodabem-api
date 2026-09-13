import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { ReactNode } from 'react';

import NovoDocumento from '../documentos/novo';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { scanDocumento } from '@/services/documentoService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/caminhaoService', () => ({ getMeuCaminhao: jest.fn() }));

jest.mock('@/services/documentoService', () => ({
  createDocumento: jest.fn(),
  scanDocumento: jest.fn(),
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

const montarTela = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(<NovoDocumento />, { wrapper });
};

const escanearPelaCamera = async () => {
  await montarTela();
  await fireEvent.press(screen.getByText('Escanear camera'));
};

const escanearPorArquivo = async () => {
  await montarTela();
  await fireEvent.press(screen.getByText('PDF ou imagem'));
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

const seletorDevolve = (asset: Record<string, unknown>) =>
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [asset],
  } as any);

const resultadoScan = (sobrescreve: Record<string, unknown> = {}) => ({
  arquivoUrl: 'https://cdn/cnh.jpg',
  publicId: 'rodabem/cnh',
  dadosExtraidos: {
    nome: 'CNH',
    numero: '12345678901',
    dataEmissao: '2020-01-10',
    dataVencimento: '2030-01-10',
    observacao: null,
  },
  camposObrigatoriosFaltando: [],
  confianca: 'alta',
  mensagem: 'Dados extraídos com sucesso.',
  ...sobrescreve,
});

describe('Tela de novo documento - acesso a camera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);
  });

  it('deve avisar quando a permissao de camera e negada', async () => {
    permitirCamera(false);

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Permissao de camera negada',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('nao deve escanear quando a permissao e negada', async () => {
    permitirCamera(false);

    await escanearPelaCamera();

    expect(scanDocumento).not.toHaveBeenCalled();
  });

  it('nao deve escanear quando o usuario cancela a camera', async () => {
    permitirCamera();
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue({ canceled: true } as any);

    await escanearPelaCamera();

    expect(scanDocumento).not.toHaveBeenCalled();
  });

  it('nao deve escanear quando a camera nao devolve imagem', async () => {
    permitirCamera();
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue({ canceled: false, assets: [] } as any);

    await escanearPelaCamera();

    expect(scanDocumento).not.toHaveBeenCalled();
  });
});

describe('Tela de novo documento - preparacao do arquivo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);
    permitirCamera();
  });

  it('deve enviar uri, nome e tipo da imagem capturada', async () => {
    cameraDevolve({
      uri: 'file:///foto.jpg',
      fileName: 'foto.jpg',
      mimeType: 'image/jpeg',
    });

    await escanearPelaCamera();

    expect(scanDocumento).toHaveBeenCalledWith({
      uri: 'file:///foto.jpg',
      name: 'foto.jpg',
      type: 'image/jpeg',
    });
  });

  it('deve gerar nome com data quando a captura nao traz nome', async () => {
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: null });

    await escanearPelaCamera();

    expect(scanDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringMatching(/^documento-\d+\.jpg$/) }),
    );
  });

  it('deve deduzir PDF a partir da extensao quando o tipo nao vem', async () => {
    seletorDevolve({ uri: 'file:///cnh.pdf', name: 'cnh.pdf', mimeType: null });

    await escanearPorArquivo();

    expect(scanDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'application/pdf' }),
    );
  });

  it('deve deduzir PNG a partir da extensao quando o tipo nao vem', async () => {
    seletorDevolve({ uri: 'file:///cnh.png', name: 'cnh.png', mimeType: null });

    await escanearPorArquivo();

    expect(scanDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/png' }),
    );
  });

  it('deve usar jpeg como tipo padrao para extensao desconhecida', async () => {
    seletorDevolve({ uri: 'file:///cnh.xyz', name: 'cnh.xyz', mimeType: null });

    await escanearPorArquivo();

    expect(scanDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/jpeg' }),
    );
  });

  it('deve aceitar PDF e imagem no seletor de arquivos', async () => {
    seletorDevolve({ uri: 'file:///cnh.pdf', name: 'cnh.pdf' });

    await escanearPorArquivo();

    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: ['application/pdf', 'image/*'] }),
    );
  });

  it('nao deve escanear quando o usuario cancela o seletor de arquivos', async () => {
    jest
      .mocked(DocumentPicker.getDocumentAsync)
      .mockResolvedValue({ canceled: true } as any);

    await escanearPorArquivo();

    expect(scanDocumento).not.toHaveBeenCalled();
  });
});

describe('Tela de novo documento - resultado do scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    permitirCamera();
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: 'foto.jpg' });
  });

  it('deve preencher nome e numero extraidos', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('CNH')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
  });

  it('nao deve preencher campos que o OCR nao extraiu', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({ dadosExtraidos: { nome: 'CNH' } }) as any,
    );

    await escanearPelaCamera();

    expect(screen.queryByDisplayValue('12345678901')).toBeNull();
  });

  it('deve exibir o resultado com o nivel de confianca', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(
      screen.getByText('Dados extraídos com sucesso. | Confianca: ALTA'),
    ).toBeTruthy();
  });

  it('deve exibir a url do arquivo enviado', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByText(/https:\/\/cdn\/cnh\.jpg/)).toBeTruthy();
  });

  it('deve avisar que tudo esta pronto quando nada faltou', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Tudo pronto para revisar e salvar.',
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('deve listar os campos que faltaram', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        camposObrigatoriosFaltando: ['dataEmissao', 'dataVencimento'],
      }) as any,
    );

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Campos faltando: dataEmissao, dataVencimento',
      expect.objectContaining({ type: 'warning' }),
    );
  });

  it('deve tolerar data invalida vinda do OCR', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: { nome: 'CNH', dataEmissao: 'nao-e-data' },
      }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('CNH')).toBeTruthy();
  });

  it('deve preencher a observacao quando o OCR a extrai', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: { nome: 'CNH', observacao: 'documento legivel' },
      }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('documento legivel')).toBeTruthy();
  });

  it('deve preencher os campos seguintes mesmo quando o nome nao vem', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: {
          numero: '12345678901',
          dataEmissao: '2020-01-10',
          dataVencimento: '2030-01-10',
        },
      }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
    expect(screen.queryByDisplayValue('CNH')).toBeNull();
  });

  it('deve manter o formulario vazio quando o OCR nao extrai nada', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({ dadosExtraidos: {} }) as any,
    );

    await escanearPelaCamera();

    expect(screen.queryByDisplayValue('CNH')).toBeNull();
    expect(screen.getByText(/Resultado do scan/)).toBeTruthy();
  });

  it('nao deve exibir o cartao de resultado antes de escanear', async () => {
    await montarTela();

    expect(screen.queryByText('Resultado do scan')).toBeNull();
  });
});

describe('Tela de novo documento - falhas no scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    permitirCamera();
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: 'foto.jpg' });
  });

  it('deve exibir a mensagem devolvida pela API', async () => {
    jest.mocked(scanDocumento).mockRejectedValue({
      response: { data: { message: 'Arquivo muito grande.' } },
    });

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Arquivo muito grande.',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('deve exibir a primeira mensagem quando a API devolve uma lista', async () => {
    jest.mocked(scanDocumento).mockRejectedValue({
      response: { data: { message: ['Formato invalido.', 'Outro erro.'] } },
    });

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Formato invalido.',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('deve recorrer a mensagem do erro quando a API nao responde', async () => {
    jest.mocked(scanDocumento).mockRejectedValue(new Error('Network Error'));

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Network Error',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('deve exibir mensagem generica quando o erro nao tem descricao', async () => {
    jest.mocked(scanDocumento).mockRejectedValue({});

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Erro ao executar o scan do documento',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('nao deve preencher campo algum quando o scan falha', async () => {
    jest.mocked(scanDocumento).mockRejectedValue(new Error('Network Error'));

    await escanearPelaCamera();

    expect(screen.queryByDisplayValue('CNH')).toBeNull();
  });
});
