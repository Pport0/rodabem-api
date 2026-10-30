import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import TermoPendente from '../termo-pendente';
import { aceitarTermo, getTermoVigente } from '@/services/termosService';
import { getMeuPerfil } from '@/services/userService';

const mockLogout = jest.fn();

jest.mock('@/services/termosService', () => ({
  aceitarTermo: jest.fn(),
  getTermoVigente: jest.fn(),
}));

jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn() }));

jest.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ logout: mockLogout, login: jest.fn(), signUp: jest.fn() }),
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn().mockResolvedValue(undefined) },
}));

const termo = {
  id: 1,
  versao: '1.0',
  conteudo: 'O RodaBem apresenta estimativas e nao se responsabiliza por decisoes comerciais.',
  publicadoEm: '2026-10-20T00:00:00.000Z',
};

const pendencias: ((valor: unknown) => void)[] = [];
const criarPendencia = () =>
  new Promise((resolve) => {
    pendencias.push(resolve);
  });

afterEach(() => {
  pendencias.splice(0).forEach((resolver) => resolver(undefined));
});

beforeEach(() => {
  jest.mocked(getTermoVigente).mockResolvedValue(termo as never);
  jest.mocked(getMeuPerfil).mockResolvedValue({ id: 7, termoPendente: true } as never);
  jest.mocked(aceitarTermo).mockResolvedValue(undefined as never);
});

const montar = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<TermoPendente />, { wrapper });
};

const botaoAceitar = async () => {
  await waitFor(() => expect(screen.getByText('ACEITAR E CONTINUAR')).toBeTruthy());
  return screen.getByText('ACEITAR E CONTINUAR');
};

describe('Tela de aceite pendente - conteudo', () => {
  it('deve exibir o texto do termo que o usuario precisa aceitar', async () => {
    await montar();

    await waitFor(() => expect(screen.getByText(termo.conteudo)).toBeTruthy());
  });

  it('deve identificar a versao e a data de publicacao do termo', async () => {
    await montar();

    await waitFor(() =>
      expect(
        screen.getByText('Termo de Uso e Isenção de Responsabilidade · versão 1.0'),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Publicado em 20/10/2026')).toBeTruthy();
  });

  it('deve avisar quando nao conseguiu carregar o termo, oferecendo nova tentativa', async () => {
    jest.mocked(getTermoVigente).mockRejectedValue(new Error('Network Error'));

    await montar();

    await waitFor(() =>
      expect(screen.getByText('Não foi possível carregar o termo vigente.')).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: 'Tentar carregar novamente' })).toBeTruthy();
  });

  it('nao deve oferecer o aceite enquanto o termo nao carregou', async () => {
    jest.mocked(getTermoVigente).mockReturnValue(criarPendencia() as never);

    await montar();

    expect(screen.queryByText('ACEITAR E CONTINUAR')).toBeNull();
  });
});

describe('Tela de aceite pendente - registro do aceite', () => {
  it('deve registrar o aceite da versao exibida, para o usuario autenticado', async () => {
    await montar();

    await fireEvent.press(await botaoAceitar());

    await waitFor(() => expect(aceitarTermo).toHaveBeenCalledWith('1.0', 7));
  });

  it('deve levar o usuario adiante depois do aceite, sem deixar volta para o bloqueio', async () => {
    await montar();

    await fireEvent.press(await botaoAceitar());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(drawer)/home'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('deve avisar quando o aceite nao pode ser registrado, mantendo o usuario na tela', async () => {
    jest.mocked(aceitarTermo).mockRejectedValue(new Error('Network Error'));

    await montar();
    await fireEvent.press(await botaoAceitar());

    await waitFor(() =>
      expect(
        screen.getByText(
          'Não foi possível registrar o aceite. Verifique sua conexão e tente novamente.',
        ),
      ).toBeTruthy(),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('nao deve oferecer o aceite de novo enquanto o primeiro esta em curso', async () => {
    jest.mocked(aceitarTermo).mockReturnValue(criarPendencia() as never);

    await montar();
    await fireEvent.press(await botaoAceitar());

    await waitFor(() => expect(screen.queryByText('ACEITAR E CONTINUAR')).toBeNull());
    expect(aceitarTermo).toHaveBeenCalledTimes(1);
  });
});

describe('Tela de aceite pendente - saidas', () => {
  it('deve permitir sair da conta em vez de aceitar', async () => {
    await montar();

    await waitFor(() => expect(screen.getByText('Sair da conta')).toBeTruthy());
    await fireEvent.press(screen.getByText('Sair da conta'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('nao deve deixar o usuario contornar o aceite pelo botao de voltar do aparelho', async () => {
    const { BackHandler } = require('react-native');
    const registrar = jest.spyOn(BackHandler, 'addEventListener');

    await montar();

    const [evento, tratador] = registrar.mock.calls[0];
    expect(evento).toBe('hardwareBackPress');
    expect(tratador()).toBe(true);

    registrar.mockRestore();
  });
});
