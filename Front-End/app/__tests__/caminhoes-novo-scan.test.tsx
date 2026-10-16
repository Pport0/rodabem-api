import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
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

describe('Scan do caminhao — origem do arquivo', () => {
  // A tela oferece duas origens: a camera e o botao "PDF ou imagem", que abre o seletor de
  // documentos. O terceiro ramo do `pickFileAndScan`, `source === "library"`, nao tem botao
  // que o acione em nenhum lugar do arquivo — e codigo inalcancavel, nao lacuna de teste.
  it('deve escanear o arquivo escolhido no seletor de documentos', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///crlv.pdf', name: 'crlv.pdf', mimeType: 'application/pdf' }],
    } as any);
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() => expect(scanCaminhao).toHaveBeenCalled());

    expect(jest.mocked(scanCaminhao).mock.calls[0][0]).toMatchObject({
      uri: 'file:///crlv.pdf',
      name: 'crlv.pdf',
      type: 'application/pdf',
    });
  });

  it('nao deve escanear quando o usuario fecha o seletor sem escolher', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: true,
    } as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    expect(scanCaminhao).not.toHaveBeenCalled();
  });

  it('nao deve escanear quando o usuario fecha a camera sem tirar a foto', async () => {
    // Desistir da foto e o caminho mais comum depois de abrir a camera por engano. Seguir para
    // o scan mandaria um arquivo inexistente e devolveria erro de OCR sem causa aparente.
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: true,
    } as any);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
      canceled: true,
    } as any);

    await escanearPelaCamera();

    expect(scanCaminhao).not.toHaveBeenCalled();
  });

  // O back recusa o arquivo pelo `Content-Type`. Nem todo seletor informa o tipo — o de
  // documentos do Android devolve `mimeType` vazio para arquivo vindo de certos provedores —
  // e sem deducao pela extensao o upload sai com o tipo errado e o scan falha no envio.
  it.each([
    ['pdf', 'crlv.pdf', 'application/pdf'],
    ['png', 'crlv.png', 'image/png'],
    ['sem extensao conhecida', 'crlv', 'image/jpeg'],
  ])('deve deduzir o tipo do arquivo %s quando o seletor nao o informa', async (_, nome, tipo) => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: `file:///${nome}`, name: nome, mimeType: null }],
    } as any);
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() => expect(scanCaminhao).toHaveBeenCalled());
    expect(jest.mocked(scanCaminhao).mock.calls[0][0]).toMatchObject({ type: tipo });
  });

  it('deve nomear o arquivo quando o seletor nao informa nome', async () => {
    // Acontece com arquivo vindo de provedor de nuvem. Enviar `name` vazio faz o `multipart`
    // sair sem nome de arquivo, e o back responde 400 sem explicar o motivo.
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/abc', name: '   ', mimeType: 'application/pdf' }],
    } as any);
    jest.mocked(scanCaminhao).mockResolvedValue(resultadoScan() as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() => expect(scanCaminhao).toHaveBeenCalled());
    expect(jest.mocked(scanCaminhao).mock.calls[0][0].name.trim()).not.toBe('');
  });
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

  // O scan falha de tres jeitos distintos, e so o terceiro e culpa do arquivo: o back recusa
  // com mensagem propria (arquivo grande demais, formato nao aceito), a rede cai antes de
  // chegar la, ou o erro vem sem nada legivel. Repetir "erro ao escanear" nos tres mandaria o
  // motorista tirar a foto de novo quando o problema e a conexao.
  it.each([
    [
      'mensagem do back',
      { response: { data: { message: 'Arquivo maior que 12MB.' } } },
      'Arquivo maior que 12MB.',
    ],
    [
      'lista de mensagens do back',
      { response: { data: { message: ['Formato nao aceito.'] } } },
      'Formato nao aceito.',
    ],
    ['erro sem nada legivel', {}, 'Erro ao executar o scan do caminhão'],
  ])('deve dizer por que a extracao falhou quando o erro vem como %s', async (_, erro, naTela) => {
    jest.mocked(scanCaminhao).mockRejectedValue(erro as never);

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(naTela, expect.objectContaining({ type: 'error' }));
  });

  it('deve informar o quanto a extracao merece confianca', async () => {
    // A RNE-06 manda exibir o resultado PARA REVISAO. Sem o nivel de confianca o motorista nao
    // sabe se confere tudo ou so passa o olho — e e justamente a revisao que impede que uma
    // placa lida errado vire dado errado.
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({ confianca: 'baixa', mensagem: 'Imagem de baixa qualidade.' }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByText(/Imagem de baixa qualidade\./)).toBeTruthy();
    expect(screen.getByText(/BAIXA/)).toBeTruthy();
  });

  it('deve exibir so a mensagem quando a extracao nao informa confianca', async () => {
    // O back pode responder sem o campo. Concatenar "| Confianca: UNDEFINED" seria pior do que
    // nao dizer nada.
    jest.mocked(scanCaminhao).mockResolvedValue(
      resultadoScan({ confianca: null, mensagem: 'Dados extraídos.' }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByText('Dados extraídos.')).toBeTruthy();
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
