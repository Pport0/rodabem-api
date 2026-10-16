import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import Input from '../input';
import Colors from '@/constants/colors';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const montar = async (tema: 'light' | 'dark' | null) => {
  jest.mocked(useColorScheme).mockReturnValue(tema as never);
  await render(
    <Input placeholder="Digite uma senha" value="" onChangeText={jest.fn()} />,
  );
  const campo = screen.getByPlaceholderText('Digite uma senha');
  return {
    textoDoCampo: StyleSheet.flatten(campo.props.style).color,
    fundoDaCaixa: StyleSheet.flatten(campo.parent?.props.style).backgroundColor,
  };
};

describe('Campo de texto', () => {
  it('deve seguir o tema escuro do sistema', async () => {
    const { textoDoCampo, fundoDaCaixa } = await montar('dark');

    expect(textoDoCampo).toBe(Colors.dark.text);
    expect(fundoDaCaixa).toBe(Colors.dark.background);
  });

  it('deve seguir o tema claro do sistema', async () => {
    const { textoDoCampo, fundoDaCaixa } = await montar('light');

    expect(textoDoCampo).toBe(Colors.light.text);
    expect(fundoDaCaixa).toBe(Colors.light.background);
  });

  it('deve cair no tema claro quando o sistema nao informa um', async () => {
    const { textoDoCampo, fundoDaCaixa } = await montar(null);

    expect(textoDoCampo).toBe(Colors.light.text);
    expect(fundoDaCaixa).toBe(Colors.light.background);
  });

  it('deve esconder a senha digitada', async () => {
    jest.mocked(useColorScheme).mockReturnValue('light' as never);

    await render(
      <Input
        placeholder="Digite uma senha"
        value="123456"
        onChangeText={jest.fn()}
        type="password"
      />,
    );

    expect(screen.getByPlaceholderText('Digite uma senha').props.secureTextEntry).toBe(
      true,
    );
  });

  it('nao deve esconder o que nao e senha', async () => {
    jest.mocked(useColorScheme).mockReturnValue('light' as never);

    await render(
      <Input placeholder="Digite o seu CPF" value="529" onChangeText={jest.fn()} />,
    );

    expect(screen.getByPlaceholderText('Digite o seu CPF').props.secureTextEntry).toBe(
      false,
    );
  });
});
