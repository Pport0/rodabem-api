import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import Home from '../(drawer)/home';
import { useUser } from '@/hooks/useUser';
import { getAlertasVencimento } from '@/services/documentoService';

jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));

// #29: a Home passou a buscar os alertas de vencimento (useQuery), entao precisa de
// QueryClientProvider e do servico mockado. Por padrao, sem alertas.
jest.mock('@/services/documentoService', () => ({ getAlertasVencimento: jest.fn() }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

beforeEach(() => {
  jest
    .mocked(getAlertasVencimento)
    .mockResolvedValue({ alertas: [], mensagem: 'Nenhum documento a vencer.' });
});

const montar = async (user: unknown = { nome: 'Gabriel Silva Souza' }) => {
  jest.mocked(useUser).mockReturnValue({ user } as never);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const tela = await render(<Home />, { wrapper });
  // deixa a busca dos alertas assentar (o react-query notifica num setTimeout 0) antes das asserções
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  return tela;
};

describe('Tela inicial - saudacao', () => {
  it('deve chamar o motorista pelo primeiro nome', async () => {
    await montar({ nome: 'Gabriel Silva Souza' });

    expect(screen.getByText('Olá, Gabriel!')).toBeTruthy();
  });

  it('deve saudar sem nome enquanto o perfil nao carregou', async () => {
    await montar(null);

    expect(screen.getByText('Olá, Motorista!')).toBeTruthy();
  });
});

describe('Tela inicial - caminhos para os modulos', () => {
  it.each([
    ['MEU CAMINHÃO', '/perfil'],
    ['MEUS DOCUMENTOS', '/meusDocumentos'],
    ['ABASTECIMENTOS', '/abastecimentos'],
    ['CALCULADORA DE FRETE', '/frete'],
  ])('deve levar de %s para %s', async (cartao, destino) => {
    await montar();

    await fireEvent.press(screen.getByText(cartao));

    expect(router.push).toHaveBeenCalledWith(destino);
  });

  it.todo('deve avisar na tela inicial quando nao ha caminhao cadastrado');
});

describe('Tela inicial - alerta de vencimento (#29, RNE-11)', () => {
  const alerta = (nome: string, diasRestantes: number, id = 1) => ({
    id,
    nome,
    numero: '123',
    dataVencimento: '2026-11-02T12:00:00.000Z',
    caminhaoId: null,
    vinculo: 'MOTORISTA' as const,
    diasRestantes,
  });

  const comAlertas = (...alertas: ReturnType<typeof alerta>[]) =>
    jest.mocked(getAlertasVencimento).mockResolvedValue({
      alertas,
      mensagem: `${alertas.length} documento(s) vencendo nos próximos 30 dias.`,
    });

  it('deve exibir o documento que vence primeiro, sem precisar navegar', async () => {
    comAlertas(alerta('CNH', 15));

    await montar();

    expect(await screen.findByText('ALERTA')).toBeTruthy();
    expect(screen.getByText('CNH vence em 15 dias')).toBeTruthy();
  });

  it.each([
    [0, 'CNH vence hoje'],
    [1, 'CNH vence amanhã'],
  ])('deve descrever o prazo de %i dia(s) como "%s"', async (dias, texto) => {
    comAlertas(alerta('CNH', dias));

    await montar();

    expect(await screen.findByText(texto)).toBeTruthy();
  });

  it('deve avisar quantos outros documentos estao perto do vencimento', async () => {
    comAlertas(alerta('CNH', 5, 1), alerta('CRLV 2026', 12, 2), alerta('ANTT', 20, 3));

    await montar();

    expect(await screen.findByText('CNH vence em 5 dias')).toBeTruthy();
    expect(screen.getByText('e mais 2 documentos perto do vencimento')).toBeTruthy();
  });

  it('deve levar para a lista de documentos ao tocar no alerta', async () => {
    comAlertas(alerta('CNH', 15));
    await montar();

    await fireEvent.press(await screen.findByText('CNH vence em 15 dias'));

    expect(router.push).toHaveBeenCalledWith('/meusDocumentos');
  });

  it('nao deve exibir alerta quando nenhum documento esta perto do vencimento', async () => {
    await montar();

    await screen.findByText('Olá, Gabriel!');
    expect(getAlertasVencimento).toHaveBeenCalled();
    expect(screen.queryByText('ALERTA')).toBeNull();
  });

  it('nao deve quebrar a tela inicial quando a busca de alertas falha', async () => {
    jest.mocked(getAlertasVencimento).mockRejectedValue(new Error('Network Error'));

    await montar();

    expect(await screen.findByText('MEUS DOCUMENTOS')).toBeTruthy();
    expect(screen.queryByText('ALERTA')).toBeNull();
  });
});
