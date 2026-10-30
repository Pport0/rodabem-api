import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import ForgotPassword from '../forgotPassword';
import { forgotPassword } from '@/services/authService';

jest.mock('@/services/authService', () => ({ forgotPassword: jest.fn() }));

const PLACEHOLDER_EMAIL = 'Digite o e-mail cadastrado';
const MENSAGEM_GENERICA = 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.';

const enviar = async (email: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER_EMAIL), email);
  await fireEvent.press(screen.getByText('ENVIAR'));
};

describe('Esqueci minha senha', () => {
  // it.todo da tester em abertura.test.tsx: "deve pedir o e-mail do usuario"
  it('deve pedir o e-mail do usuario', async () => {
    await render(<ForgotPassword />);

    expect(screen.getByText('E-MAIL')).toBeTruthy();
    expect(screen.getByPlaceholderText(PLACEHOLDER_EMAIL)).toBeTruthy();
  });

  it('deve recusar e-mail em branco sem chamar a API', async () => {
    await render(<ForgotPassword />);

    await enviar('  ');

    expect(screen.getByText('Email é obrigatório')).toBeTruthy();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('deve recusar e-mail em formato invalido sem chamar a API', async () => {
    await render(<ForgotPassword />);

    await enviar('gabriel@');

    expect(screen.getByText('Email inválido')).toBeTruthy();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  // it.todo da tester: "deve enviar um link ou codigo de uso unico, com prazo de validade".
  // O token e a validade sao do back; aqui, o app pede o envio e informa o prazo.
  it('deve pedir o envio do link e do codigo com o e-mail sem espacos, informando o prazo', async () => {
    jest.mocked(forgotPassword).mockResolvedValue({ message: MENSAGEM_GENERICA });
    await render(<ForgotPassword />);

    await enviar(' gabriel@example.com ');

    expect(forgotPassword).toHaveBeenCalledWith('gabriel@example.com');
    expect(await screen.findByText(/valem por 30 minutos/)).toBeTruthy();
  });

  // it.todo da tester: "nao deve revelar se o e-mail informado existe na base"
  it('nao deve revelar se o e-mail existe: exibe a mensagem generica do back', async () => {
    jest.mocked(forgotPassword).mockResolvedValue({ message: MENSAGEM_GENERICA });
    await render(<ForgotPassword />);

    await enviar('ninguem@example.com');

    expect(await screen.findByText(MENSAGEM_GENERICA)).toBeTruthy();
    expect(screen.queryByText(/não encontrado|não cadastrado/i)).toBeNull();
  });

  it('deve levar a tela de redefinir depois do envio', async () => {
    jest.mocked(forgotPassword).mockResolvedValue({ message: MENSAGEM_GENERICA });
    await render(<ForgotPassword />);
    expect(screen.queryByText('JÁ TENHO O CÓDIGO')).toBeNull();

    await enviar('gabriel@example.com');
    await fireEvent.press(await screen.findByText('JÁ TENHO O CÓDIGO'));

    expect(router.push).toHaveBeenCalledWith('/reset-password');
  });

  it('deve permitir enviar de novo', async () => {
    jest.mocked(forgotPassword).mockResolvedValue({ message: MENSAGEM_GENERICA });
    await render(<ForgotPassword />);

    await enviar('gabriel@example.com');
    await fireEvent.press(await screen.findByText('ENVIAR NOVAMENTE'));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledTimes(2));
  });

  it('deve explicar a falha de conexao, sem o texto do axios', async () => {
    jest.mocked(forgotPassword).mockRejectedValue(new Error('Network Error'));
    await render(<ForgotPassword />);

    await enviar('gabriel@example.com');

    expect(
      await screen.findByText('Não foi possível enviar agora. Verifique sua conexão e tente novamente.'),
    ).toBeTruthy();
    expect(screen.queryByText(/Network Error/)).toBeNull();
    expect(screen.queryByText('JÁ TENHO O CÓDIGO')).toBeNull();
  });
});

describe('Esqueci minha senha - mensagem de falha vinda da API', () => {
  const erroDaApi = (message: unknown) =>
    Object.assign(new Error('Request failed with status code 400'), {
      response: { data: { message } },
    });

  it('deve exibir a mensagem que a API devolve, em vez do texto generico', async () => {
    jest.mocked(forgotPassword).mockRejectedValue(erroDaApi('Aguarde antes de pedir outro código.'));
    await render(<ForgotPassword />);

    await enviar('gabriel@example.com');

    expect(await screen.findByText('Aguarde antes de pedir outro código.')).toBeTruthy();
    expect(
      screen.queryByText('Não foi possível enviar agora. Verifique sua conexão e tente novamente.'),
    ).toBeNull();
  });

  it('deve usar a primeira mensagem quando a API devolve uma lista', async () => {
    jest
      .mocked(forgotPassword)
      .mockRejectedValue(erroDaApi(['E-mail em formato invalido.', 'outro aviso']));
    await render(<ForgotPassword />);

    await enviar('gabriel@example.com');

    expect(await screen.findByText('E-mail em formato invalido.')).toBeTruthy();
    expect(screen.queryByText('outro aviso')).toBeNull();
  });

  it.each([
    ['lista vazia', []],
    ['mensagem vazia', ''],
  ])('deve cair no texto generico quando a API manda %s', async (_caso, message) => {
    jest.mocked(forgotPassword).mockRejectedValue(erroDaApi(message));
    await render(<ForgotPassword />);

    await enviar('gabriel@example.com');

    expect(
      await screen.findByText('Não foi possível enviar agora. Verifique sua conexão e tente novamente.'),
    ).toBeTruthy();
  });
});

describe('Esqueci minha senha - envio em curso', () => {
  it('deve indicar que esta enviando e so oferecer novo envio depois da resposta', async () => {
    let responder!: (valor: unknown) => void;
    jest
      .mocked(forgotPassword)
      .mockReturnValue(new Promise((resolve) => { responder = resolve; }) as never);
    await render(<ForgotPassword />);

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER_EMAIL), 'gabriel@example.com');
    fireEvent.press(screen.getByText('ENVIAR'));

    await waitFor(() =>
      expect(screen.getByRole('button').props.accessibilityState.disabled).toBe(true),
    );

    responder({ message: MENSAGEM_GENERICA });

    await waitFor(() => expect(screen.getByText('ENVIAR NOVAMENTE')).toBeTruthy());
    expect(screen.getByRole('button').props.accessibilityState.disabled).toBe(false);
  });
});
