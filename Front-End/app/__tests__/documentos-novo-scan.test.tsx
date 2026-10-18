import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
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

describe('Scan do documento — origem do arquivo', () => {
  // A tela oferece duas origens: a camera e o botao "PDF ou imagem", que abre o seletor de
  // documentos. O terceiro ramo do `pickFileAndScan`, `source === "library"`, nao tem botao que
  // o acione em lugar algum do arquivo — e codigo inalcancavel, nao lacuna de teste.
  //
  // Este bloco repete o de `caminhoes-novo-scan.test.tsx` de proposito: as duas telas tem
  // copias separadas de `pickFileAndScan`, `resolveMimeType` e `normalizeFileName`. Corrigir
  // uma nao corrige a outra — a propria duplicacao e um dos defeitos registrados.
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
  });

  it('deve escanear o arquivo escolhido no seletor de documentos', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cnh.pdf', name: 'cnh.pdf', mimeType: 'application/pdf' }],
    } as any);
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() => expect(scanDocumento).toHaveBeenCalled());
    expect(jest.mocked(scanDocumento).mock.calls[0][0]).toMatchObject({
      uri: 'file:///cnh.pdf',
      name: 'cnh.pdf',
      type: 'application/pdf',
    });
  });

  it.each([
    ['o seletor de documentos', () => fireEvent.press(screen.getByText('PDF ou imagem'))],
    ['a camera', () => fireEvent.press(screen.getByText('Escanear camera'))],
  ])('nao deve escanear quando o usuario desiste em %s', async (_, acionar) => {
    // Desistir e o caminho mais comum depois de abrir por engano. Seguir para o scan mandaria
    // um arquivo inexistente e devolveria erro de OCR sem causa aparente.
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true } as any);
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: true,
    } as any);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: true } as any);

    await montarTela();
    await acionar();

    expect(scanDocumento).not.toHaveBeenCalled();
  });

  // O back recusa o arquivo pelo `Content-Type`. Nem todo seletor informa o tipo, e sem a
  // deducao pela extensao o upload sai com o tipo errado e o scan falha no envio.
  it.each([
    ['pdf', 'cnh.pdf', 'application/pdf'],
    ['png', 'cnh.png', 'image/png'],
    ['sem extensao conhecida', 'cnh', 'image/jpeg'],
  ])('deve deduzir o tipo do arquivo %s quando o seletor nao o informa', async (_, nome, tipo) => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: `file:///${nome}`, name: nome, mimeType: null }],
    } as any);
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() => expect(scanDocumento).toHaveBeenCalled());
    expect(jest.mocked(scanDocumento).mock.calls[0][0]).toMatchObject({ type: tipo });
  });

  it('deve nomear o arquivo quando o seletor nao informa nome', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/abc', name: '   ', mimeType: 'application/pdf' }],
    } as any);
    jest.mocked(scanDocumento).mockResolvedValue(resultadoScan() as any);

    await montarTela();
    await fireEvent.press(screen.getByText('PDF ou imagem'));

    await waitFor(() => expect(scanDocumento).toHaveBeenCalled());
    expect(jest.mocked(scanDocumento).mock.calls[0][0].name.trim()).not.toBe('');
  });
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

  it('deve trazer tambem a observacao extraida, quando houver', async () => {
    // A observacao e o campo livre do documento — restricao de CNH, categoria, ressalva. Perder
    // justamente o que nao cabe em campo estruturado tira metade do ganho do scan.
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: {
          nome: 'CNH',
          numero: '12345678901',
          dataEmissao: '2020-01-10',
          dataVencimento: '2030-01-10',
          observacao: 'EAR - exerce atividade remunerada',
        },
      }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByDisplayValue('EAR - exerce atividade remunerada')).toBeTruthy();
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
    ['erro sem nada legivel', {}, 'Erro ao executar o scan do documento'],
  ])('deve dizer por que a extracao falhou quando o erro vem como %s', async (_, erro, naTela) => {
    jest.mocked(scanDocumento).mockRejectedValue(erro as never);

    await escanearPelaCamera();

    expect(Toast.show).toHaveBeenCalledWith(naTela, expect.objectContaining({ type: 'error' }));
  });

  it('deve informar o quanto a extracao merece confianca', async () => {
    // A regra manda exibir o resultado PARA REVISAO. Sem o nivel de confianca o motorista nao
    // sabe se confere tudo ou so passa o olho — e e a revisao que impede que um numero lido
    // errado vire dado errado.
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({ confianca: 'baixa', mensagem: 'Imagem de baixa qualidade.' }) as any,
    );

    await escanearPelaCamera();

    expect(screen.getByText(/Imagem de baixa qualidade\./)).toBeTruthy();
    expect(screen.getByText(/BAIXA/)).toBeTruthy();
  });

  it('deve deixar a data em branco quando a extracao devolve algo que nao e data', async () => {
    // O OCR erra data com frequencia — carimbo borrado, numero cortado. Jogar "nao e uma data"
    // num `new Date` produz `Invalid Date`, que quebraria a formatacao do campo e, pior,
    // poderia ser salvo assim.
    jest.mocked(scanDocumento).mockResolvedValue(
      resultadoScan({
        dadosExtraidos: {
          nome: 'CNH',
          numero: '12345678901',
          dataEmissao: '10 de marco',
          dataVencimento: '2030-01-10T00:00:00.000Z',
          observacao: null,
        },
      }) as any,
    );

    await escanearPelaCamera();

    // A tela continua utilizavel e o campo nao exibe lixo: o usuario escolhe a data na mao.
    expect(screen.getByDisplayValue('CNH')).toBeTruthy();
    expect(screen.queryByText(/Invalid Date/)).toBeNull();
  });

  it('deve exibir so a mensagem quando a extracao nao informa confianca', async () => {
    // O back pode responder sem o campo. Concatenar "| Confianca: UNDEFINED" seria pior do que
    // nao dizer nada.
    jest.mocked(scanDocumento).mockResolvedValue(
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

    expect(scanDocumento).not.toHaveBeenCalled();
    expect(Toast.show).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'error' }),
    );
  });
});
