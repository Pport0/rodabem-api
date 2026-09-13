import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { ReactNode } from 'react';

import NovoCaminhao from '../caminhoes/novo';
import { getMeuCaminhao, scanCaminhao } from '@/services/caminhaoService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/caminhaoService', () => ({
  getMeuCaminhao: jest.fn(),
  createCaminhao: jest.fn(),
  updateCaminhao: jest.fn(),
  scanCaminhao: jest.fn(),
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

  return render(<NovoCaminhao />, { wrapper });
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
  arquivoUrl: 'https://cdn/crlv.jpg',
  publicId: 'rodabem/crlv',
  dadosExtraidos: {
    placa: 'abc1d23',
    modelo: 'FH 540',
    renavam: '12345678901',
    marca: 'VOLVO',
    cor: 'BRANCA',
    anoFabricacao: 2020,
    especieTipo: 'CAMINHAO TRATOR',
    chassi: '9BWZZZ377VT004251',
  },
  camposObrigatoriosFaltando: [],
  confianca: 'alta',
  mensagem: 'Dados extraídos com sucesso.',
  ...sobrescreve,
});

describe('Tela de novo caminhao - acesso a camera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);
  });

  it('deve avisar quando a permissao de camera e negada', async () => {
    permitirCamera(false);

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Permissao de camera negada',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('nao deve abrir a camera quando a permissao e negada', async () => {
    permitirCamera(false);

    await escanearPelaCamera();

    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('nao deve escanear quando a permissao e negada', async () => {
    permitirCamera(false);

    await escanearPelaCamera();

    expect(scanCaminhao).not.toHaveBeenCalled();
  });

  it('deve abrir a camera quando a permissao e concedida', async () => {
    permitirCamera();
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: 'foto.jpg' });

    await escanearPelaCamera();

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
  });

  it('nao deve escanear quando o usuario cancela a camera', async () => {
    permitirCamera();
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue({ canceled: true } as any);

    await escanearPelaCamera();

    expect(scanCaminhao).not.toHaveBeenCalled();
  });

  it('nao deve escanear quando a camera nao devolve imagem', async () => {
    permitirCamera();
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue({ canceled: false, assets: [] } as any);

    await escanearPelaCamera();

    expect(scanCaminhao).not.toHaveBeenCalled();
  });
});

describe('Tela de novo caminhao - preparacao do arquivo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);
    permitirCamera();
  });

  it('deve enviar uri, nome e tipo da imagem capturada', async () => {
    cameraDevolve({
      uri: 'file:///foto.jpg',
      fileName: 'foto.jpg',
      mimeType: 'image/jpeg',
    });

    await escanearPelaCamera();

    expect(scanCaminhao).toHaveBeenCalledWith({
      uri: 'file:///foto.jpg',
      name: 'foto.jpg',
      type: 'image/jpeg',
    });
  });

  it('deve gerar nome com data quando a captura nao traz nome', async () => {
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: null });

    await escanearPelaCamera();

    expect(scanCaminhao).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringMatching(/^caminhao-\d+\.jpg$/) }),
    );
  });

  it('deve gerar nome com data quando o nome vem em branco', async () => {
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: '   ' });

    await escanearPelaCamera();

    expect(scanCaminhao).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringMatching(/^caminhao-\d+\.jpg$/) }),
    );
  });

  it('deve deduzir PDF a partir da extensao quando o tipo nao vem', async () => {
    seletorDevolve({ uri: 'file:///doc.pdf', name: 'doc.pdf', mimeType: null });

    await escanearPorArquivo();

    expect(scanCaminhao).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'application/pdf' }),
    );
  });

  it('deve deduzir PNG a partir da extensao quando o tipo nao vem', async () => {
    seletorDevolve({ uri: 'file:///doc.png', name: 'doc.png', mimeType: null });

    await escanearPorArquivo();

    expect(scanCaminhao).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/png' }),
    );
  });

  it('deve usar jpeg como tipo padrao para extensao desconhecida', async () => {
    seletorDevolve({ uri: 'file:///doc.xyz', name: 'doc.xyz', mimeType: null });

    await escanearPorArquivo();

    expect(scanCaminhao).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/jpeg' }),
    );
  });

  it('deve respeitar o tipo informado pelo seletor', async () => {
    seletorDevolve({
      uri: 'file:///doc.xyz',
      name: 'doc.xyz',
      mimeType: 'application/pdf',
    });

    await escanearPorArquivo();

    expect(scanCaminhao).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'application/pdf' }),
    );
  });

  it('deve aceitar PDF e imagem no seletor de arquivos', async () => {
    seletorDevolve({ uri: 'file:///doc.pdf', name: 'doc.pdf' });

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

    expect(scanCaminhao).not.toHaveBeenCalled();
  });
});

describe('Tela de novo caminhao - resultado do scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    permitirCamera();
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: 'foto.jpg' });
  });

  it('deve preencher a placa em caixa alta', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy();
  });

  it('deve preencher os demais campos extraidos', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('FH 540')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
    expect(screen.getByDisplayValue('VOLVO')).toBeTruthy();
    expect(screen.getByDisplayValue('BRANCA')).toBeTruthy();
  });

  it('deve converter o ano de fabricacao para texto', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('2020')).toBeTruthy();
  });

  it('nao deve preencher campos que o OCR nao extraiu', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({ dadosExtraidos: { placa: 'ABC1D23' } }) as any,
    );

    await escanearPelaCamera();

    expect(screen.queryByDisplayValue('FH 540')).toBeNull();
  });

  it('deve exibir o resultado com o nivel de confianca', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(
      screen.getByText('Dados extraídos com sucesso. | Confianca: ALTA'),
    ).toBeTruthy();
  });

  it('deve exibir a url do arquivo enviado', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByText(/https:\/\/cdn\/crlv\.jpg/)).toBeTruthy();
  });

  it('deve avisar que tudo esta pronto quando nada faltou', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Tudo pronto para revisar e salvar.',
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('deve listar os campos que faltaram', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({ camposObrigatoriosFaltando: ['placa', 'renavam'] }) as any,
    );

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Campos faltando: placa, renavam',
      expect.objectContaining({ type: 'warning' }),
    );
  });

  it('deve preencher os campos seguintes mesmo quando a placa nao vem', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: {
          modelo: 'FH 540',
          renavam: '12345678901',
          marca: 'VOLVO',
          cor: 'BRANCA',
          anoFabricacao: 2020,
          especieTipo: 'CAMINHAO TRATOR',
          chassi: '9BWZZZ377VT004251',
        },
      }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('FH 540')).toBeTruthy();
    expect(screen.queryByDisplayValue('ABC1D23')).toBeNull();
  });

  it('deve manter o formulario vazio quando o OCR nao extrai nada', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({ dadosExtraidos: {} }) as any,
    );

    await escanearPelaCamera();

    expect(screen.queryByDisplayValue('FH 540')).toBeNull();
    expect(screen.getByText(/Resultado do scan/)).toBeTruthy();
  });

  it('nao deve exibir o cartao de resultado antes de escanear', async () => {
    await montarTela();

    expect(screen.queryByText('Resultado do scan')).toBeNull();
  });
});

describe('Tela de novo caminhao - falhas no scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    permitirCamera();
    cameraDevolve({ uri: 'file:///foto.jpg', fileName: 'foto.jpg' });
  });

  it('deve exibir a mensagem devolvida pela API', async () => {
    jest.mocked(scanCaminhao).mockRejectedValue({
      response: { data: { message: 'Arquivo muito grande.' } },
    });

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Arquivo muito grande.',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('deve exibir a primeira mensagem quando a API devolve uma lista', async () => {
    jest.mocked(scanCaminhao).mockRejectedValue({
      response: { data: { message: ['Formato invalido.', 'Outro erro.'] } },
    });

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Formato invalido.',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('deve recorrer a mensagem do erro quando a API nao responde', async () => {
    jest.mocked(scanCaminhao).mockRejectedValue(new Error('Network Error'));

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Network Error',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('deve exibir mensagem generica quando o erro nao tem descricao', async () => {
    jest.mocked(scanCaminhao).mockRejectedValue({});

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      'Erro ao executar o scan do caminhão',
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('nao deve preencher campo algum quando o scan falha', async () => {
    jest.mocked(scanCaminhao).mockRejectedValue(new Error('Network Error'));

    await escanearPelaCamera();

    expect(screen.queryByDisplayValue('ABC1D23')).toBeNull();
  });
});
