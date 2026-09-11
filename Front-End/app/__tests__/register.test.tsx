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

describe('Tela de cadastro - conteudo', () => {
  it('deve exibir o titulo e o subtitulo', async () => {
    await render(<Register />);

    expect(screen.getByText('CRIAR CONTA')).toBeTruthy();
    expect(screen.getByText('Informe os seus dados pessoais')).toBeTruthy();
  });

  it('deve exibir todos os campos do formulario', async () => {
    await render(<Register />);

    for (const placeholder of Object.values(CAMPOS)) {
      expect(screen.getByPlaceholderText(placeholder)).toBeTruthy();
    }
  });

  it('deve ocultar o texto dos dois campos de senha', async () => {
    await render(<Register />);

    expect(screen.getByPlaceholderText(CAMPOS.senha).props.secureTextEntry).toBe(true);
    expect(
      screen.getByPlaceholderText(CAMPOS.confirmarSenha).props.secureTextEntry,
    ).toBe(true);
  });
});

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

  it('deve recusar CPF vazio', async () => {
    await preencher({ cpf: '' });
    await enviar();

    expect(screen.getByText('CPF inválido')).toBeTruthy();
  });

  it('deve recusar telefone com menos de 10 digitos', async () => {
    await preencher({ telefone: '629999' });
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

  it('deve recusar senha com menos de 6 caracteres', async () => {
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

  it('deve acumular os erros de todos os campos invalidos', async () => {
    await preencher({ nome: '', cpf: '', telefone: '', senha: '', confirmarSenha: '' });
    await enviar();

    expect(screen.getByText('Nome completo é obrigatório')).toBeTruthy();
    expect(screen.getByText('CPF inválido')).toBeTruthy();
    expect(screen.getByText('Telefone inválido')).toBeTruthy();
    expect(screen.getByText('Senha é obrigatória')).toBeTruthy();
    expect(screen.getByText('Confirmação de senha é obrigatória')).toBeTruthy();
  });

  it('nao exibe erro algum antes do primeiro envio', async () => {
    await render(<Register />);

    expect(screen.queryByText('Nome completo é obrigatório')).toBeNull();
    expect(screen.queryByText('CPF inválido')).toBeNull();
  });

  it('o email e marcado como obrigatorio mas nunca e validado', async () => {
    await preencher({ email: '' });
    await enviar();

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: '' }),
    );
  });

  it('aceita email em formato invalido', async () => {
    await preencher({ email: 'nao-e-um-email' });
    await enviar();

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nao-e-um-email' }),
    );
  });
});

describe('Tela de cadastro - envio', () => {
  it('deve enviar o cadastro quando o formulario esta valido', async () => {
    await preencher();
    await enviar();

    expect(mockSignUp).toHaveBeenCalledTimes(1);
  });

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

  it('deve enviar a senha sem transformacao', async () => {
    await preencher({ senha: 'SenhaF0rte!', confirmarSenha: 'SenhaF0rte!' });
    await enviar();

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ senha: 'SenhaF0rte!' }),
    );
  });

  it('nao deve enviar o campo de confirmacao de senha', async () => {
    await preencher();
    await enviar();

    expect(mockSignUp.mock.calls[0][0]).not.toHaveProperty('confirmarSenha');
  });
});

describe('Tela de cadastro - tema', () => {
  const useColorSchemeMock = jest.spyOn(
    require('react-native'),
    'useColorScheme',
  );

  afterAll(() => useColorSchemeMock.mockRestore());

  it('deve renderizar no tema escuro', async () => {
    useColorSchemeMock.mockReturnValue('dark');

    await render(<Register />);

    expect(screen.getByText('CRIAR CONTA')).toBeTruthy();
  });

  it('deve cair no tema claro quando o sistema nao informa a preferencia', async () => {
    useColorSchemeMock.mockReturnValue(null);

    await render(<Register />);

    expect(screen.getByText('CRIAR CONTA')).toBeTruthy();
  });
});
