import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto (contrato de validacao)', () => {
  const validar = (payload: Record<string, unknown>) =>
    validate(plainToInstance(LoginDto, payload));

  const propriedadesComErro = async (payload: Record<string, unknown>) =>
    (await validar(payload)).map((e) => e.property);

  describe('senha', () => {
    it('deve aceitar senha com exatamente 6 caracteres', async () => {
      await expect(
        propriedadesComErro({ telefone: '62999999999', senha: '123456' }),
      ).resolves.not.toContain('senha');
    });

    it('deve rejeitar senha com menos de 6 caracteres', async () => {
      await expect(
        propriedadesComErro({ telefone: '62999999999', senha: '12345' }),
      ).resolves.toContain('senha');
    });

    it('deve rejeitar senha ausente', async () => {
      await expect(
        propriedadesComErro({ telefone: '62999999999' }),
      ).resolves.toContain('senha');
    });

    it('deve rejeitar senha que nao e string', async () => {
      await expect(
        propriedadesComErro({ telefone: '62999999999', senha: 123456 }),
      ).resolves.toContain('senha');
    });
  });

  describe('identificacao do usuario', () => {
    it('deve aceitar login apenas com telefone', async () => {
      await expect(
        validar({ telefone: '62999999999', senha: '123456' }),
      ).resolves.toHaveLength(0);
    });

    it('deve aceitar login apenas com cpf', async () => {
      await expect(
        validar({ cpf: '52998224725', senha: '123456' }),
      ).resolves.toHaveLength(0);
    });

    it('deve aceitar cpf e telefone enviados juntos', async () => {
      await expect(
        validar({ cpf: '52998224725', telefone: '62999999999', senha: '123456' }),
      ).resolves.toHaveLength(0);
    });

    it('aceita payload sem cpf e sem telefone, pois ambos sao opcionais', async () => {
      await expect(validar({ senha: '123456' })).resolves.toHaveLength(0);
    });

    it('deve rejeitar cpf que nao e string', async () => {
      await expect(
        propriedadesComErro({ cpf: 52998224725, senha: '123456' }),
      ).resolves.toContain('cpf');
    });

    it('deve rejeitar telefone que nao e string', async () => {
      await expect(
        propriedadesComErro({ telefone: 62999999999, senha: '123456' }),
      ).resolves.toContain('telefone');
    });

    it('nao valida o formato do cpf nem do telefone', async () => {
      await expect(
        validar({ cpf: 'nao-e-um-cpf', telefone: 'nao-e-um-telefone', senha: '123456' }),
      ).resolves.toHaveLength(0);
    });
  });
});
