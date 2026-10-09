import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TipoCombustivel } from '@prisma/client';
import { AbastecimentoService } from './abastecimento.service';

describe('AbastecimentoService', () => {
  let service: AbastecimentoService;

  const prisma = {
    caminhao: {
      findUnique: jest.fn(),
    },
    abastecimento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 1;
  const dto = {
    precoPorLitro: 6,
    totalLitros: 100,
    quilometragem: 1000,
    tipoCombustivel: TipoCombustivel.DIESEL_S10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AbastecimentoService(prisma as any);
  });

  it('deve impedir abastecimento sem caminhao cadastrado', async () => {
    prisma.caminhao.findUnique.mockResolvedValue(null);

    await expect(service.create(userId, dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve criar abastecimento valido', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
    prisma.abastecimento.findFirst.mockResolvedValue(null);
    prisma.abastecimento.create.mockResolvedValue({ id: 1, valorTotal: 600 });

    const result = await service.create(userId, dto as any);

    expect(prisma.abastecimento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        caminhaoId: 10,
        valorTotal: 600,
      }),
    });
    expect(result).toEqual({ id: 1, valorTotal: 600 });
  });

  it('deve calcular valor total automaticamente', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
    prisma.abastecimento.findFirst.mockResolvedValue(null);
    prisma.abastecimento.create.mockResolvedValue({ id: 1, valorTotal: 600 });

    await service.create(userId, dto as any);

    expect(prisma.abastecimento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        valorTotal: 600,
      }),
    });
  });

  it('deve impedir quilometragem menor que a ultima registrada', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
    prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 1200 });

    await expect(
      service.create(userId, { ...dto, quilometragem: 1100 } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve listar apenas abastecimentos do usuario', async () => {
    prisma.abastecimento.findMany.mockResolvedValue([]);

    await service.findAll(userId);

    expect(prisma.abastecimento.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { dataAbastecimento: 'desc' },
      select: expect.any(Object),
    });
  });

  it('deve impedir acesso a abastecimento de outro usuario', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({ id: 1, userId: 2 });

    await expect(service.findOne(userId, 1)).rejects.toThrow(ForbiddenException);
  });

  it('deve recalcular valor total ao editar preco ou litros', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({
      id: 1,
      userId,
      caminhaoId: 10,
      precoPorLitro: 6,
      totalLitros: 100,
      quilometragem: 1000,
    });
    prisma.abastecimento.update.mockResolvedValue({ id: 1, valorTotal: 700 });

    const result = await service.update(userId, 1, {
      precoPorLitro: 7,
    } as any);

    expect(prisma.abastecimento.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        precoPorLitro: 7,
        valorTotal: 700,
      }),
    });
    expect(result).toEqual({ id: 1, valorTotal: 700 });
  });

  it('deve recalcular e validar quilometragem na edicao', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({
      id: 1,
      userId,
      caminhaoId: 10,
      precoPorLitro: 6,
      totalLitros: 100,
      quilometragem: 1500,
    });
    prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 1600 });

    await expect(
      service.update(userId, 1, { quilometragem: 1400 } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve excluir abastecimento do proprio usuario', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({ id: 1, userId });
    prisma.abastecimento.delete.mockResolvedValue({ id: 1 });

    const result = await service.remove(userId, 1);

    expect(prisma.abastecimento.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.message).toContain('excluído com sucesso');
  });

  it('deve calcular media de consumo com dois ou mais abastecimentos', async () => {
    prisma.abastecimento.findMany.mockResolvedValue([
      { quilometragem: 1000, totalLitros: 80, dataAbastecimento: new Date() },
      { quilometragem: 1400, totalLitros: 50, dataAbastecimento: new Date() },
      { quilometragem: 1800, totalLitros: 40, dataAbastecimento: new Date() },
    ]);

    const result = await service.calcularMediaConsumo(userId);

    expect(result.mediaConsumo).toBe(9);
    expect(result.totalTrechosCalculados).toBe(2);
  });

  it('deve retornar mensagem apropriada quando nao houver abastecimentos suficientes', async () => {
    prisma.abastecimento.findMany.mockResolvedValue([
      { quilometragem: 1000, totalLitros: 80, dataAbastecimento: new Date() },
    ]);

    const result = await service.calcularMediaConsumo(userId);

    expect(result.mediaConsumo).toBeNull();
    expect(result.mensagem).toContain('pelo menos dois abastecimentos');
  });

  describe('relatorio por periodo', () => {
    const registro = (over = {}) => ({
      id: 1,
      dataAbastecimento: new Date('2026-01-10'),
      localDescricao: 'Posto A',
      postoIdentificado: 'Ipiranga',
      totalLitros: 100,
      valorTotal: 600,
      quilometragem: 1000,
      tipoCombustivel: TipoCombustivel.DIESEL_S10,
      precoPorLitro: 6,
      ...over,
    });

    it('deve exigir a data inicial', async () => {
      await expect(service.relatorio(userId, '', '2026-01-31')).rejects.toThrow(
        'dataInicio e dataFim são obrigatórios.',
      );
    });

    it('deve exigir a data final', async () => {
      await expect(service.relatorio(userId, '2026-01-01', '')).rejects.toThrow(
        'dataInicio e dataFim são obrigatórios.',
      );
    });

    it('deve recusar periodo com inicio posterior ao fim', async () => {
      await expect(
        service.relatorio(userId, '2026-02-01', '2026-01-01'),
      ).rejects.toThrow('dataInicio não pode ser maior que dataFim.');
    });

    it('nao deve consultar o banco quando o periodo e invalido', async () => {
      await expect(
        service.relatorio(userId, '2026-02-01', '2026-01-01'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.abastecimento.findMany).not.toHaveBeenCalled();
    });

    it('deve aceitar periodo de um unico dia', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await expect(
        service.relatorio(userId, '2026-01-10', '2026-01-10'),
      ).resolves.toBeDefined();
    });

    it('o intervalo deve cobrir o dia final por inteiro', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.relatorio(userId, '2026-01-01', '2026-01-31');

      const { gte, lte } = prisma.abastecimento.findMany.mock.calls[0][0].where
        .dataAbastecimento as { gte: Date; lte: Date };
      const umDia = 24 * 60 * 60 * 1000;

      // 01/01 00:00 ate 31/01 23:59:59.999 = 31 dias completos
      expect(lte.getTime() - gte.getTime()).toBeGreaterThan(31 * umDia - 1000);
    });

    it('um registro do fim do dia final deve entrar no intervalo', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.relatorio(userId, '2026-01-01', '2026-01-31');

      const { lte } = prisma.abastecimento.findMany.mock.calls[0][0].where
        .dataAbastecimento as { lte: Date };

      expect(lte >= new Date('2026-01-31T23:00:00.000Z')).toBe(true);
    });

    it('deve filtrar apenas os abastecimentos do proprio usuario', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(prisma.abastecimento.findMany.mock.calls[0][0].where.userId).toBe(
        userId,
      );
    });

    it('deve ordenar do mais antigo para o mais recente', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(prisma.abastecimento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { dataAbastecimento: 'asc' } }),
      );
    });

    it('deve somar litros e valores do periodo', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        registro({ totalLitros: 100, valorTotal: 600, quilometragem: 1000 }),
        registro({ id: 2, totalLitros: 50.5, valorTotal: 303, quilometragem: 1500 }),
      ]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.totalLitros).toBe(150.5);
      expect(resultado.totalGasto).toBe(903);
    });

    it('deve arredondar os totais para duas casas decimais', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        registro({ totalLitros: 10.333, valorTotal: 61.999 }),
        registro({ id: 2, totalLitros: 10.333, valorTotal: 61.999 }),
      ]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.totalLitros).toBe(20.67);
      expect(resultado.totalGasto).toBe(124);
    });

    it('deve calcular a distancia entre o primeiro e o ultimo registro', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        registro({ quilometragem: 1000 }),
        registro({ id: 2, quilometragem: 1500 }),
        registro({ id: 3, quilometragem: 2300 }),
      ]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.distanciaPercorrida).toBe(1300);
    });

    it('deve devolver distancia zero quando ha um unico abastecimento', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        registro({ quilometragem: 1000 }),
      ]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.distanciaPercorrida).toBe(0);
    });

    it('deve devolver relatorio zerado quando nao ha abastecimentos no periodo', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.totalAbastecimentos).toBe(0);
      expect(resultado.totalLitros).toBe(0);
      expect(resultado.totalGasto).toBe(0);
      expect(resultado.distanciaPercorrida).toBe(0);
      expect(resultado.abastecimentos).toEqual([]);
    });

    it('deve ecoar o periodo solicitado na resposta', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.periodo).toEqual({
        dataInicio: '2026-01-01',
        dataFim: '2026-01-31',
      });
    });

    it('deve informar a quantidade de abastecimentos do periodo', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        registro(),
        registro({ id: 2 }),
        registro({ id: 3 }),
      ]);

      const resultado = await service.relatorio(userId, '2026-01-01', '2026-01-31');

      expect(resultado.totalAbastecimentos).toBe(3);
    });

    it('nao deve selecionar campos de vinculo interno no relatorio', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.relatorio(userId, '2026-01-01', '2026-01-31');

      const select = prisma.abastecimento.findMany.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('userId');
      expect(select).not.toHaveProperty('caminhaoId');
    });

  });

  describe('validacao de quilometragem', () => {
    beforeEach(() => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
      prisma.abastecimento.create.mockResolvedValue({ id: 1 });
    });

    it('deve aceitar o primeiro abastecimento do caminhao', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dto as any)).resolves.toBeDefined();
    });

    it('deve recusar quilometragem igual a ultima registrada', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 1000 });

      await expect(
        service.create(userId, { ...dto, quilometragem: 1000 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('nao deve gravar o abastecimento quando a quilometragem se repete', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 1000 });

      await expect(
        service.create(userId, { ...dto, quilometragem: 1000 } as any),
      ).rejects.toThrow();

      expect(prisma.abastecimento.create).not.toHaveBeenCalled();
    });

    it('deve informar a quilometragem esperada na mensagem de recusa', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 5000 });

      await expect(
        service.create(userId, { ...dto, quilometragem: 4000 } as any),
      ).rejects.toThrow('(4000 km) não pode ser menor que a última registrada (5000 km)');
    });

    it('deve buscar a maior quilometragem do caminhao', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue(null);

      await service.create(userId, dto as any);

      expect(prisma.abastecimento.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { quilometragem: 'desc' } }),
      );
    });

    it('nao deve ignorar registro algum ao validar um cadastro novo', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue(null);

      await service.create(userId, dto as any);

      expect(prisma.abastecimento.findFirst.mock.calls[0][0].where).not.toHaveProperty(
        'id',
      );
    });

    it('deve ignorar o proprio registro ao validar uma edicao', async () => {
      prisma.abastecimento.findUnique.mockResolvedValue({
        id: 7,
        userId,
        caminhaoId: 10,
        quilometragem: 1000,
        precoPorLitro: 6,
        totalLitros: 100,
      });
      prisma.abastecimento.findFirst.mockResolvedValue(null);
      prisma.abastecimento.update.mockResolvedValue({ id: 7 });

      await service.update(userId, 7, { quilometragem: 2000 } as any);

      expect(prisma.abastecimento.findFirst.mock.calls[0][0].where.id).toEqual({
        not: 7,
      });
    });
  });

  describe('vinculo do abastecimento', () => {
    it('deve vincular o registro ao caminhao e ao usuario autenticado', async () => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
      prisma.abastecimento.findFirst.mockResolvedValue(null);
      prisma.abastecimento.create.mockResolvedValue({ id: 1 });

      await service.create(userId, dto as any);

      expect(prisma.abastecimento.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, caminhaoId: 10 }),
      });
    });

    it('deve registrar a data do abastecimento no momento da criacao', async () => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
      prisma.abastecimento.findFirst.mockResolvedValue(null);
      prisma.abastecimento.create.mockResolvedValue({ id: 1 });
      const antes = Date.now();

      await service.create(userId, dto as any);

      const data = prisma.abastecimento.create.mock.calls[0][0].data
        .dataAbastecimento as Date;
      expect(data.getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('nao deve selecionar o vinculo com o usuario na listagem', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.findAll(userId);

      expect(prisma.abastecimento.findMany.mock.calls[0][0].select).not.toHaveProperty(
        'userId',
      );
    });

    it('deve listar do mais recente para o mais antigo', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await service.findAll(userId);

      expect(prisma.abastecimento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { dataAbastecimento: 'desc' } }),
      );
    });
  });


  describe('consulta individual', () => {
    it('deve recusar consulta de abastecimento inexistente', async () => {
      prisma.abastecimento.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, 999)).rejects.toThrow(
        'Abastecimento não encontrado.',
      );
    });

    it('deve devolver o abastecimento do proprio usuario', async () => {
      const registro = { id: 1, userId, quilometragem: 1000 };
      prisma.abastecimento.findUnique.mockResolvedValue(registro);

      await expect(service.findOne(userId, 1)).resolves.toEqual(registro);
    });

    it('deve recusar exclusao de abastecimento inexistente', async () => {
      prisma.abastecimento.findUnique.mockResolvedValue(null);

      await expect(service.remove(userId, 999)).rejects.toThrow(NotFoundException);
      expect(prisma.abastecimento.delete).not.toHaveBeenCalled();
    });

    it('deve recusar exclusao de abastecimento de outro usuario', async () => {
      prisma.abastecimento.findUnique.mockResolvedValue({ id: 1, userId: 999 });

      await expect(service.remove(userId, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.abastecimento.delete).not.toHaveBeenCalled();
    });
  });

  describe('media de consumo com registros inconsistentes', () => {
    it('nao deve calcular media quando a quilometragem nao avanca', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
      ]);

      const resultado = await service.calcularMediaConsumo(userId);

      expect(resultado.mediaConsumo).toBeNull();
      expect(resultado.mensagem).toBe(
        'Não foi possível calcular a média com os registros disponíveis.',
      );
    });

    it('nao deve calcular media quando o total de litros e zero', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        { quilometragem: 1000, totalLitros: 50, dataAbastecimento: new Date() },
        { quilometragem: 1500, totalLitros: 0, dataAbastecimento: new Date() },
      ]);

      await expect(service.calcularMediaConsumo(userId)).resolves.toMatchObject({
        mediaConsumo: null,
      });
    });

    it('deve informar o total de registros mesmo sem conseguir calcular', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
      ]);

      const resultado = await service.calcularMediaConsumo(userId);

      expect(resultado.totalAbastecimentos).toBe(2);
    });

    it('deve ignorar apenas os trechos invalidos e calcular com os demais', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
        { quilometragem: 1500, totalLitros: 100, dataAbastecimento: new Date() },
      ]);

      const resultado = await service.calcularMediaConsumo(userId);

      expect(resultado.mediaConsumo).toBe(5);
      expect(resultado.totalTrechosCalculados).toBe(1);
    });

    it('deve devolver media nula quando ha um unico abastecimento', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        { quilometragem: 1000, totalLitros: 100, dataAbastecimento: new Date() },
      ]);

      const resultado = await service.calcularMediaConsumo(userId);

      expect(resultado.mediaConsumo).toBeNull();
      expect(resultado.mensagem).toContain('pelo menos dois abastecimentos');
    });

    it('deve devolver media nula quando nao ha abastecimento algum', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      const resultado = await service.calcularMediaConsumo(userId);

      expect(resultado.totalAbastecimentos).toBe(0);
      expect(resultado.mediaConsumo).toBeNull();
    });

    it('deve arredondar a media para duas casas decimais', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([
        { quilometragem: 0, totalLitros: 100, dataAbastecimento: new Date() },
        { quilometragem: 1000, totalLitros: 3, dataAbastecimento: new Date() },
      ]);

      const resultado = await service.calcularMediaConsumo(userId);

      expect(resultado.mediaConsumo).toBe(333.33);
    });
  });

  describe('edicao parcial', () => {
    const existente = {
      id: 1,
      userId,
      caminhaoId: 10,
      precoPorLitro: 6,
      totalLitros: 100,
      quilometragem: 1000,
    };

    beforeEach(() => {
      prisma.abastecimento.findUnique.mockResolvedValue(existente);
      prisma.abastecimento.update.mockResolvedValue({ id: 1 });
    });

    it('nao deve revalidar a quilometragem quando ela nao muda', async () => {
      await service.update(userId, 1, { quilometragem: 1000 } as any);

      expect(prisma.abastecimento.findFirst).not.toHaveBeenCalled();
    });

    it('nao deve revalidar a quilometragem quando ela nao e enviada', async () => {
      await service.update(userId, 1, { observacao: 'nota' } as any);

      expect(prisma.abastecimento.findFirst).not.toHaveBeenCalled();
    });

    it('nao deve enviar campos ausentes do payload', async () => {
      await service.update(userId, 1, { observacao: 'nota' } as any);

      const data = prisma.abastecimento.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('precoPorLitro');
      expect(data).not.toHaveProperty('quilometragem');
      expect(data.observacao).toBe('nota');
    });

    it('deve enviar todos os campos opcionais quando informados', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue(null);

      await service.update(userId, 1, {
        precoPorLitro: 7,
        totalLitros: 50,
        quilometragem: 2000,
        tipoCombustivel: TipoCombustivel.DIESEL_S500,
        latitude: -16.6,
        longitude: -49.2,
        localDescricao: 'Posto Central',
        postoIdentificado: 'Ipiranga',
        imagemUrl: 'http://exemplo/nota.jpg',
        observacao: 'viagem longa',
      } as any);

      expect(prisma.abastecimento.update.mock.calls[0][0].data).toMatchObject({
        precoPorLitro: 7,
        totalLitros: 50,
        quilometragem: 2000,
        latitude: -16.6,
        longitude: -49.2,
        localDescricao: 'Posto Central',
        postoIdentificado: 'Ipiranga',
        imagemUrl: 'http://exemplo/nota.jpg',
        observacao: 'viagem longa',
      });
    });

    it('deve recalcular o valor total usando o valor existente quando so um campo muda', async () => {
      await service.update(userId, 1, { precoPorLitro: 7 } as any);

      expect(prisma.abastecimento.update.mock.calls[0][0].data.valorTotal).toBe(700);
    });

    it('deve recalcular o valor total mesmo sem alteracao monetaria', async () => {
      await service.update(userId, 1, { observacao: 'nota' } as any);

      expect(prisma.abastecimento.update.mock.calls[0][0].data.valorTotal).toBe(600);
    });

    it('deve impedir edicao de abastecimento de outro usuario', async () => {
      prisma.abastecimento.findUnique.mockResolvedValue({ ...existente, userId: 999 });

      await expect(
        service.update(userId, 1, { observacao: 'nota' } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.abastecimento.update).not.toHaveBeenCalled();
    });
  });

});
