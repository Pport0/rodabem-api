import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import { DateField } from '../dateField';

jest.mock('@react-native-community/datetimepicker', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (e: unknown, d?: Date) => void }) => (
      <>
        <TouchableOpacity
          testID="escolher-data"
          onPress={() => onChange({}, new Date('2026-03-10T12:00:00.000Z'))}
        >
          <Text>seletor aberto</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="cancelar-data" onPress={() => onChange({}, undefined)}>
          <Text>cancelar</Text>
        </TouchableOpacity>
      </>
    ),
  };
});

const montar = async (props: Record<string, unknown> = {}) =>
  render(
    <DateField
      label="DATA DE EMISSAO"
      value={null}
      onChange={jest.fn()}
      {...(props as never)}
    />,
  );

describe('Campo de data', () => {
  it('deve indicar o formato esperado enquanto nao ha data escolhida', async () => {
    await montar();

    expect(screen.getByText('DD/MM/AAAA')).toBeTruthy();
  });

  it('deve exibir a data escolhida no padrao brasileiro', async () => {
    await montar({ value: new Date('2026-03-10T12:00:00.000Z') });

    expect(screen.getByText('10/03/2026')).toBeTruthy();
  });

  it('deve exibir o erro recebido', async () => {
    await montar({ error: 'Data de emissao obrigatoria' });

    expect(screen.getByText('Data de emissao obrigatoria')).toBeTruthy();
  });

  it('nao deve abrir o seletor antes de o usuario tocar no campo', async () => {
    await montar();

    expect(screen.queryByTestId('escolher-data')).toBeNull();
  });

  it('deve abrir o seletor quando o usuario toca no campo', async () => {
    await montar();

    await fireEvent.press(screen.getByText('DD/MM/AAAA'));

    expect(screen.getByTestId('escolher-data')).toBeTruthy();
  });

  it('deve repassar a data escolhida', async () => {
    const aoEscolher = jest.fn();
    await montar({ onChange: aoEscolher });

    await fireEvent.press(screen.getByText('DD/MM/AAAA'));
    await fireEvent.press(screen.getByTestId('escolher-data'));

    expect(aoEscolher).toHaveBeenCalledWith(new Date('2026-03-10T12:00:00.000Z'));
  });

  it('deve manter o seletor aberto no iOS depois da escolha', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await montar();
    await fireEvent.press(screen.getByText('DD/MM/AAAA'));
    await fireEvent.press(screen.getByTestId('escolher-data'));

    expect(screen.getByTestId('escolher-data')).toBeTruthy();
  });

  it('deve fechar o seletor no Android depois da escolha', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await montar();
    await fireEvent.press(screen.getByText('DD/MM/AAAA'));
    await fireEvent.press(screen.getByTestId('escolher-data'));

    expect(screen.queryByTestId('escolher-data')).toBeNull();
  });

  it('nao deve alterar a data quando o usuario fecha o seletor sem escolher', async () => {
    const aoEscolher = jest.fn();
    await montar({ onChange: aoEscolher });

    await fireEvent.press(screen.getByText('DD/MM/AAAA'));
    await fireEvent.press(screen.getByTestId('cancelar-data'));

    expect(aoEscolher).not.toHaveBeenCalled();
  });
});
