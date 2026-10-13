import { isValidCPF } from './cpf.validator';

/**
 * Regra: RNE-01 exige CPF valido no cadastro. A validade segue o algoritmo de digito verificador da Receita Federal,
 * e sequencias de digito repetido sao recusadas mesmo quando o digito verificador fecha.
 */
describe('isValidCPF', () => {
  describe('deve aceitar CPF com digito verificador correto', () => {
    it.each([
      ['52998224725'],
      ['11144477735'],
      ['12345678909'],
      ['00000000191'],
      ['98765432100'],
    ])('%s', (cpf) => {
      expect(isValidCPF(cpf)).toBe(true);
    });
  });

  describe('deve aceitar CPF formatado com pontuacao', () => {
    it.each([['529.982.247-25'], ['111.444.777-35']])('%s', (cpf) => {
      expect(isValidCPF(cpf)).toBe(true);
    });
  });

  describe('deve recusar CPF com digito verificador incorreto', () => {
    it.each([
      ['52998224724'],
      ['11144477736'],
      ['12345678900'],
      ['98765432101'],
    ])('%s', (cpf) => {
      expect(isValidCPF(cpf)).toBe(false);
    });
  });

  describe('deve recusar sequencia de digito repetido', () => {
    // 11111111111 fecha o digito verificador, mas nao e um CPF emitido.
    it.each([
      ['00000000000'],
      ['11111111111'],
      ['22222222222'],
      ['99999999999'],
    ])('%s', (cpf) => {
      expect(isValidCPF(cpf)).toBe(false);
    });
  });

  describe('deve recusar entrada que nao tem onze digitos', () => {
    it.each([
      ['', 'vazio'],
      ['123', 'curto demais'],
      ['5299822472', 'um digito a menos'],
      ['529982247250', 'um digito a mais'],
      ['abcdefghijk', 'sem digito algum'],
    ])('%s (%s)', (cpf) => {
      expect(isValidCPF(cpf)).toBe(false);
    });
  });
});
