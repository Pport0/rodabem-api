import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import Perfil from '../perfil';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { getMeuPerfil } from '@/services/userService';
import { useUser } from '@/hooks/useUser';

jest.mock('@/services/caminhaoService', () => ({ getMeuCaminhao: jest.fn() }));
jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn() }));
jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));

const perfilCompleto = {
  id: 1,
  nome: 'Gabriel Silva',
  email: 'gabriel@example.com',
  telefone: '62999999999',
  cpf: '529.982.247-25',
};

const caminhaoCompleto = {
  id: 10,
  placa: 'ABC1D23',
  modelo: 'FH 540',
  marca: 'VOLVO',
  anoFabricacao: 2020,
  cor: 'BRANCA',
};

const montarTela = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(<Perfil />, { wrapper });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useUser).mockReturnValue({ user: null } as any);
  jest.mocked(getMeuPerfil).mockResolvedValue(perfilCompleto as any);
  jest.mocked(getMeuCaminhao).mockResolvedValue(null);
});

describe('Tela de perfil - dados do usuario', () => {
  it('deve exibir os dados vindos da API', async () => {
    await montarTela();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('529.982.247-25')).toBeTruthy();
    expect(screen.getByText('62999999999')).toBeTruthy();
    expect(screen.getByText('gabriel@example.com')).toBeTruthy();
  });

  it('deve montar as iniciais a partir das duas primeiras palavras do nome', async () => {
    await montarTela();

    await waitFor(() => expect(screen.getByText('GS')).toBeTruthy());
  });

  it('deve usar no maximo duas iniciais', async () => {
    jest
      .mocked(getMeuPerfil)
      .mockResolvedValue({ ...perfilCompleto, nome: 'Ana Maria Souza Lima' } as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('AM')).toBeTruthy());
  });

  it('deve recorrer ao usuario armazenado enquanto a API nao responde', async () => {
    jest
      .mocked(useUser)
      .mockReturnValue({ user: { nome: 'Do Armazenamento' } } as any);
    jest.mocked(getMeuPerfil).mockReturnValue(new Promise(() => {}) as any);

    await montarTela();

    expect(screen.getAllByText('Do Armazenamento').length).toBeGreaterThan(0);
  });

  it('deve preferir os dados da API aos do armazenamento', async () => {
    jest
      .mocked(useUser)
      .mockReturnValue({ user: { nome: 'Do Armazenamento' } } as any);

    await montarTela();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.queryByText('Do Armazenamento')).toBeNull();
  });

  it('deve exibir rotulo generico quando nao ha nome disponivel', async () => {
    jest.mocked(getMeuPerfil).mockResolvedValue(null as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('Usuário')).toBeTruthy());
  });

  it('deve exibir a inicial padrao quando nao ha nome', async () => {
    jest.mocked(getMeuPerfil).mockResolvedValue(null as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('U')).toBeTruthy());
  });

  it('deve exibir travessao nos campos que o perfil nao traz', async () => {
    jest.mocked(getMeuPerfil).mockResolvedValue({ nome: 'Gabriel' } as any);

    await montarTela();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });
});

describe('Tela de perfil - caminhao vinculado', () => {
  it('deve exibir os dados do caminhao quando existe', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(caminhaoCompleto as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('ABC1D23')).toBeTruthy());
    expect(screen.getByText('FH 540')).toBeTruthy();
    expect(screen.getByText('VOLVO')).toBeTruthy();
    expect(screen.getByText('BRANCA')).toBeTruthy();
  });

  it('deve converter o ano de fabricacao para texto', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(caminhaoCompleto as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('2020')).toBeTruthy());
  });

  it('deve omitir marca, ano e cor quando o caminhao nao os possui', async () => {
    jest
      .mocked(getMeuCaminhao)
      .mockResolvedValue({ id: 10, placa: 'ABC1D23', modelo: 'FH 540' } as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('FH 540')).toBeTruthy());
    expect(screen.queryByText('Marca')).toBeNull();
    expect(screen.queryByText('Ano')).toBeNull();
    expect(screen.queryByText('Cor')).toBeNull();
  });

  it('deve oferecer o cadastro quando nao ha caminhao', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);

    await montarTela();

    await waitFor(() =>
      expect(screen.getByText('Nenhum caminhão cadastrado')).toBeTruthy(),
    );
    expect(screen.getByText('Cadastrar Caminhão')).toBeTruthy();
  });

  it('nao deve oferecer o cadastro quando ja existe caminhao', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(caminhaoCompleto as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('ABC1D23')).toBeTruthy());
    expect(screen.queryByText('Cadastrar Caminhão')).toBeNull();
  });
});

describe('Tela de perfil - navegacao', () => {
  it('deve levar ao cadastro de caminhao quando nao ha nenhum', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    await montarTela();

    await waitFor(() => expect(screen.getByText('Cadastrar Caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Cadastrar Caminhão'));

    expect(router.push).toHaveBeenCalledWith('/caminhoes/novo');
  });

  it('deve levar a edicao do caminhao existente', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(caminhaoCompleto as any);
    await montarTela();

    await waitFor(() => expect(screen.getByText('Editar caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Editar caminhão'));

    expect(router.push).toHaveBeenCalledWith('/caminhoes/novo');
  });
});

describe('Tela de perfil - alterar senha', () => {
  it('exibe o botao de alterar senha', async () => {
    await montarTela();

    expect(screen.getByText('ALTERAR SENHA')).toBeTruthy();
  });

  it('o botao de alterar senha nao executa acao alguma', async () => {
    await montarTela();

    await fireEvent.press(screen.getByText('ALTERAR SENHA'));

    expect(router.push).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
