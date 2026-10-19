import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { ReactNode } from 'react';

import EditarPerfil from '../editarPerfil';
import { getMeuPerfil, updateUser } from '@/services/userService';
import { useUser } from '@/hooks/useUser';

jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn(), updateUser: jest.fn() }));
jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));

const mockMostrarToast = jest.fn();
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';
const memoria: Map<string, string> = (SecureStore as any).__memoria;

const perfilCompleto = {
  id: 1,
  nome: 'Gabriel Silva',
  email: 'gabriel@example.com',
  telefone: '62999999999',
  cpf: '529.982.247-25',
};

const PLACEHOLDER = {
  nome: 'Digite seu nome completo',
  email: 'Digite seu email',
  telefone: '(00) 00000-0000',
};

let queryClient: QueryClient;

const renderizar = async () => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  await render(<EditarPerfil />, { wrapper });
};

// O telefone so vem da API (o usuario armazenado nao o tem): esperar por ele garante que a API ja respondeu.
const montarTela = async () => {
  await renderizar();
  await waitFor(() =>
    expect(screen.getByPlaceholderText(PLACEHOLDER.telefone).props.value).toBe('(62) 99999-9999'),
  );
};

const salvar = async () => fireEvent.press(screen.getByText('SALVAR ALTERAÇÕES'));

beforeEach(() => {
  memoria.clear();
  jest.mocked(useUser).mockReturnValue({ user: { id: 1, nome: 'Gabriel Silva', email: 'gabriel@example.com' } } as any);
  jest.mocked(getMeuPerfil).mockResolvedValue(perfilCompleto as any);
});

describe('Editar perfil - preenchimento', () => {
  it('deve abrir com os dados atuais, com o telefone mascarado', async () => {
    await montarTela();

    expect(screen.getByPlaceholderText(PLACEHOLDER.email).props.value).toBe('gabriel@example.com');
    expect(screen.getByPlaceholderText(PLACEHOLDER.nome).props.value).toBe('Gabriel Silva');
    expect(screen.getByPlaceholderText(PLACEHOLDER.email).props.value).toBe('gabriel@example.com');
  });

  it('deve abrir com o usuario armazenado enquanto a API nao responde', async () => {
    jest.mocked(getMeuPerfil).mockReturnValue(new Promise(() => {}) as any);

    await renderizar();

    expect(screen.getByPlaceholderText(PLACEHOLDER.nome).props.value).toBe('Gabriel Silva');
    expect(screen.getByPlaceholderText(PLACEHOLDER.email).props.value).toBe('gabriel@example.com');
  });

  it('nao deve apagar o que o usuario digitou quando a API responde depois', async () => {
    let responderApi: (valor: unknown) => void = () => {};
    jest.mocked(getMeuPerfil).mockReturnValue(new Promise((resolve) => (responderApi = resolve)) as any);
    await renderizar();

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.nome), 'Nome Digitado');
    await act(async () => responderApi(perfilCompleto));

    expect(screen.getByPlaceholderText(PLACEHOLDER.nome).props.value).toBe('Nome Digitado');
  });
});

describe('Editar perfil - validacao', () => {
  it('deve recusar email em formato invalido, sem chamar a API', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.email), 'nao-e-um-email');
    await salvar();

    expect(await screen.findByText('Email inválido')).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('deve exigir email e nome', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.email), '   ');
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.nome), '');
    await salvar();

    expect(await screen.findByText('Email é obrigatório')).toBeTruthy();
    expect(screen.getByText('Nome completo é obrigatório')).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('deve recusar telefone incompleto', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.telefone), '6299');
    await salvar();

    expect(await screen.findByText('Telefone inválido')).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe('Editar perfil - envio', () => {
  it('deve enviar nome e email sem espacos e o telefone so com digitos', async () => {
    jest.mocked(updateUser).mockResolvedValue({ ...perfilCompleto, nome: 'Gabriel Souza' } as any);
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.nome), '  Gabriel Souza  ');
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.email), ' novo@example.com ');
    await salvar();

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(1, {
        nome: 'Gabriel Souza',
        email: 'novo@example.com',
        telefone: '62999999999',
      }),
    );
  });

  it('deve enviar telefone nulo quando o campo e apagado', async () => {
    jest.mocked(updateUser).mockResolvedValue({ ...perfilCompleto, telefone: null } as any);
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.telefone), '');
    await salvar();

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(1, expect.objectContaining({ telefone: null })),
    );
  });
});

describe('Editar perfil - sucesso', () => {
  const atualizado = { id: 1, nome: 'Gabriel Souza', email: 'novo@example.com', telefone: '62988887777' };

  it('deve avisar o sucesso e voltar ao perfil', async () => {
    jest.mocked(updateUser).mockResolvedValue(atualizado as any);
    await montarTela();

    await salvar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockMostrarToast).toHaveBeenCalledWith(
      'Dados atualizados com sucesso',
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('deve atualizar o perfil em cache, mantendo o que a API nao devolve', async () => {
    jest.mocked(updateUser).mockResolvedValue(atualizado as any);
    await montarTela();

    await salvar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(queryClient.getQueryData(['perfil'])).toEqual({
      ...perfilCompleto,
      nome: 'Gabriel Souza',
      email: 'novo@example.com',
      telefone: '62988887777',
    });
  });

  it('deve atualizar o usuario gravado, que alimenta home e menu', async () => {
    jest.mocked(updateUser).mockResolvedValue(atualizado as any);
    await montarTela();

    await salvar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(JSON.parse(memoria.get(CHAVE_USUARIO)!)).toEqual({
      id: 1,
      nome: 'Gabriel Souza',
      email: 'novo@example.com',
      telefone: '62988887777',
    });
  });
});

describe('Editar perfil - falha', () => {
  it('deve exibir a mensagem da API e permanecer na tela', async () => {
    jest.mocked(updateUser).mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { message: ['email must be an email'] } },
      }),
    );
    await montarTela();

    await salvar();

    await waitFor(() =>
      expect(mockMostrarToast).toHaveBeenCalledWith(
        'email must be an email',
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(router.back).not.toHaveBeenCalled();
    expect(memoria.has(CHAVE_USUARIO)).toBe(false);
  });
});
