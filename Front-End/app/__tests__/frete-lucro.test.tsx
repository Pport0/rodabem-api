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
const CAMPO_PRECO = 'Ex: 6.29';
const CAMPO_LUCRO = 'Ex: 20';

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
  custoTotal: 835.88,
  tipoCarga: 'GERAL' as const,
  retornoVazio: false,
  altoDesempenho: false,
  valorMinimoAntt: 6471.46,
  valorLiquidoEstimado: 5635.58,
  abaixoMinimoAntt: false,
  percentualLucroDesejado: null,
  valorSugerido: null,
  sugeridoAbaixoDoMinimo: null,
  aviso: null,
};

const comLucro = (percentual: number, valorSugerido: number, sobrescreve = {}) => ({
  ...simulacao,
  percentualLucroDesejado: percentual,
  valorSugerido,
  sugeridoAbaixoDoMinimo: valorSugerido < simulacao.valorMinimoAntt,
  ...sobrescreve,
});

const montarTela = async () => {
  jest.mocked(getHistoricoFrete).mockResolvedValue([] as never);
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return render(<FreteScreen />, { wrapper });
};

const preencherObrigatorios = async () => {
  const [origem, destino] = screen.getAllByPlaceholderText(CAMPO_ORIGEM_DESTINO);
  await fireEvent.changeText(origem, 'Goiania, GO');
  await fireEvent.changeText(destino, 'Belem, PA');
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PRECO), '6,29');
};

const simular = async () => fireEvent.press(screen.getByText('SIMULAR FRETE'));
const enviado = () => jest.mocked(simularFrete).mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Tela de frete - lucro desejado (RF-14, #42)', () => {
  // it.todo da tester em frete.test.tsx: "deve oferecer um campo para o percentual de lucro desejado"
  it('deve oferecer um campo opcional para o percentual de lucro desejado', async () => {
    await montarTela();

    expect(screen.getByText('LUCRO DESEJADO (%)')).toBeTruthy();
    expect(screen.getByPlaceholderText(CAMPO_LUCRO)).toBeTruthy();
  });

  // it.todo da tester: "deve enviar o percentual informado na simulacao"
  it('deve enviar o percentual informado na simulacao', async () => {
    jest.mocked(simularFrete).mockResolvedValue(comLucro(20, 1003.06) as never);
    await montarTela();
    await preencherObrigatorios();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '20');
    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());
    expect(enviado()).toMatchObject({ percentualLucroDesejado: 20 });
  });

  it('deve aceitar virgula decimal no percentual', async () => {
    jest.mocked(simularFrete).mockResolvedValue(comLucro(12.5, 940.37) as never);
    await montarTela();
    await preencherObrigatorios();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '12,5');
    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());
    expect(enviado()).toMatchObject({ percentualLucroDesejado: 12.5 });
  });

  it('deve aceitar lucro zero, que cobre os custos sem margem', async () => {
    jest.mocked(simularFrete).mockResolvedValue(comLucro(0, 835.88) as never);
    await montarTela();
    await preencherObrigatorios();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '0');
    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());
    expect(enviado()).toMatchObject({ percentualLucroDesejado: 0 });
    expect(await screen.findByText('Valor sugerido (0% de lucro)')).toBeTruthy();
  });

  it('nao deve deixar digitar percentual negativo', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '-10');

    expect(screen.getByPlaceholderText(CAMPO_LUCRO).props.value).toBe('10');
  });

  it('nao deve enviar o percentual nem exibir valor sugerido quando o campo fica vazio', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);
    await montarTela();
    await preencherObrigatorios();

    await simular();

    await waitFor(() => expect(screen.getByText('ULTIMA SIMULACAO')).toBeTruthy());
    expect(enviado().percentualLucroDesejado).toBeUndefined();
    expect(screen.queryByText(/Valor sugerido/)).toBeNull();
  });

  // it.todo da tester: "deve exibir o valor sugerido de cobranca junto com o piso e os custos"
  // e "deve exibir o valor sugerido no padrao brasileiro"
  it('deve exibir piso, custos e valor sugerido juntos, no padrao brasileiro', async () => {
    jest.mocked(simularFrete).mockResolvedValue(comLucro(20, 7003.06) as never);
    await montarTela();
    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '20');

    await simular();

    expect(await screen.findByText('Valor sugerido (20% de lucro)')).toBeTruthy();
    expect(screen.getByText(/R\$\s7\.003,06/)).toBeTruthy();
    expect(screen.getByText('Valor minimo ANTT')).toBeTruthy();
    expect(screen.getByText(/R\$\s6\.471,46/)).toBeTruthy();
    expect(screen.getByText('Custos estimados (combustível + pedágios)')).toBeTruthy();
    expect(screen.getByText(/R\$\s835,88/)).toBeTruthy();
  });

  it('deve exibir o percentual com virgula no rotulo do valor sugerido', async () => {
    jest.mocked(simularFrete).mockResolvedValue(comLucro(12.5, 940.37) as never);
    await montarTela();
    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '12,5');

    await simular();

    expect(await screen.findByText('Valor sugerido (12,5% de lucro)')).toBeTruthy();
  });

  // it.todo da tester: "deve avisar quando o valor sugerido fica abaixo do piso da ANTT"
  it('deve avisar em destaque quando o valor sugerido fica abaixo do piso da ANTT', async () => {
    jest.mocked(simularFrete).mockResolvedValue(
      comLucro(20, 1003.06, { aviso: 'O valor sugerido está abaixo do piso mínimo da ANTT.' }) as never,
    );
    await montarTela();
    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LUCRO), '20');

    await simular();

    expect(await screen.findByText('O valor sugerido está abaixo do piso mínimo da ANTT.')).toBeTruthy();
  });
});

describe('Tela de frete - composicao veicular (#42)', () => {
  it('deve enviar com carreta por padrao', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);
    await montarTela();
    await preencherObrigatorios();

    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());
    expect(enviado()).toMatchObject({ composicaoVeicular: 'COM_CARRETA' });
  });

  it('deve enviar sem carreta quando o usuario escolhe somente o cavalo, e explicar a restricao', async () => {
    jest.mocked(simularFrete).mockResolvedValue(simulacao as never);
    await montarTela();
    await preencherObrigatorios();
    expect(screen.queryByText(/só tem valores para 4 eixos ou mais/)).toBeNull();

    await fireEvent.press(screen.getByText('Somente cavalo (sem carreta)'));
    expect(screen.getByText('Sem carreta, a ANTT só tem valores para 4 eixos ou mais.')).toBeTruthy();
    await simular();

    await waitFor(() => expect(simularFrete).toHaveBeenCalled());
    expect(enviado()).toMatchObject({ composicaoVeicular: 'SEM_CARRETA' });
  });
});

describe('Tela de frete - sem tabela da ANTT (404)', () => {
  const erro404 = (eixos: number, tipo: string) => ({
    response: {
      status: 404,
      data: { message: `Não foram encontrados valores da ANTT para ${eixos} eixos com carga do tipo ${tipo}.` },
    },
  });

  it('deve trocar o codigo do tipo de carga pelo nome e explicar a restricao sem carreta', async () => {
    jest.mocked(simularFrete).mockRejectedValue(erro404(3, 'GRANEL_SOLIDO') as never);
    await montarTela();
    await preencherObrigatorios();
    await fireEvent.press(screen.getByText('Granel solido'));
    await fireEvent.press(screen.getByText('Somente cavalo (sem carreta)'));

    await simular();

    const esperado =
      'Não foram encontrados valores da ANTT para 3 eixos com carga do tipo granel solido. ' +
      'Sem carreta, a ANTT só tem valores para 4 eixos ou mais.';
    expect(await screen.findByText(esperado)).toBeTruthy();
    expect(Toast.show).toHaveBeenCalledWith(esperado, expect.objectContaining({ type: 'error' }));
    expect(screen.queryByText(/GRANEL_SOLIDO/)).toBeNull();
  });

  it('nao deve acrescentar a restricao de eixos quando a simulacao e com carreta', async () => {
    jest.mocked(simularFrete).mockRejectedValue(erro404(9, 'GERAL') as never);
    await montarTela();
    await preencherObrigatorios();

    await simular();

    expect(
      await screen.findByText('Não foram encontrados valores da ANTT para 9 eixos com carga do tipo geral.'),
    ).toBeTruthy();
  });

  it('deve tirar a mensagem de erro quando uma nova simulacao da certo', async () => {
    jest.mocked(simularFrete).mockRejectedValueOnce(erro404(3, 'GERAL') as never);
    jest.mocked(simularFrete).mockResolvedValueOnce(simulacao as never);
    await montarTela();
    await preencherObrigatorios();

    await simular();
    expect(await screen.findByText(/Não foram encontrados valores da ANTT/)).toBeTruthy();
    await simular();

    await waitFor(() => expect(screen.getByText('ULTIMA SIMULACAO')).toBeTruthy());
    expect(screen.queryByText(/Não foram encontrados valores da ANTT/)).toBeNull();
  });
});
