import { render } from '@testing-library/react-native';
import React from 'react';

import CaminhoesIndex from '../caminhoes/index';
import DocumentosIndex from '../documentos/index';

const destinos: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    destinos.ultimo = href;
    return null;
  },
}));

it.each([
  ['/caminhoes', CaminhoesIndex, '/caminhoes/novo'],
  ['/documentos', DocumentosIndex, '/documentos/novo'],
])('deve redirecionar %s para o formulario', async (_, Tela, esperado) => {
  await render(<Tela />);

  expect(destinos.ultimo).toBe(esperado);
});
