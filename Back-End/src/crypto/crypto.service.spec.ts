import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const PLACEHOLDER = 'CHANGE_ME_32_CHARS_MIN!!!!!!!!!!!';

  const comChave = (chave?: string) =>
    new CryptoService({ get: () => chave } as unknown as ConfigService);

  describe('a chave nao pode vir do codigo', () => {
    it('nao deve subir sem CRYPTO_SECRET definida', () => {
      expect(() => comChave(undefined).onModuleInit()).toThrow(/CRYPTO_SECRET/);
    });

    it('nao deve subir com a chave vazia', () => {
      expect(() => comChave('').onModuleInit()).toThrow(/CRYPTO_SECRET/);
    });

    it('nao deve subir com o valor de exemplo do .env', () => {
      expect(() => comChave(PLACEHOLDER).onModuleInit()).toThrow(/CRYPTO_SECRET/);
    });

    it('nao deve subir com chave mais curta que a exigida pelo algoritmo', () => {
      expect(() => comChave('curta-demais').onModuleInit()).toThrow(/CRYPTO_SECRET/);
    });

    it('deve subir com uma chave de 32 caracteres', () => {
      expect(() => comChave('a'.repeat(32)).onModuleInit()).not.toThrow();
    });
  });

  describe('cifragem com a chave configurada', () => {
    it('deve devolver o valor original apos cifrar e decifrar', () => {
      const servico = comChave('a'.repeat(32));

      expect(servico.decrypt(servico.encrypt('52998224725'))).toBe('52998224725');
    });

    it('nao deve decifrar o que outra instancia cifrou com outra chave', () => {
      const cifrado = comChave('a'.repeat(32)).encrypt('52998224725');

      expect(() => comChave('b'.repeat(32)).decrypt(cifrado)).toThrow();
    });
  });
});
