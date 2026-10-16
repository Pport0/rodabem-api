import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { ActionCard } from '../actionCard';
import Header from '../header';
import HomeHeader from '../homeHeader';
import { useUser } from '@/hooks/useUser';

jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));

const mockDespachar = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useNavigation: () => ({ dispatch: mockDespachar }),
}));

const contarImagens = () => {
  let total = 0;
  const andar = (no: unknown) => {
    if (!no || typeof no !== 'object') return;
    const atual = no as { type?: string; children?: unknown[] };
    if (atual.type === 'Image') total += 1;
    (atual.children ?? []).forEach(andar);
  };
  andar(screen.toJSON());
  return total;
};

describe('Cabecalho das telas internas', () => {
  it('deve exibir o titulo quando a tela informa um', async () => {
    await render(<Header title="MEUS DOCUMENTOS" />);

    expect(screen.getByText('MEUS DOCUMENTOS')).toBeTruthy();
  });

  it('deve exibir a marca quando a tela nao informa titulo', async () => {
    await render(<Header />);
    expect(contarImagens()).toBe(1);

    await render(<Header title="MEUS DOCUMENTOS" />);
    expect(contarImagens()).toBe(0);
  });

  it.todo('deve voltar para a tela anterior pelo botao');
});

describe('Cabecalho da tela inicial', () => {
  it.todo('deve abrir o menu lateral pelo botao');

  it('deve exibir a marca do aplicativo', async () => {
    jest.mocked(useUser).mockReturnValue({ user: { nome: 'Gabriel' } } as never);

    await render(<HomeHeader />);

    expect(screen.getByText('RB')).toBeTruthy();
  });

  it('deve mostrar uma inicial neutra enquanto o nome do usuario nao chegou', async () => {
    jest.mocked(useUser).mockReturnValue({ user: null } as never);

    await render(<HomeHeader />);

    expect(screen.getByText('U')).toBeTruthy();
  });
});

describe('Cartao de acao da tela inicial', () => {
  it('deve exibir o que o cartao oferece', async () => {
    await render(
      <ActionCard
        title="CALCULADORA DE FRETE"
        subtitle="Simule o valor da viagem"
        iconName="calculator-outline"
        backgroundColor="#fff"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('CALCULADORA DE FRETE')).toBeTruthy();
    expect(screen.getByText('Simule o valor da viagem')).toBeTruthy();
  });

  it('deve acionar o que a tela pediu quando tocado', async () => {
    const aoTocar = jest.fn();

    await render(
      <ActionCard
        title="CALCULADORA DE FRETE"
        subtitle="Simule o valor da viagem"
        iconName="calculator-outline"
        backgroundColor="#fff"
        onPress={aoTocar}
      />,
    );

    await fireEvent.press(screen.getByText('CALCULADORA DE FRETE'));

    expect(aoTocar).toHaveBeenCalled();
  });
});
