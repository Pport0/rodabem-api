import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import Login from '../login';

const mockLogin = jest.fn();
jest.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ login: mockLogin, logout: jest.fn(), signUp: jest.fn() }),
}));

const PLACEHOLDER_IDENTIFICADOR = 'Insira o seu cpf ou telefone';
const PLACEHOLDER_SENHA = 'Insira a sua senha';

const preencherEEnviar = async (identificador: string, senha: string) => {
  await render(<Login />);

  await fireEvent.changeText(
    screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
    identificador,
  );
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER_SENHA), senha);
  await fireEvent.press(screen.getByRole('button'));
};

describe('Tela de login - conteudo', () => {

  it('deve oferecer o caminho para quem esqueceu a senha', async () => {
    await render(<Login />);

    await fireEvent.press(screen.getByText('Esqueci minha senha'));

    expect(jest.mocked(router.navigate)).toHaveBeenCalledWith('/forgotPassword');
  });

  it('deve ocultar o texto digitado no campo de senha', async () => {
    await render(<Login />);

    expect(
      screen.getByPlaceholderText(PLACEHOLDER_SENHA).props.secureTextEntry,
    ).toBe(true);
  });

});

describe('Tela de login - envio', () => {

  it('nao deve autenticar duas vezes quando o botao e tocado duas vezes', async () => {
    await render(<Login />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
      '62999999999',
    );
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER_SENHA), '123456');

    await fireEvent.press(screen.getByRole('button'));
    await fireEvent.press(screen.getByRole('button'));

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('deve autenticar apenas uma vez por toque no botao', async () => {
    await preencherEEnviar('62999999999', '123456');

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('deve recusar envio com os campos vazios', async () => {
    await render(<Login />);

    await fireEvent.press(screen.getByRole('button'));

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('deve recusar envio com a senha em branco', async () => {
    await render(<Login />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
      '62999999999',
    );
    await fireEvent.press(screen.getByRole('button'));

    expect(mockLogin).not.toHaveBeenCalled();
  });
});
