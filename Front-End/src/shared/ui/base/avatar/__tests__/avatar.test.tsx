import { render, screen } from '@testing-library/react-native';
import React from 'react';

import Avatar from '../index';

describe('Avatar - o contrato que o aplicativo usa', () => {
  it('deve exibir a inicial que a tela informa', async () => {
    await render(<Avatar size={36} backgroundColor="#f60" image={{ name: 'G', uri: '' }} />);

    expect(screen.getByText('G')).toBeTruthy();
  });

  it('deve exibir interrogacao quando ainda nao se sabe o nome', async () => {
    await render(<Avatar size={36} backgroundColor="#f60" image={{ name: '', uri: '' }} />);

    expect(screen.getByText('?')).toBeTruthy();
  });
});

describe('Avatar - calculo de iniciais', () => {
  it.each([
    ['uma palavra', 'Gabriel', 'G'],
    ['duas palavras', 'Gabriel Silva', 'GS'],
    ['tres palavras, usa a primeira e a ultima', 'Ana Beatriz Costa', 'AC'],
    ['espacos sobrando', '  Gabriel   Silva  ', 'GS'],
  ])('deve resumir %s como "%s"', async (_, nome, esperado) => {
    await render(<Avatar size={36} backgroundColor="#f60" image={{ name: nome, uri: '' }} />);

    expect(screen.getByText(esperado)).toBeTruthy();
  });
});
