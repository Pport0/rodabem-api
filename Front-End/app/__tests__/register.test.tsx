import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import Register from '../register';

const mockSignUp = jest.fn();
jest.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ signUp: mockSignUp, login: jest.fn(), logout: jest.fn() }),
}));

const CAMPOS = {
  nome: 'Digite aqui o seu nome completo',
  cpf: '000.000.000-00',
  telefone: '(00) 00000-0000',
  email: 'Digite aqui o seu email',
  senha: 'Digite uma senha',
  confirmarSenha: 'Confirme a sua senha',
};

const dadosValidos = {
  nome: 'Gabriel Silva',
  cpf: '52998224725',
  telefone: '62999999999',
  email: 'gabriel@example.com',
  senha: '123456',
  confirmarSenha: '123456',
};

const preencher = async (valores: Partial<typeof dadosValidos> = {}) => {
  const dados = { ...dadosValidos, ...valores };
  await render(<Register />);

  for (const chave of Object.keys(CAMPOS) as (keyof typeof CAMPOS)[]) {
    const valor = dados[chave];
    if (valor === undefined) continue;
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPOS[chave]), valor);
  }
};

const enviar = async () => {
  await fireEvent.press(screen.getByRole('button'));
};

describe('Tela de cadastro - mascaras', () => {
  it('deve formatar o CPF enquanto o usuario digita', async () => {
    await render(<Register />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(CAMPOS.cpf),
      '52998224725',
    );

    expect(screen.getByPlaceholderText(CAMPOS.cpf).props.value).toBe(
      '529.982.247-25',
    );
  });

  it('deve formatar o telefone enquanto o usuario digita', async () => {
    await render(<Register />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(CAMPOS.telefone),
      '62999999999',
    );

    expect(screen.getByPlaceholderText(CAMPOS.telefone).props.value).toBe(
      '(62) 99999-9999',
    );
  });
});

describe('Tela de cadastro - validacao', () => {
  it('deve exigir o nome completo', async () => {
    await preencher({ nome: '' });
    await enviar();

    expect(screen.getByText('Nome completo é obrigatório')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve recusar nome composto apenas por espacos', async () => {
    await preencher({ nome: '   ' });
    await enviar();

    expect(screen.getByText('Nome completo é obrigatório')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve recusar CPF com menos de 11 digitos', async () => {
    await preencher({ cpf: '5299822472' });
    await enviar();

    expect(screen.getByText('CPF inválido')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('nao deve exigir telefone, que a RNE-01 define como opcional', async () => {
    await preencher({ telefone: '' });
    await enviar();

    expect(mockSignUp).toHaveBeenCalled();
  });

  it('deve recusar telefone incompleto quando o usuario escolhe informar um', async () => {
    await preencher({ telefone: '6299' });
    await enviar();

    expect(screen.getByText('Telefone inválido')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve exigir a senha', async () => {
    await preencher({ senha: '', confirmarSenha: '' });
    await enviar();

    expect(screen.getByText('Senha é obrigatória')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve recusar senha com menos de seis caracteres', async () => {
    await preencher({ senha: '12345', confirmarSenha: '12345' });
    await enviar();

    expect(screen.getByText('A senha deve ter no mínimo 6 caracteres')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve exigir a confirmacao de senha', async () => {
    await preencher({ confirmarSenha: '' });
    await enviar();

    expect(screen.getByText('Confirmação de senha é obrigatória')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve recusar quando as senhas nao coincidem', async () => {
    await preencher({ confirmarSenha: '654321' });
    await enviar();

    expect(screen.getByText('As senhas não coincidem')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve exigir o email, que o rotulo marca como obrigatorio', async () => {
    await preencher({ email: '' });
    await enviar();

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('deve recusar email em formato invalido', async () => {
    await preencher({ email: 'nao-e-um-email' });
    await enviar();

    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe('Tela de cadastro - rotulos', () => {
  it('deve marcar com asterisco somente os campos obrigatorios', async () => {
    await render(<Register />);

    expect(screen.getByText('TELEFONE')).toBeTruthy();
    expect(screen.queryByText('TELEFONE*')).toBeNull();
  });
});

describe('Tela de cadastro - envio', () => {

  it('deve remover a mascara do CPF e do telefone antes de enviar', async () => {
    await preencher();
    await enviar();

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        cpf: '52998224725',
        telefone: '62999999999',
      }),
    );
  });

  it('deve remover espacos em branco do nome e do email', async () => {
    await preencher({ nome: '  Gabriel Silva  ', email: '  gabriel@example.com  ' });
    await enviar();

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Gabriel Silva',
        email: 'gabriel@example.com',
      }),
    );
  });

});
