import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { ReactNode } from 'react';

import NovoDocumento from '../documentos/novo';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { scanDocumento } from '@/services/documentoService';
import { Toast } from '@/shared/ui/molecules/Toast';

/**
 * Contrato da RNE-06 na tela de cadastro de documento.
 *
 * A regra promete quatro coisas, e so estas quatro: o sistema TENTA extrair,
 * o resultado e exibido PARA REVISAO, o usuario pode CORRIGIR qualquer campo
 * antes de salvar, e uma falha do OCR NAO impede o cadastro.
 */
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

const cameraDevolve = (asset: Record<string, unknown>) => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
    granted: true,
  } as any);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [asset],
  } as any);
};

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

describe('Scan do documento — contrato da RNE-06', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    cameraDevolve({ uri: 'file:///cnh.jpg', name: 'cnh.jpg', type: 'image' });
  });

  it('deve trazer os dados extraidos para os campos, onde o usuario possa revisar', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('CNH')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
  });

  it('deve permitir corrigir um campo extraido antes de salvar', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();
    await fireEvent.changeText(screen.getByDisplayValue('CNH'), 'CRLV');

    expect(screen.getByDisplayValue('CRLV')).toBeTruthy();
    expect(screen.queryByDisplayValue('CNH')).toBeNull();
  });

  it('deve apontar os campos obrigatorios que a extracao nao conseguiu preencher', async () => {
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: { nome: 'CNH' },
        camposObrigatoriosFaltando: ['numero', 'dataVencimento'],
      }) as any,
    );

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      expect.stringContaining('numero'),
      expect.objectContaining({ type: 'warning' }),
    );
  });

  it('nao deve impedir o cadastro manual quando a extracao falha', async () => {
    jest.mocked(scanDocumento).mockRejectedValue(new Error('OCR indisponivel'));

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'error' }),
    );

    const nome = screen.getByPlaceholderText('Ex: CRLV, CNH, Seguro');
    await fireEvent.changeText(nome, 'Seguro obrigatorio');
    expect(screen.getByDisplayValue('Seguro obrigatorio')).toBeTruthy();
    expect(screen.getByText('CADASTRAR DOCUMENTO')).toBeTruthy();
  });

  it('nao deve acionar a extracao quando a permissao de camera e negada', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: false,
    } as any);

    await escanearPelaCamera();

    expect(scanDocumento).not.toHaveBeenCalled();
    expect(Toast.show).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'error' }),
    );
  });
});
