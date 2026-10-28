import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    alterarSenha: jest.fn(),
  };

  const termosService = {
    vigente: jest.fn(),
    registrarAceite: jest.fn(),
    termoPendente: jest.fn().mockResolvedValue(false),
  };

  const autenticadoComo = (userId: number) => ({ user: { userId } });

  const guardsDe = (metodo: keyof UsersController) =>
    Reflect.getMetadata('__guards__', UsersController.prototype[metodo]);

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as any, termosService as any);
  });

  describe('protecao das rotas', () => {
    it('deve exigir autenticacao em tudo que toca dado de usuario', () => {
      const protegidas: (keyof UsersController)[] = [
        'me',
        'update',
        'remove',
        'alterarSenha',
      ];

      for (const metodo of protegidas) {
        expect(guardsDe(metodo)).toContain(JwtAuthGuard);
      }
    });

    it('nao deve exigir autenticacao no cadastro, que e a porta de entrada', () => {
      expect(guardsDe('create')).toBeUndefined();
    });
  });

  describe('escopo do proprio usuario', () => {
    it('deve consultar o perfil pelo usuario do token, nunca por identificador recebido', async () => {
      usersService.findById.mockResolvedValue({ id: 7, nome: 'Gabriel' });

      await controller.me(autenticadoComo(7));

      expect(usersService.findById).toHaveBeenCalledWith(7);
    });

    it('deve trocar a senha do usuario do token, ignorando qualquer identificador', async () => {
      await controller.alterarSenha(autenticadoComo(7), {
        senhaAtual: 'atual123',
        novaSenha: 'nova123456',
      } as never);

      expect(usersService.alterarSenha).toHaveBeenCalledWith(7, {
        senhaAtual: 'atual123',
        novaSenha: 'nova123456',
      });
    });
  });
});
