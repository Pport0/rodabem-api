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
  it('deve exibir o titulo e o subtitulo da tela', async () => {
    await render(<Login />);

    expect(screen.getByText('Entrar')).toBeTruthy();
    expect(screen.getByText('Insira suas credenciais para acessar')).toBeTruthy();
  });

  it('deve exibir os campos de identificacao e senha', async () => {
    await render(<Login />);

    expect(screen.getByText('CPF ou Telefone')).toBeTruthy();
    expect(screen.getByText('Senha')).toBeTruthy();
    expect(screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR)).toBeTruthy();
    expect(screen.getByPlaceholderText(PLACEHOLDER_SENHA)).toBeTruthy();
  });

  it('deve ocultar o texto digitado no campo de senha', async () => {
    await render(<Login />);

    expect(
      screen.getByPlaceholderText(PLACEHOLDER_SENHA).props.secureTextEntry,
    ).toBe(true);
  });

  it('nao deve ocultar o texto do campo de identificacao', async () => {
    await render(<Login />);

    expect(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR).props.secureTextEntry,
    ).toBe(false);
  });
});

describe('Tela de login - preenchimento', () => {
  it('deve refletir na tela o identificador digitado', async () => {
    await render(<Login />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
      '62999999999',
    );

    // reconsulta: apos o re-render a referencia anterior fica obsoleta
    expect(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR).props.value,
    ).toBe('62999999999');
  });

  it('deve refletir na tela a senha digitada', async () => {
    await render(<Login />);

    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER_SENHA), '123456');

    expect(screen.getByPlaceholderText(PLACEHOLDER_SENHA).props.value).toBe(
      '123456',
    );
  });

  it('deve iniciar com os dois campos vazios', async () => {
    await render(<Login />);

    expect(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR).props.value,
    ).toBe('');
    expect(screen.getByPlaceholderText(PLACEHOLDER_SENHA).props.value).toBe('');
  });
});

describe('Tela de login - envio', () => {
  it('deve enviar os valores digitados ao autenticar', async () => {
    await preencherEEnviar('62999999999', '123456');

    expect(mockLogin).toHaveBeenCalledWith({
      cpfOrPhone: '62999999999',
      password: '123456',
    });
  });

  it('deve enviar o CPF quando o usuario informa CPF no lugar do telefone', async () => {
    await preencherEEnviar('52998224725', '123456');

    expect(mockLogin).toHaveBeenCalledWith({
      cpfOrPhone: '52998224725',
      password: '123456',
    });
  });

  it('deve autenticar apenas uma vez por toque no botao', async () => {
    await preencherEEnviar('62999999999', '123456');

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('envia a requisicao mesmo com os campos vazios', async () => {
    await render(<Login />);

    await fireEvent.press(screen.getByRole('button'));

    expect(mockLogin).toHaveBeenCalledWith({ cpfOrPhone: '', password: '' });
  });

  it('envia a requisicao com apenas um dos campos preenchido', async () => {
    await render(<Login />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
      '62999999999',
    );
    await fireEvent.press(screen.getByRole('button'));

    expect(mockLogin).toHaveBeenCalledWith({
      cpfOrPhone: '62999999999',
      password: '',
    });
  });
});

describe('Tela de login - navegacao', () => {
  it('deve levar para a recuperacao de senha', async () => {
    await render(<Login />);

    await fireEvent.press(screen.getByText('Esqueci minha senha'));

    expect(router.navigate).toHaveBeenCalledWith('/forgotPassword');
  });

  it('nao deve navegar ao apenas preencher os campos', async () => {
    await render(<Login />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
      '62999999999',
    );

    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('Tela de login - tema', () => {
  const useColorSchemeMock = jest.spyOn(
    require('react-native'),
    'useColorScheme',
  );

  afterAll(() => useColorSchemeMock.mockRestore());

  it('deve renderizar no tema escuro', async () => {
    useColorSchemeMock.mockReturnValue('dark');

    await render(<Login />);

    expect(screen.getByText('Entrar')).toBeTruthy();
  });

  it('deve cair no tema claro quando o sistema nao informa a preferencia', async () => {
    useColorSchemeMock.mockReturnValue(null);

    await render(<Login />);

    expect(screen.getByText('Entrar')).toBeTruthy();
  });
});
