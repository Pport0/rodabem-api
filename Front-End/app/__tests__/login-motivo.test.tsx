import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import Login from '../login';

jest.mock('@/contexts/authContext', () => ({
  useAuth: () => ({ login: jest.fn(), logout: jest.fn(), signUp: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Faça login novamente.';
const MENSAGEM_SENHA_ALTERADA = 'Senha alterada com sucesso. Entre novamente com a nova senha.';

const abrirComParametros = async (params: Record<string, string>) => {
  jest.mocked(useLocalSearchParams).mockReturnValue(params);
  await render(<Login />);
};

describe('Tela de login - aviso de por que a sessao foi encerrada', () => {
  it('deve avisar que a sessao expirou', async () => {
    await abrirComParametros({ motivo: 'sessao-expirada' });

    expect(screen.getByText(MENSAGEM_SESSAO_EXPIRADA)).toBeTruthy();
  });

  it('deve confirmar a troca de senha e pedir para entrar com a nova', async () => {
    await abrirComParametros({ motivo: 'senha-alterada' });

    expect(screen.getByText(MENSAGEM_SENHA_ALTERADA)).toBeTruthy();
  });

  it('nao deve mostrar aviso quando o login e aberto normalmente', async () => {
    await abrirComParametros({});

    expect(screen.queryByText(MENSAGEM_SESSAO_EXPIRADA)).toBeNull();
    expect(screen.queryByText(MENSAGEM_SENHA_ALTERADA)).toBeNull();
  });

  it.each(['desconhecido', 'toString'])('deve ignorar um motivo desconhecido (%s)', async (motivo) => {
    await abrirComParametros({ motivo });

    expect(screen.queryByText(MENSAGEM_SESSAO_EXPIRADA)).toBeNull();
    expect(screen.queryByText(MENSAGEM_SENHA_ALTERADA)).toBeNull();
    expect(screen.getByText('Entrar')).toBeTruthy();
  });
});
