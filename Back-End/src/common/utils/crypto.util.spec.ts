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

  describe('a chave nao pode vir do codigo', () => {
    const carregarCom = (chave?: string) => {
      const anterior = process.env.CRYPTO_SECRET;

      if (chave === undefined) delete process.env.CRYPTO_SECRET;
      else process.env.CRYPTO_SECRET = chave;

      try {
        jest.resetModules();
        return require('./crypto.util');
      } finally {
        if (anterior === undefined) delete process.env.CRYPTO_SECRET;
        else process.env.CRYPTO_SECRET = anterior;
      }
    };

    it('nao deve cifrar quando CRYPTO_SECRET nao esta definida', () => {
      expect(() => carregarCom(undefined)).toThrow(/CRYPTO_SECRET/);
    });

    it('nao deve cifrar com chave mais curta que a exigida pelo algoritmo', () => {
      expect(() => carregarCom('curta-demais')).toThrow(/CRYPTO_SECRET/);
    });

    it('deve carregar normalmente com uma chave de 32 caracteres', () => {
      const util = carregarCom('a'.repeat(32));

      expect(util.decrypt(util.encrypt('52998224725'))).toBe('52998224725');
    });
  });
});
