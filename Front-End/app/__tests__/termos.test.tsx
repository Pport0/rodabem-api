import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { ReactNode } from 'react';

import Termos from '../termos';
import { getAceiteLocal, getTermoVigente } from '@/services/termosService';
import { getMeuPerfil } from '@/services/userService';

jest.mock('@/services/termosService', () => ({
  getAceiteLocal: jest.fn(),
  getTermoVigente: jest.fn(),
}));

jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn() }));

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
  pendencias.splice(0).forEach((resolver) => resolver(null));
});

beforeEach(() => {
  jest.mocked(getTermoVigente).mockResolvedValue(termo as never);
  jest.mocked(getMeuPerfil).mockResolvedValue({ id: 7, termoPendente: false } as never);
  jest.mocked(getAceiteLocal).mockResolvedValue(null as never);
});

const montar = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<Termos />, { wrapper });
};

describe('Tela de consulta ao termo - conteudo', () => {
  it('deve exibir o texto vigente do termo', async () => {
    await montar();

    await waitFor(() => expect(screen.getByText(termo.conteudo)).toBeTruthy());
  });

  it('deve identificar a versao e a data de publicacao', async () => {
    await montar();

    await waitFor(() => expect(screen.getByText('Versão 1.0')).toBeTruthy());
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

  it('deve recarregar o termo quando o usuario pede nova tentativa', async () => {
    jest.mocked(getTermoVigente).mockRejectedValueOnce(new Error('Network Error'));
    jest.mocked(getTermoVigente).mockResolvedValueOnce(termo as never);

    await montar();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tentar carregar novamente' })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar carregar novamente' }));

    await waitFor(() => expect(screen.getByText(termo.conteudo)).toBeTruthy());
    expect(screen.queryByText('Não foi possível carregar o termo vigente.')).toBeNull();
  });

  it('deve dizer que a data nao esta disponivel quando o termo nao traz publicacao', async () => {
    jest
      .mocked(getTermoVigente)
      .mockResolvedValue({ ...termo, publicadoEm: undefined } as never);

    await montar();

    await waitFor(() => expect(screen.getByText('Publicado em Não disponível')).toBeTruthy());
  });
});

describe('Tela de consulta ao termo - situacao do aceite', () => {
  it('deve avisar que o aceite da versao vigente esta pendente', async () => {
    jest.mocked(getMeuPerfil).mockResolvedValue({ id: 7, termoPendente: true } as never);

    await montar();

    await waitFor(() =>
      expect(screen.getByText('O aceite desta versão está pendente.')).toBeTruthy(),
    );
  });

  it('deve informar a data do aceite guardada no aparelho', async () => {
    jest
      .mocked(getAceiteLocal)
      .mockResolvedValue({ versao: '1.0', aceitoEm: '2026-10-22T13:00:00.000Z', userId: 7 } as never);

    await montar();

    await waitFor(() =>
      expect(
        screen.getByText('Aceite registrado neste dispositivo em 22/10/2026.'),
      ).toBeTruthy(),
    );
  });

  it('nao deve apresentar como da versao vigente um aceite guardado de outra versao', async () => {
    jest
      .mocked(getAceiteLocal)
      .mockResolvedValue({ versao: '0.9', aceitoEm: '2026-08-01T13:00:00.000Z', userId: 7 } as never);

    await montar();

    await waitFor(() =>
      expect(
        screen.getByText('A data do aceite não está disponível neste dispositivo.'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/01\/08\/2026/)).toBeNull();
  });

  it('deve avisar que esta verificando enquanto o perfil nao respondeu', async () => {
    jest.mocked(getMeuPerfil).mockReturnValue(criarPendencia() as never);

    await montar();

    await waitFor(() =>
      expect(screen.getByText('Verificando o registro do aceite...')).toBeTruthy(),
    );
  });

  it('deve avisar quando nao conseguiu consultar o status do aceite', async () => {
    jest.mocked(getMeuPerfil).mockRejectedValue(new Error('Network Error'));

    await montar();

    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível consultar o status do aceite agora.'),
      ).toBeTruthy(),
    );
    expect(screen.getByText(termo.conteudo)).toBeTruthy();
  });
});
