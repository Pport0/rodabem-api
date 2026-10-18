import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    alterarSenha: jest.fn(),
  };

  const autenticadoComo = (userId: number) => ({ user: { userId } });

  const guardsDe = (metodo: keyof UsersController) =>
    Reflect.getMetadata('__guards__', UsersController.prototype[metodo]);

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as any);
  });



  describe('listagem', () => {
    it('deve delegar a listagem paginada ao service', async () => {
      usersService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll(autenticadoComo(7), 2, 20, 'gabriel', 'true');

      expect(usersService.findAll).toHaveBeenCalled();
    });


  });



});
