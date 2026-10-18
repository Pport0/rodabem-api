import { getInitials } from '../initials';

describe('getInitials - regra unica da inicial do usuario (#51)', () => {
  it.each([
    ['Ana Paula Lima', 'AL'],
    ['Gabriel Silva Souza', 'GS'],
    ['Gabriel', 'G'],
    ['gabriel silva', 'GS'],
    ['  Gabriel   Silva  ', 'GS'],
    ['João da Silva', 'JS'],
    ['Maria dos Santos', 'MS'],
    ['Pedro de Souza e Lima', 'PL'],
    ['Ana DE Oliveira', 'AO'],
  ])('"%s" deve virar "%s"', (nome, esperado) => {
    expect(getInitials(nome)).toBe(esperado);
  });

  it.each([undefined, null, '', '   '])('deve usar "U" quando o nome e %p', (nome) => {
    expect(getInitials(nome)).toBe('U');
  });

  it('deve aceitar outro fallback, como o "?" do componente de avatar', () => {
    expect(getInitials('', '?')).toBe('?');
  });

  it('nao deve ficar vazio quando o nome so tem conectivos', () => {
    expect(getInitials('de')).toBe('D');
  });
});
