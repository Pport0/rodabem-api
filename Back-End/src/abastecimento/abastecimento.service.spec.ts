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





    it('deve aceitar periodo de um unico dia', async () => {
      prisma.abastecimento.findMany.mockResolvedValue([]);

      await expect(
        service.relatorio(userId, '2026-01-10', '2026-01-10'),
      ).resolves.toBeDefined();
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





  });

  describe('validacao de quilometragem', () => {
    beforeEach(() => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
      prisma.abastecimento.create.mockResolvedValue({ id: 1 });
    });




    it('deve informar a quilometragem esperada na mensagem de recusa', async () => {
      prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 5000 });

      await expect(
        service.create(userId, { ...dto, quilometragem: 4000 } as any),
      ).rejects.toThrow('(4000 km) não pode ser menor que a última registrada (5000 km)');
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



    it('deve recalcular o valor total usando o valor existente quando so um campo muda', async () => {
      await service.update(userId, 1, { precoPorLitro: 7 } as any);

      expect(prisma.abastecimento.update.mock.calls[0][0].data.valorTotal).toBe(700);
    });

    it('deve recalcular o valor total mesmo sem alteracao monetaria', async () => {
      await service.update(userId, 1, { observacao: 'nota' } as any);

      expect(prisma.abastecimento.update.mock.calls[0][0].data.valorTotal).toBe(600);
    });

  });

});
