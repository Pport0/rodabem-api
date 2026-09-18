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

  describe('cadastro', () => {
    it('deve repassar o payload ao service', async () => {
      usersService.create.mockResolvedValue({ id: 1 });
      const dto = { nome: 'Gabriel', email: 'g@example.com', senha: '123456', cpf: '52998224725' };

      await controller.create(dto as any);

      expect(usersService.create).toHaveBeenCalledWith(dto);
    });

    it('deve propagar recusa por cpf invalido', async () => {
      usersService.create.mockRejectedValue(new Error('CPF inválido.'));

      await expect(controller.create({} as any)).rejects.toThrow('CPF inválido.');
    });

    it('o cadastro e publico, sem exigir autenticacao', () => {
      expect(guardsDe('create')).toBeUndefined();
    });
  });

  describe('consulta do proprio perfil', () => {
    it('deve consultar pelo identificador do usuario autenticado', async () => {
      usersService.findById.mockResolvedValue({ id: 7 });

      await controller.me(autenticadoComo(7));

      expect(usersService.findById).toHaveBeenCalledWith(7);
    });

    it('deve devolver o perfil sem alteracao', async () => {
      const perfil = { id: 7, nome: 'Gabriel', cpf: '52998224725' };
      usersService.findById.mockResolvedValue(perfil);

      await expect(controller.me(autenticadoComo(7))).resolves.toEqual(perfil);
    });

    it('deve exigir autenticacao', () => {
      expect(guardsDe('me')).toEqual([JwtAuthGuard]);
    });
  });

  describe('listagem', () => {
    it('ignora os parametros de busca e devolve apenas o usuario autenticado', async () => {
      usersService.findById.mockResolvedValue({ id: 7 });

      await controller.findAll(autenticadoComo(7), 2, 20, 'gabriel', 'true');

      expect(usersService.findById).toHaveBeenCalledWith(7);
      expect(usersService.findAll).not.toHaveBeenCalled();
    });

    it('nao repassa pagina, limite, nome nem status a lugar algum', async () => {
      usersService.findById.mockResolvedValue({ id: 7 });

      await controller.findAll(autenticadoComo(7), 5, 50, 'busca', 'false');

      expect(usersService.findById).toHaveBeenCalledWith(7);
      expect(usersService.findById).toHaveBeenCalledTimes(1);
    });

    it('deve exigir autenticacao', () => {
      expect(guardsDe('findAll')).toEqual([JwtAuthGuard]);
    });
  });

  describe('edicao', () => {
    it('deve permitir que o usuario edite o proprio cadastro', async () => {
      usersService.update.mockResolvedValue({ id: 7 });

      await controller.update(autenticadoComo(7), 7, { nome: 'Novo' });

      expect(usersService.update).toHaveBeenCalledWith(7, { nome: 'Novo' });
    });

    it('deve impedir a edicao do cadastro de outro usuario', async () => {
      expect(() =>
        controller.update(autenticadoComo(7), 99, { nome: 'Novo' }),
      ).toThrow(
        new ForbiddenException('Você não tem permissão para editar este usuário.'),
      );
    });

    it('nao deve acionar o service ao recusar a edicao', () => {
      expect(() =>
        controller.update(autenticadoComo(7), 99, { nome: 'Novo' }),
      ).toThrow(ForbiddenException);

      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('deve exigir autenticacao', () => {
      expect(guardsDe('update')).toEqual([JwtAuthGuard]);
    });
  });

  describe('exclusao', () => {
    it('deve permitir que o usuario exclua o proprio cadastro', async () => {
      usersService.remove.mockResolvedValue({ message: 'ok' });

      await controller.remove(autenticadoComo(7), 7);

      expect(usersService.remove).toHaveBeenCalledWith(7);
    });

    it('deve impedir a exclusao do cadastro de outro usuario', () => {
      expect(() => controller.remove(autenticadoComo(7), 99)).toThrow(
        new ForbiddenException('Você não tem permissão para excluir este usuário.'),
      );
    });

    it('nao deve acionar o service ao recusar a exclusao', () => {
      expect(() => controller.remove(autenticadoComo(7), 99)).toThrow(
        ForbiddenException,
      );

      expect(usersService.remove).not.toHaveBeenCalled();
    });

    it('deve propagar a recusa por vinculo existente', async () => {
      usersService.remove.mockRejectedValue(
        new Error('Não é possível excluir o usuário pois ele possui um caminhão cadastrado.'),
      );

      await expect(controller.remove(autenticadoComo(7), 7)).rejects.toThrow(
        /caminhão cadastrado/,
      );
    });

    it('deve exigir autenticacao', () => {
      expect(guardsDe('remove')).toEqual([JwtAuthGuard]);
    });
  });

  describe('troca de senha', () => {
    const dto = { senhaAtual: 'senha123', novaSenha: 'novaSenha456' };

    it('deve alterar a senha do usuario autenticado', async () => {
      usersService.alterarSenha.mockResolvedValue({ message: 'ok' });

      await controller.alterarSenha(autenticadoComo(7), dto);

      expect(usersService.alterarSenha).toHaveBeenCalledWith(7, dto);
    });

    it('nao aceita alterar a senha de outro usuario, pois usa sempre o token', async () => {
      usersService.alterarSenha.mockResolvedValue({ message: 'ok' });

      await controller.alterarSenha(autenticadoComo(7), dto);

      expect(usersService.alterarSenha).toHaveBeenCalledWith(7, expect.anything());
    });

    it('deve propagar recusa por senha atual incorreta', async () => {
      usersService.alterarSenha.mockRejectedValue(new Error('Senha atual incorreta.'));

      await expect(
        controller.alterarSenha(autenticadoComo(7), dto),
      ).rejects.toThrow('Senha atual incorreta.');
    });

    it('deve exigir autenticacao', () => {
      expect(guardsDe('alterarSenha')).toEqual([JwtAuthGuard]);
    });
  });
});
