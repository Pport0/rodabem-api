import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import Perfil from '../perfil';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { getMeuPerfil } from '@/services/userService';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/contexts/authContext';

jest.mock('@/services/caminhaoService', () => ({ getMeuCaminhao: jest.fn() }));
jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn() }));
jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));
// a tela usa useAuth() para o logout; o provedor real arrastaria Toast, SecureStore e router.
jest.mock('@/contexts/authContext', () => ({ useAuth: jest.fn() }));

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
  jest.mocked(useAuth).mockReturnValue({ logout: jest.fn() } as any);
  jest.mocked(getMeuPerfil).mockResolvedValue(perfilCompleto as any);
  jest.mocked(getMeuCaminhao).mockResolvedValue(null);
});

describe('Tela de perfil - dados do usuario', () => {



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



  it('deve exibir travessao nos campos que o perfil nao traz', async () => {
    jest.mocked(getMeuPerfil).mockResolvedValue({ nome: 'Gabriel' } as any);

    await montarTela();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });
});

describe('Tela de perfil - caminhao vinculado', () => {


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


});

describe('Tela de perfil - navegacao', () => {

  it('deve levar a edicao do caminhao existente', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(caminhaoCompleto as any);
    await montarTela();

    await waitFor(() => expect(screen.getByText('Editar caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Editar caminhão'));

    expect(router.push).toHaveBeenCalledWith('/caminhoes/editar');
  });
});

describe('Tela de perfil - alterar senha', () => {

  it('o botao de alterar senha deve levar a alguma tela', async () => {
    await montarTela();

    await fireEvent.press(screen.getByText('ALTERAR SENHA'));

    expect(
      jest.mocked(router.push).mock.calls.length +
        jest.mocked(router.navigate).mock.calls.length,
    ).toBeGreaterThan(0);
  });
});
