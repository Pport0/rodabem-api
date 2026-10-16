import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { ReactNode } from 'react';

import FreteScreen from '../frete';
import { getHistoricoFrete, simularFrete } from '@/services/freteService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/freteService', () => ({
  getHistoricoFrete: jest.fn(),
  simularFrete: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

const CAMPO_ORIGEM_DESTINO = 'Cidade, estado ou endereco';
const CAMPO_PARADAS = 'Uma parada por linha';
const CAMPO_PRECO = 'Ex: 6.29';
const CAMPO_PEDAGIOS = 'Opcional';
const CAMPO_CONSUMO = 'Opcional, use para sobrescrever a media do app';

const simulacao = {
  simulacaoId: 1,
  origem: 'Goiania, GO',
  destino: 'Belem, PA',
  distanciaKm: 1250.5,
  duracaoMinutos: 1320,
  pedagiosEstimados: 180.4,
  consumoMedioKmL: 12,
  litrosNecessarios: 104.21,
  custoCombustivel: 655.48,
  tipoCarga: 'GERAL' as const,
  retornoVazio: false,
  altoDesempenho: false,
  valorMinimoAntt: 6471.46,
  valorLiquidoEstimado: 5635.58,
  abaixoMinimoAntt: false,
  aviso: null,
};

const itemHistorico = {
  id: 9,
  origem: 'Anapolis, GO',
  destino: 'Uberlandia, MG',
  distanciaKm: 980.4,
  pedagiosEstimados: 95.2,
  consumoMedioKmL: 11,
  precoCombustivel: 6.29,
  litrosNecessarios: 89.13,
  custoCombustivel: 560.63,
  tipoCarga: 'GERAL' as const,
  retornoVazio: false,
  altoDesempenho: false,
  valorMinimoAntt: 5074.31,
  valorLiquidoEstimado: 4418.48,
  createdAt: '2026-02-10T12:00:00.000Z',
};

const montarTela = async (historico: unknown[] = []) => {
  jest.mocked(getHistoricoFrete).mockResolvedValue(historico as never);

  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<FreteScreen />, { wrapper });
};

const preencherObrigatorios = async (preco = '6,29') => {
  const [origem, destino] = screen.getAllByPlaceholderText(CAMPO_ORIGEM_DESTINO);

  await fireEvent.changeText(origem, 'Goiania, GO');
  await fireEvent.changeText(destino, 'Belem, PA');
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PRECO), preco);
};

const simular = async () => fireEvent.press(screen.getByText('SIMULAR FRETE'));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Tela de frete - padrao brasileiro de numeros', () => {

  it('deve exibir distancia, litros e consumo da ultima simulacao no padrao brasileiro', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);

    await montarTela();
    await preencherObrigatorios();
    await simular();

    await waitFor(() => expect(screen.getByText('ULTIMA SIMULACAO')).toBeTruthy());

    expect(screen.getByText('1.250,5 km')).toBeTruthy();
    expect(screen.getByText('104,21 L')).toBeTruthy();
    expect(screen.getByText('12,00 km/L')).toBeTruthy();
  });

  it('deve exibir a distancia do historico no padrao brasileiro', async () => {
    await montarTela([itemHistorico]);

    await waitFor(() => expect(screen.getByText('Anapolis, GO')).toBeTruthy());

    expect(screen.getByText('980,4 km')).toBeTruthy();
  });
});

describe('Tela de frete - validacao do formulario', () => {
  it('deve recusar a simulacao sem origem, destino e preco do combustivel', async () => {
    await montarTela();

    await simular();

    expect(simularFrete).not.toHaveBeenCalled();
    expect(Toast.show).toHaveBeenCalledWith(
      expect.stringContaining('Preencha origem, destino e preco do combustivel'),
      expect.anything(),
    );
  });

  it('deve recusar a simulacao quando falta apenas o preco do combustivel', async () => {
    await montarTela();

    const [origem, destino] = screen.getAllByPlaceholderText(CAMPO_ORIGEM_DESTINO);
    await fireEvent.changeText(origem, 'Goiania, GO');
    await fireEvent.changeText(destino, 'Belem, PA');

    await simular();

    expect(simularFrete).not.toHaveBeenCalled();
  });
});

describe('Tela de frete - envio', () => {
  it('deve enviar os dados da viagem como o usuario informou', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);

    await montarTela();
    await preencherObrigatorios('6,29');

    await fireEvent.changeText(
      screen.getByPlaceholderText(CAMPO_PARADAS),
      'Palmas, TO\n  Maraba, PA  \n\n',
    );
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PEDAGIOS), '180,40');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_CONSUMO), '12,5');

    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());

    expect(jest.mocked(simularFrete).mock.calls[0][0]).toMatchObject({
      origem: 'Goiania, GO',
      destino: 'Belem, PA',
      paradasIntermediarias: ['Palmas, TO', 'Maraba, PA'],
      precoCombustivel: 6.29,
      pedagiosManual: 180.4,
      consumoMedioKmLOverride: 12.5,
      tipoCarga: 'GERAL',
    });
  });

  it('deve enviar o tipo de carga escolhido pelo usuario', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);

    await montarTela();
    await preencherObrigatorios();
    await fireEvent.press(screen.getByText('Frigorificada'));
    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());

    expect(jest.mocked(simularFrete).mock.calls[0][0]).toMatchObject({
      tipoCarga: 'FRIGORIFICADA',
    });
  });

  it('deve enviar retorno vazio e alto desempenho quando o usuario marca', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);

    await montarTela();
    await preencherObrigatorios();

    const [retornoVazio, altoDesempenho] = screen.getAllByRole('switch');
    await fireEvent(retornoVazio, 'valueChange', true);
    await fireEvent(altoDesempenho, 'valueChange', true);

    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());

    expect(jest.mocked(simularFrete).mock.calls[0][0]).toMatchObject({
      retornoVazio: true,
      altoDesempenho: true,
    });
  });
});

describe('Tela de frete - resposta do servidor', () => {
  it.each([
    [
      'texto',
      { response: { data: { message: 'Cadastre o numero de eixos do seu caminhao.' } } },
      'Cadastre o numero de eixos do seu caminhao.',
    ],
    [
      'lista',
      { response: { data: { message: ['Cadastre o numero de eixos do seu caminhao.'] } } },
      'Cadastre o numero de eixos do seu caminhao.',
    ],
    ['nada', new Error('Network request failed'), 'Nao foi possivel calcular o frete.'],
  ])('deve explicar a recusa quando o servidor responde com %s', async (_, erro, naTela) => {
    jest.mocked(simularFrete).mockRejectedValue(erro as never);

    await montarTela();
    await preencherObrigatorios();
    await simular();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(naTela, expect.anything()),
    );
  });

  it('deve impedir o segundo toque enquanto o calculo esta em andamento', async () => {
    let responder: (valor: unknown) => void = () => {};
    jest
      .mocked(simularFrete)
      .mockReturnValue(new Promise((resolve) => (responder = resolve)) as never);

    await montarTela();
    await preencherObrigatorios();
    await simular();

    await waitFor(() => expect(screen.getByText('CALCULANDO...')).toBeTruthy());
    expect(screen.queryByText('SIMULAR FRETE')).toBeNull();

    responder(simulacao);
    await waitFor(() => expect(screen.getByText('ULTIMA SIMULACAO')).toBeTruthy());
  });

  it('deve exibir duracao abaixo de uma hora so em minutos', async () => {
    jest
      .mocked(simularFrete)
      .mockResolvedValue({ ...simulacao, duracaoMinutos: 45 } as never);

    await montarTela();
    await preencherObrigatorios();
    await simular();

    await waitFor(() => expect(screen.getByText('45 min')).toBeTruthy());
  });

  it('deve avisar quando a simulacao fica abaixo do minimo da ANTT', async () => {
    jest.mocked(simularFrete).mockResolvedValue({
      ...simulacao,
      abaixoMinimoAntt: true,
      aviso: 'Valor abaixo do piso minimo da ANTT.',
    } as never);

    await montarTela();
    await preencherObrigatorios();
    await simular();

    await waitFor(() =>
      expect(screen.getByText('Valor abaixo do piso minimo da ANTT.')).toBeTruthy(),
    );
  });
});

describe('Tela de frete - percentual de lucro desejado (RF-14)', () => {

  it.todo('deve oferecer um campo para o percentual de lucro desejado');

  it.todo('deve enviar o percentual informado na simulacao');

  it.todo('deve exibir o valor sugerido de cobranca junto com o piso e os custos');

  it.todo('deve exibir o valor sugerido no padrao brasileiro');

  it.todo('deve avisar quando o valor sugerido fica abaixo do piso da ANTT');
});

describe('Tela de frete - historico', () => {
  it('deve mostrar o estado vazio quando nao ha simulacao registrada', async () => {
    await montarTela([]);

    await waitFor(() =>
      expect(screen.getByText('Nenhuma simulacao registrada')).toBeTruthy(),
    );
  });
});
