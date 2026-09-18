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

 
  it('deve criar usuario com dados validos', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 1,
      nome: 'João Silva',
      email: 'joao@email.com',
      senhaHash: 'hash',
      cpfEncrypted: 'enc',
      cpfHash: 'hash',
      telefone: null,
      avatarUrl: null,
      status: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      nome: 'João Silva',
      email: 'joao@email.com',
      senha: '123456',
      cpf: '529.982.247-25',
    } as any);

    expect(prisma.user.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('senhaHash');
    expect(result).not.toHaveProperty('cpfEncrypted');
    expect(result).not.toHaveProperty('cpfHash');
  });

  it('deve impedir cadastro com CPF invalido', async () => {
    await expect(
      service.create({
        nome: 'João',
        email: 'joao@email.com',
        senha: '123456',
        cpf: '111.111.111-11',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve impedir cadastro com CPF ja existente', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 2 });

    await expect(
      service.create({
        nome: 'João',
        email: 'joao@email.com',
        senha: '123456',
        cpf: '529.982.247-25',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('deve impedir cadastro com e-mail ja existente', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // CPF não existe
      .mockResolvedValueOnce({ id: 2 }); // e-mail já existe

    await expect(
      service.create({
        nome: 'João',
        email: 'joao@email.com',
        senha: '123456',
        cpf: '529.982.247-25',
      } as any),
    ).rejects.toThrow(ConflictException);
  });


  it('deve retornar usuario pelo id', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      nome: 'João',
      email: 'joao@email.com',
      telefone: null,
      avatarUrl: null,
      status: true,
      createdAt: new Date(),
    });

    const result = await service.findById(userId);

    expect(result.id).toBe(userId);
    expect(result).not.toHaveProperty('senhaHash');
  });

  it('deve lancar erro ao buscar usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toThrow(BadRequestException);
  });

 
  it('deve atualizar dados do usuario', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.user.update.mockResolvedValue({
      id: userId,
      nome: 'João Atualizado',
      email: 'joao@email.com',
      telefone: null,
      avatarUrl: null,
      status: true,
    });

    const result = await service.update(userId, { nome: 'João Atualizado' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { nome: 'João Atualizado' },
      select: expect.any(Object),
    });
    expect(result.nome).toBe('João Atualizado');
  });

  it('deve lancar erro ao atualizar usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.update(999, { nome: 'Teste' }),
    ).rejects.toThrow(NotFoundException);
  });


  it('deve excluir usuario sem vinculos', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(0);
    prisma.user.delete.mockResolvedValue({ id: userId });

    const result = await service.remove(userId);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    expect(result.message).toContain('excluído com sucesso');
  });

  it('deve impedir exclusao de usuario com caminhao vinculado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });

    await expect(service.remove(userId)).rejects.toThrow(BadRequestException);
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


  it('deve alterar senha com senha atual correta', async () => {
    const bcrypt = require('bcrypt');
    const senhaHash = await bcrypt.hash('senha123', 10);

    prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
    prisma.user.update.mockResolvedValue({ id: userId });

    const result = await service.alterarSenha(userId, {
      senhaAtual: 'senha123',
      novaSenha: 'novaSenha456',
    });

    expect(prisma.user.update).toHaveBeenCalled();
    expect(result.message).toContain('Senha alterada com sucesso');
  });

  it('deve impedir troca de senha com senha atual incorreta', async () => {
    const bcrypt = require('bcrypt');
    const senhaHash = await bcrypt.hash('senha123', 10);

    prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

    await expect(
      service.alterarSenha(userId, {
        senhaAtual: 'senhaErrada',
        novaSenha: 'novaSenha456',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve impedir troca de senha com nova senha curta', async () => {
    const bcrypt = require('bcrypt');
    const senhaHash = await bcrypt.hash('senha123', 10);

    prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

    await expect(
      service.alterarSenha(userId, {
        senhaAtual: 'senha123',
        novaSenha: '123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('cadastro - dados sensiveis', () => {
    const dtoValido = {
      nome: 'Gabriel',
      email: 'gabriel@example.com',
      senha: '123456',
      cpf: '529.982.247-25',
      telefone: '62999999999',
    };

    it('deve aceitar cpf com e sem formatacao', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      await expect(service.create(dtoValido as any)).resolves.toBeDefined();
      await expect(
        service.create({ ...dtoValido, cpf: '52998224725' } as any),
      ).resolves.toBeDefined();
    });

    it('deve recusar cpf com menos de onze digitos', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '1234567890' } as any),
      ).rejects.toThrow('CPF inválido.');
    });

    it('deve recusar cpf com mais de onze digitos', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '123456789012' } as any),
      ).rejects.toThrow('CPF inválido.');
    });

    it('deve aceitar cpf cujo primeiro digito verificador vem de resto dez', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      await expect(
        service.create({ ...dtoValido, cpf: '00000000604' } as any),
      ).resolves.toBeDefined();
    });

    it('deve aceitar cpf cujo segundo digito verificador vem de resto dez', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      await expect(
        service.create({ ...dtoValido, cpf: '00000001830' } as any),
      ).resolves.toBeDefined();
    });

    it('deve recusar cpf com todos os digitos iguais', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '111.111.111-11' } as any),
      ).rejects.toThrow('CPF inválido.');
    });

    it('deve recusar cpf com primeiro digito verificador incorreto', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '52998224735' } as any),
      ).rejects.toThrow('CPF inválido.');
    });

    it('deve recusar cpf com segundo digito verificador incorreto', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '52998224724' } as any),
      ).rejects.toThrow('CPF inválido.');
    });

    it('nao deve consultar o banco quando o cpf e invalido', async () => {
      await expect(
        service.create({ ...dtoValido, cpf: '00000000000' } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('deve buscar duplicidade de cpf pelo hash, nunca pelo valor em texto puro', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      await service.create(dtoValido as any);

      const primeiraBusca = prisma.user.findUnique.mock.calls[0][0];
      expect(Object.keys(primeiraBusca.where)).toEqual(['cpfHash']);
      expect(JSON.stringify(primeiraBusca)).not.toContain('52998224725');
    });

    it('nunca deve persistir a senha nem o cpf em texto puro', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      await service.create(dtoValido as any);

      const persistido = JSON.stringify(prisma.user.create.mock.calls[0][0].data);
      expect(persistido).not.toContain('123456');
      expect(persistido).not.toContain('529.982.247-25');
    });

    it('nao deve gerar hash nem cifrar quando o cadastro e recusado por duplicidade', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 99 });

      await expect(service.create(dtoValido as any)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('consulta do proprio perfil', () => {
    it('deve devolver o cpf decifrado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        nome: 'Gabriel',
        email: 'gabriel@example.com',
        cpfEncrypted: null,
      });

      const resultado = await service.findById(userId);

      expect(resultado).toHaveProperty('cpf');
    });

    it('deve devolver cpf nulo quando o usuario nao possui cpf cifrado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        nome: 'Gabriel',
        cpfEncrypted: null,
      });

      const resultado = await service.findById(userId);

      expect(resultado.cpf).toBeNull();
    });

    it('nunca deve expor o cpf cifrado nem a senha', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        nome: 'Gabriel',
        cpfEncrypted: null,
      });

      const resultado = await service.findById(userId);

      expect(resultado).not.toHaveProperty('cpfEncrypted');
      expect(resultado).not.toHaveProperty('senhaHash');
    });

    it('nao deve selecionar campos sensiveis na consulta', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: userId, cpfEncrypted: null });

      await service.findById(userId);

      const select = prisma.user.findUnique.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('senhaHash');
      expect(select).not.toHaveProperty('cpfHash');
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

    it('deve calcular o salto a partir da pagina e do limite', async () => {
      await service.findAll({ page: 3, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
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

    it('deve converter qualquer outro status em filtro booleano falso', async () => {
      await service.findAll({ status: 'false' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: false } }),
      );
    });

    it('nao deve aplicar filtro de status quando ele nao e informado', async () => {
      await service.findAll({ nome: 'gab' });

      expect(prisma.user.findMany.mock.calls[0][0].where).not.toHaveProperty(
        'status',
      );
    });

    it('deve contar o total com o mesmo filtro da listagem', async () => {
      await service.findAll({ nome: 'gab', status: 'true' });

      expect(prisma.user.count.mock.calls[0][0].where).toEqual(
        prisma.user.findMany.mock.calls[0][0].where,
      );
    });

    it('nao deve selecionar campos sensiveis na listagem', async () => {
      await service.findAll({});

      const select = prisma.user.findMany.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('senhaHash');
      expect(select).not.toHaveProperty('cpfEncrypted');
      expect(select).not.toHaveProperty('cpfHash');
    });

    it('deve ordenar do mais recente para o mais antigo', async () => {
      await service.findAll({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
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

    it('nao deve consultar documentos quando ha caminhao vinculado', async () => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });

      await expect(service.remove(userId)).rejects.toThrow(BadRequestException);

      expect(prisma.documento.count).not.toHaveBeenCalled();
      expect(prisma.abastecimento.count).not.toHaveBeenCalled();
    });

    it('nao deve consultar abastecimentos quando ha documentos vinculados', async () => {
      prisma.caminhao.findUnique.mockResolvedValue(null);
      prisma.documento.count.mockResolvedValue(3);

      await expect(service.remove(userId)).rejects.toThrow(BadRequestException);

      expect(prisma.abastecimento.count).not.toHaveBeenCalled();
    });

    it('nao deve excluir o usuario quando ha vinculo de qualquer tipo', async () => {
      prisma.caminhao.findUnique.mockResolvedValue(null);
      prisma.documento.count.mockResolvedValue(0);
      prisma.abastecimento.count.mockResolvedValue(2);

      await expect(service.remove(userId)).rejects.toThrow(BadRequestException);

      expect(prisma.user.delete).not.toHaveBeenCalled();
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

    it('deve aceitar nova senha com exatamente seis caracteres', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
      prisma.user.update.mockResolvedValue({ id: userId });

      await expect(
        service.alterarSenha(userId, { senhaAtual: 'senha123', novaSenha: '123456' }),
      ).resolves.toEqual({ message: 'Senha alterada com sucesso.' });
    });

    it('nao deve gravar nada quando a nova senha e curta demais', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

      await expect(
        service.alterarSenha(userId, { senhaAtual: 'senha123', novaSenha: '12345' }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('deve gravar a nova senha com hash, nunca em texto puro', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.alterarSenha(userId, {
        senhaAtual: 'senha123',
        novaSenha: 'novaSenha456',
      });

      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.senhaHash).not.toBe('novaSenha456');
      expect(await bcrypt.compare('novaSenha456', data.senhaHash)).toBe(true);
    });

    it('deve alterar apenas o campo de senha', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.alterarSenha(userId, {
        senhaAtual: 'senha123',
        novaSenha: 'novaSenha456',
      });

      expect(Object.keys(prisma.user.update.mock.calls[0][0].data)).toEqual([
        'senhaHash',
      ]);
    });

    it('deve recusar troca de senha de usuario inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.alterarSenha(999, { senhaAtual: 'x', novaSenha: 'novaSenha456' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('edicao de dados', () => {
    it('nao deve devolver campos sensiveis apos a atualizacao', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: userId });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.update(userId, { nome: 'Novo' });

      const select = prisma.user.update.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('senhaHash');
      expect(select).not.toHaveProperty('cpfEncrypted');
      expect(select).not.toHaveProperty('cpfHash');
    });

    it('nao deve permitir alterar a senha por este caminho', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: userId });
      prisma.user.update.mockResolvedValue({ id: userId });

      await service.update(userId, { nome: 'Novo' });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ nome: 'Novo' });
    });
  });

});