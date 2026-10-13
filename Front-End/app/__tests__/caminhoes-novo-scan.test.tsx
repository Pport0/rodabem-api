import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { ReactNode } from 'react';

import NovoCaminhao from '../caminhoes/novo';
import { getMeuCaminhao, scanCaminhao } from '@/services/caminhaoService';
import { Toast } from '@/shared/ui/molecules/Toast';

/**
 * Contrato da RNE-06 na tela de cadastro de caminhao.
 *
 * A regra promete quatro coisas, e so estas quatro:
 *   - o sistema TENTA extrair os dados;
 *   - o que saiu da extracao e exibido PARA REVISAO;
 *   - o usuario pode CORRIGIR qualquer campo antes de salvar;
 *   - se o OCR falhar, parcial ou totalmente, o cadastro NAO e impedido.
 */
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

describe('Scan do caminhao — contrato da RNE-06', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    cameraDevolve({ uri: 'file:///crlv.jpg', name: 'crlv.jpg', type: 'image' });
  });

  it('deve trazer os dados extraidos para os campos, onde o usuario possa revisar', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();

    // Um unico cenario: o resultado chegou e esta visivel para revisao.
    expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy();
    expect(screen.getByDisplayValue('FH 540')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
  });

  it('deve permitir corrigir um campo extraido antes de salvar', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await escanearPelaCamera();
    await fireEvent.changeText(screen.getByDisplayValue('FH 540'), 'R 450');

    // O que o usuario digitou prevalece sobre o que o OCR sugeriu.
    expect(screen.getByDisplayValue('R 450')).toBeTruthy();
    expect(screen.queryByDisplayValue('FH 540')).toBeNull();
  });

  it('deve apontar os campos obrigatorios que a extracao nao conseguiu preencher', async () => {
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: { modelo: 'FH 540' },
        camposObrigatoriosFaltando: ['placa', 'renavam'],
      }) as any,
    );

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(
      expect.stringContaining('placa'),
      expect.objectContaining({ type: 'warning' }),
    );
  });

  it('nao deve impedir o cadastro manual quando a extracao falha', async () => {
    jest.mocked(scanCaminhao).mockRejectedValue(new Error('OCR indisponivel'));

    await escanearPelaCamera();

    // A falha e comunicada, mas o formulario continua utilizavel: a regra diz
    // "permitir preenchimento manual, nao impedir o cadastro".
    expect(Toast.show).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'error' }),
    );

    const placa = screen.getByPlaceholderText('ABC1234 ou ABC1D23');
    await fireEvent.changeText(placa, 'XYZ9A88');
    expect(screen.getByDisplayValue('XYZ9A88')).toBeTruthy();
    expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy();
  });

  it('nao deve acionar a extracao quando a permissao de camera e negada', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: false,
    } as any);

    await escanearPelaCamera();

    // Colaborador externo forcado a um estado que a interface nao alcanca.
    expect(scanCaminhao).not.toHaveBeenCalled();
    expect(Toast.show).toHaveBeenCalledWith(
      'Permissao de camera negada',
      expect.objectContaining({ type: 'error' }),
    );
  });
});
