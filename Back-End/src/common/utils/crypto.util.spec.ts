import { createHash, decrypt, encrypt } from './crypto.util';

describe('crypto.util', () => {
  describe('cifragem reversivel', () => {
    it('deve devolver o valor original apos cifrar e decifrar', () => {
      const cpf = '52998224725';

      expect(decrypt(encrypt(cpf))).toBe(cpf);
    });

    it('nao deve produzir o mesmo texto cifrado para a mesma entrada', () => {
      const cpf = '52998224725';

      const primeiro = encrypt(cpf);
      const segundo = encrypt(cpf);

      expect(primeiro).not.toBe(segundo);
      expect(decrypt(primeiro)).toBe(cpf);
      expect(decrypt(segundo)).toBe(cpf);
    });

    it('deve recusar texto cifrado corrompido em vez de devolver dado errado', () => {
      const cifrado = encrypt('52998224725');
      const [iv, conteudo] = cifrado.split(':');
      const corrompido = `${iv}:${conteudo.slice(0, -2)}ff`;

      expect(() => decrypt(corrompido)).toThrow();
    });

    it('deve recusar texto sem o vetor de inicializacao', () => {
      expect(() => decrypt('semvetordeinicializacao')).toThrow();
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
