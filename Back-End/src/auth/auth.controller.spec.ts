import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    login: jest.fn(),
    logout: jest.fn(),
  };

  const requisicaoCom = (authorization?: string) => ({
    headers: authorization ? { authorization } : {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any);
  });

  describe('login', () => {
    it('deve repassar as credenciais recebidas ao service', async () => {
      const credenciais = { telefone: '62999999999', senha: '123456' };
      authService.login.mockResolvedValue({ access_token: 'jwt-token' });

      await controller.login(credenciais);

      expect(authService.login).toHaveBeenCalledWith(credenciais);
    });

    it('deve devolver a resposta do service sem alteracao', async () => {
      const resposta = {
        access_token: 'jwt-token',
        user: { id: 1, nome: 'Gabriel', email: 'gabriel@example.com' },
      };
      authService.login.mockResolvedValue(resposta);

      await expect(
        controller.login({ telefone: '62999999999', senha: '123456' }),
      ).resolves.toEqual(resposta);
    });

    it('deve propagar o erro lancado pelo service', async () => {
      authService.login.mockRejectedValue(new Error('Credenciais inválidas'));

      await expect(
        controller.login({ telefone: '62999999999', senha: 'errada' }),
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('deve repassar login por cpf preservando o payload', async () => {
      const credenciais = { cpf: '52998224725', senha: '123456' };
      authService.login.mockResolvedValue({ access_token: 'jwt-token' });

      await controller.login(credenciais);

      expect(authService.login).toHaveBeenCalledWith(credenciais);
    });
  });

  describe('logout', () => {
    it('deve extrair o token removendo o prefixo Bearer', async () => {
      authService.logout.mockResolvedValue({ message: 'ok' });

      await controller.logout(requisicaoCom('Bearer jwt-token'));

      expect(authService.logout).toHaveBeenCalledWith('jwt-token');
    });

    it('deve devolver a mensagem de sucesso do service', async () => {
      authService.logout.mockResolvedValue({
        message: 'Logout realizado com sucesso',
      });

      await expect(
        controller.logout(requisicaoCom('Bearer jwt-token')),
      ).resolves.toEqual({ message: 'Logout realizado com sucesso' });
    });

    it('deve repassar token indefinido quando nao ha header authorization', async () => {
      authService.logout.mockResolvedValue({ message: 'ok' });

      await controller.logout(requisicaoCom());

      expect(authService.logout).toHaveBeenCalledWith(undefined);
    });

    it('deve remover apenas a primeira ocorrencia do prefixo Bearer', async () => {
      authService.logout.mockResolvedValue({ message: 'ok' });

      await controller.logout(requisicaoCom('Bearer Bearer jwt-token'));

      expect(authService.logout).toHaveBeenCalledWith('Bearer jwt-token');
    });

    it('deve repassar o valor bruto quando o header nao usa o prefixo Bearer', async () => {
      authService.logout.mockResolvedValue({ message: 'ok' });

      await controller.logout(requisicaoCom('jwt-token-sem-prefixo'));

      expect(authService.logout).toHaveBeenCalledWith('jwt-token-sem-prefixo');
    });

    it('deve propagar falha ao registrar o token na blacklist', async () => {
      authService.logout.mockRejectedValue(new Error('falha no banco'));

      await expect(
        controller.logout(requisicaoCom('Bearer jwt-token')),
      ).rejects.toThrow('falha no banco');
    });
  });
});
