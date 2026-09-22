jest.unmock('expo-router');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Text } from 'react-native';

import { api } from '@/services/api';
import Perfil from '../perfil';

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const perfilDaApi = {
  id: 1,
  nome: 'Gabriel Silva',
  email: 'gabriel@example.com',
  telefone: '62999999999',
  cpf: '529.982.247-25',
};

const caminhaoDaApi = {
  id: 10,
  placa: 'ABC1D23',
  modelo: 'FH 540',
  marca: 'VOLVO',
  anoFabricacao: 2020,
  cor: 'BRANCA',
};

const responderApi = (perfil: unknown, caminhao: unknown) => {
  jest.mocked(api.get).mockImplementation(((url: string) => {
    if (url === '/users/me') return Promise.resolve({ data: perfil });
    if (url === '/caminhao') return Promise.resolve({ data: caminhao });
    return Promise.reject(new Error(`rota nao mapeada: ${url}`));
  }) as any);
};

const montarApp = async (initialUrl = '/perfil') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderRouter(
    {
      _layout: () => (
        <QueryClientProvider client={queryClient}>
          <Slot />
        </QueryClientProvider>
      ),
      index: () => <Text>TELA INICIAL</Text>,
      perfil: Perfil,
      'caminhoes/novo': () => <Text>CADASTRO DE CAMINHAO</Text>,
    },
    { initialUrl },
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItem).mockReturnValue(null as any);
  responderApi(perfilDaApi, caminhaoDaApi);
});

describe('Fluxo do perfil', () => {
  it('deve percorrer da tela ate a API e exibir os dados do usuario', async () => {
    await montarApp();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('529.982.247-25')).toBeTruthy();
    expect(screen.getByText('gabriel@example.com')).toBeTruthy();
  });

  it('deve consultar os endpoints de perfil e de caminhao', async () => {
    await montarApp();

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/users/me'));
    expect(api.get).toHaveBeenCalledWith('/caminhao');
  });

  it('deve exibir o caminhao vinculado vindo da API', async () => {
    await montarApp();

    await waitFor(() => expect(screen.getByText('ABC1D23')).toBeTruthy());
    expect(screen.getByText('FH 540')).toBeTruthy();
    expect(screen.getByText('VOLVO')).toBeTruthy();
  });

  it('deve extrair o caminhao quando a API responde com envelope', async () => {
    responderApi(perfilDaApi, { message: 'ok', caminhao: caminhaoDaApi });

    await montarApp();

    await waitFor(() => expect(screen.getByText('ABC1D23')).toBeTruthy());
  });

  it('deve oferecer o cadastro quando a API informa que nao ha caminhao', async () => {
    responderApi(perfilDaApi, { message: 'Usuário não possui caminhão cadastrado' });

    await montarApp();

    await waitFor(() =>
      expect(screen.getByText('Nenhum caminhão cadastrado')).toBeTruthy(),
    );
  });

  it('deve navegar para o cadastro de caminhao', async () => {
    responderApi(perfilDaApi, { message: 'Usuário não possui caminhão cadastrado' });
    await montarApp();

    await waitFor(() => expect(screen.getByText('Cadastrar Caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Cadastrar Caminhão'));

    await waitFor(() => expect(screen.getByText('CADASTRO DE CAMINHAO')).toBeTruthy());
  });

  it('deve navegar para a edicao do caminhao existente', async () => {
    await montarApp();

    await waitFor(() => expect(screen.getByText('Editar caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Editar caminhão'));

    await waitFor(() => expect(screen.getByText('CADASTRO DE CAMINHAO')).toBeTruthy());
  });

  it('deve recorrer ao usuario do armazenamento quando a API de perfil falha', async () => {
    jest
      .mocked(SecureStore.getItem)
      .mockReturnValue(JSON.stringify({ nome: 'Do Armazenamento' }) as any);
    jest.mocked(api.get).mockImplementation(((url: string) => {
      if (url === '/users/me') return Promise.reject(new Error('401'));
      return Promise.resolve({ data: null });
    }) as any);

    await montarApp();

    await waitFor(() =>
      expect(screen.getAllByText('Do Armazenamento').length).toBeGreaterThan(0),
    );
  });

  it('deve permanecer utilizavel quando a API de caminhao falha', async () => {
    jest.mocked(api.get).mockImplementation(((url: string) => {
      if (url === '/users/me') return Promise.resolve({ data: perfilDaApi });
      return Promise.reject(new Error('500'));
    }) as any);

    await montarApp();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('Nenhum caminhão cadastrado')).toBeTruthy();
  });
});

describe('Contrato entre front-end e back-end no perfil', () => {
  it('o front consome exatamente os campos que GET /users/me devolve', async () => {
    await montarApp();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('529.982.247-25')).toBeTruthy();
    expect(screen.getByText('62999999999')).toBeTruthy();
    expect(screen.getByText('gabriel@example.com')).toBeTruthy();
  });

  it('o front tolera perfil sem os campos opcionais', async () => {
    responderApi({ id: 1, nome: 'Gabriel' }, null);

    await montarApp();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });

  it('o front tolera perfil com cpf nulo, como o back devolve quando nao ha cpf cifrado', async () => {
    responderApi({ ...perfilDaApi, cpf: null }, null);

    await montarApp();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
