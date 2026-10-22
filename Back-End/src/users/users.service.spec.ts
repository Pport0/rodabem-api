import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    caminhao: {
      findUnique: jest.fn(),
    },
    documento: {
      count: jest.fn(),
    },
    abastecimento: {
      count: jest.fn(),
    },
  };

  const userId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as any);
  });

 






  it('deve lancar erro ao buscar usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toThrow(BadRequestException);
  });

 

  it('deve lancar erro ao atualizar usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.update(999, { nome: 'Teste' }),
    ).rejects.toThrow(NotFoundException);
  });




  it('deve impedir exclusao de usuario com documentos vinculados', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.documento.count.mockResolvedValue(3);

    await expect(service.remove(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve impedir exclusao de usuario com abastecimentos vinculados', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(2);

    await expect(service.remove(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve lancar erro ao excluir usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });





  describe('cadastro - dados sensiveis', () => {
    const dtoValido = {
      nome: 'Gabriel',
      email: 'gabriel@example.com',
      senha: '123456',
      cpf: '529.982.247-25',
      telefone: '62999999999',
    };









    it('nao deve consultar o banco quando o cpf e invalido', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '00000000000' } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });



  });

  describe('consulta do proprio perfil', () => {

    it('deve devolver cpf nulo quando o usuario nao possui cpf cifrado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        nome: 'Gabriel',
        cpfEncrypted: null,
      });

      const resultado = await service.findById(userId);

      expect(resultado.cpf).toBeNull();
    });


  });

  describe('listagem paginada', () => {
    beforeEach(() => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
    });

    it('deve usar pagina 1 e limite 10 por padrao', async () => {
      const resultado = await service.findAll({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10, where: {} }),
      );
      expect(resultado).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });


    it('deve filtrar por nome sem diferenciar caixa', async () => {
      await service.findAll({ nome: 'gab' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nome: { contains: 'gab', mode: 'insensitive' } },
        }),
      );
    });

    it('deve converter status "true" em filtro booleano verdadeiro', async () => {
      await service.findAll({ status: 'true' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: true } }),
      );
    });






    it('deve devolver o total mesmo quando a pagina esta vazia', async () => {
      prisma.user.count.mockResolvedValue(42);

      await expect(service.findAll({ page: 99, limit: 10 })).resolves.toEqual({
        data: [],
        total: 42,
        page: 99,
        limit: 10,
      });
    });

    it('deve tratar pagina e limite recebidos como texto na query', async () => {
      await service.findAll({ page: '2', limit: '5' } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('ordem das verificacoes na exclusao', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ id: userId });
    });




    it('deve orientar a remover o vinculo antes de excluir', async () => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });

      await expect(service.remove(userId)).rejects.toThrow(
        /Remova o caminhão primeiro/,
      );
    });
  });

  describe('troca de senha', () => {
    const bcrypt = require('bcrypt');

    it('deve verificar a senha atual antes de validar o tamanho da nova', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

      await expect(
        service.alterarSenha(userId, { senhaAtual: 'errada', novaSenha: '1' }),
      ).rejects.toThrow('Senha atual incorreta.');
    });


    it('nao deve gravar nada quando a nova senha e curta demais', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

      await expect(
        service.alterarSenha(userId, { senhaAtual: 'senha123', novaSenha: '12345' }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });


    it('nao deve mexer nos dados cadastrais ao trocar a senha', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.alterarSenha(userId, {
        senhaAtual: 'senha123',
        novaSenha: 'novaSenha456',
      });

      const { data } = prisma.user.update.mock.calls[0][0];

      expect(data).not.toHaveProperty('nome');
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('telefone');
      expect(data).not.toHaveProperty('status');
      expect(data).not.toHaveProperty('cpfEncrypted');
    });

    it('deve encerrar as sessoes existentes ao trocar a senha', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.alterarSenha(userId, {
        senhaAtual: 'senha123',
        novaSenha: 'novaSenha456',
      });

      const { data } = prisma.user.update.mock.calls[0][0];

      expect(data.tokenVersion).toEqual({ increment: 1 });
    });

    it('deve recusar troca de senha de usuario inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.alterarSenha(999, { senhaAtual: 'x', novaSenha: 'novaSenha456' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('edicao de dados', () => {

    it('nao deve permitir alterar a senha por este caminho', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: userId });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.update(userId, { nome: 'Novo' });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ nome: 'Novo' });
    });
  });

});