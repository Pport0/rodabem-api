import { createHash, decrypt, encrypt } from './crypto.util';

describe('crypto.util', () => {
  const CHAVE = 'a'.repeat(32);

  describe('cifragem reversivel', () => {
    it('deve devolver o valor original apos cifrar e decifrar', () => {
      const cpf = '52998224725';

      expect(decrypt(encrypt(cpf, CHAVE), CHAVE)).toBe(cpf);
    });

    it('nao deve produzir o mesmo texto cifrado para a mesma entrada', () => {
      const cpf = '52998224725';

      const primeiro = encrypt(cpf, CHAVE);
      const segundo = encrypt(cpf, CHAVE);

      expect(primeiro).not.toBe(segundo);
      expect(decrypt(primeiro, CHAVE)).toBe(cpf);
      expect(decrypt(segundo, CHAVE)).toBe(cpf);
    });

    it('deve recusar texto cifrado corrompido em vez de devolver dado errado', () => {
      const cifrado = encrypt('52998224725', CHAVE);
      const [iv, conteudo] = cifrado.split(':');
      const corrompido = `${iv}:${conteudo.slice(0, -2)}ff`;

      expect(() => decrypt(corrompido, CHAVE)).toThrow();
    });

    it('deve recusar texto sem o vetor de inicializacao', () => {
      expect(() => decrypt('semvetordeinicializacao', CHAVE)).toThrow();
    });

    it('nao deve decifrar com chave diferente da usada para cifrar', () => {
      const cifrado = encrypt('52998224725', CHAVE);

      expect(() => decrypt(cifrado, 'b'.repeat(32))).toThrow();
    });
  });

  describe('hash de busca', () => {
    it('deve produzir sempre o mesmo hash para a mesma entrada', () => {
      expect(createHash('52998224725')).toBe(createHash('52998224725'));
    });

    it('deve produzir hashes diferentes para entradas diferentes', () => {
      expect(createHash('52998224725')).not.toBe(createHash('11144477735'));
    });

    it('nunca deve devolver o valor original', () => {
      const cpf = '52998224725';

      expect(createHash(cpf)).not.toContain(cpf);
    });
  });
});
