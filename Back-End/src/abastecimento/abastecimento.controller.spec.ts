import { AbastecimentoController } from './abastecimento.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('AbastecimentoController', () => {
  let controller: AbastecimentoController;

  const abastecimentoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    relatorio: jest.fn(),
    calcularMediaConsumo: jest.fn(),
  };

  const autenticadoComo = (userId: number) => ({ user: { userId } });

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AbastecimentoController(abastecimentoService as any);
  });

  it('todos os endpoints exigem autenticacao pelo guard da classe', () => {
    expect(Reflect.getMetadata('__guards__', AbastecimentoController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  describe('cadastro', () => {
    it('deve registrar o abastecimento para o usuario autenticado', async () => {
      abastecimentoService.create.mockResolvedValue({ id: 1 });
      const dto = { precoPorLitro: 6, totalLitros: 100, quilometragem: 1000 };

      await controller.create(autenticadoComo(7), dto as any);

      expect(abastecimentoService.create).toHaveBeenCalledWith(7, dto);
    });

    it('nao deve aceitar identificador de usuario vindo do corpo', async () => {
      abastecimentoService.create.mockResolvedValue({ id: 1 });

      await controller.create(autenticadoComo(7), { userId: 999 } as any);

      expect(abastecimentoService.create).toHaveBeenCalledWith(7, expect.anything());
    });

    it('deve propagar recusa por ausencia de caminhao', async () => {
      abastecimentoService.create.mockRejectedValue(
        new Error('Você precisa cadastrar um caminhão antes de registrar um abastecimento.'),
      );

      await expect(controller.create(autenticadoComo(7), {} as any)).rejects.toThrow(
        /cadastrar um caminhão/,
      );
    });
  });

  describe('listagem', () => {
    it('deve listar apenas os abastecimentos do usuario autenticado', async () => {
      abastecimentoService.findAll.mockResolvedValue([]);

      await controller.findAll(autenticadoComo(7));

      expect(abastecimentoService.findAll).toHaveBeenCalledWith(7);
    });

    it('deve devolver a lista sem alteracao', async () => {
      const lista = [{ id: 1 }, { id: 2 }];
      abastecimentoService.findAll.mockResolvedValue(lista);

      await expect(controller.findAll(autenticadoComo(7))).resolves.toEqual(lista);
    });
  });

  describe('media de consumo', () => {
    it('deve calcular a media do usuario autenticado', async () => {
      abastecimentoService.calcularMediaConsumo.mockResolvedValue({ mediaConsumo: 5 });

      await controller.mediaConsumo(autenticadoComo(7));

      expect(abastecimentoService.calcularMediaConsumo).toHaveBeenCalledWith(7);
    });

    it('deve devolver o resultado sem alteracao', async () => {
      const resultado = { mediaConsumo: 5, unidade: 'km/L' };
      abastecimentoService.calcularMediaConsumo.mockResolvedValue(resultado);

      await expect(controller.mediaConsumo(autenticadoComo(7))).resolves.toEqual(
        resultado,
      );
    });
  });

  describe('relatorio por periodo', () => {
    it('deve repassar o periodo informado na query', async () => {
      abastecimentoService.relatorio.mockResolvedValue({});

      await controller.relatorio(autenticadoComo(7), '2026-01-01', '2026-01-31');

      expect(abastecimentoService.relatorio).toHaveBeenCalledWith(
        7,
        '2026-01-01',
        '2026-01-31',
      );
    });

    it('deve repassar periodo ausente para o service decidir', async () => {
      abastecimentoService.relatorio.mockRejectedValue(
        new Error('dataInicio e dataFim são obrigatórios.'),
      );

      await expect(
        controller.relatorio(autenticadoComo(7), undefined as any, undefined as any),
      ).rejects.toThrow('dataInicio e dataFim são obrigatórios.');
    });

    it('deve propagar recusa de periodo invertido', async () => {
      abastecimentoService.relatorio.mockRejectedValue(
        new Error('dataInicio não pode ser maior que dataFim.'),
      );

      await expect(
        controller.relatorio(autenticadoComo(7), '2026-02-01', '2026-01-01'),
      ).rejects.toThrow('dataInicio não pode ser maior que dataFim.');
    });
  });

  describe('consulta individual', () => {
    it('deve consultar com o identificador do usuario autenticado', async () => {
      abastecimentoService.findOne.mockResolvedValue({ id: 3 });

      await controller.findOne(autenticadoComo(7), 3);

      expect(abastecimentoService.findOne).toHaveBeenCalledWith(7, 3);
    });

    it('deve propagar recusa de acesso a registro alheio', async () => {
      abastecimentoService.findOne.mockRejectedValue(
        new Error('Você não tem permissão para acessar este abastecimento.'),
      );

      await expect(controller.findOne(autenticadoComo(7), 3)).rejects.toThrow(
        /permissão para acessar/,
      );
    });
  });

  describe('edicao', () => {
    it('deve repassar o identificador do usuario autenticado e o do registro', async () => {
      abastecimentoService.update.mockResolvedValue({ id: 3 });
      const dto = { observacao: 'nota' };

      await controller.update(autenticadoComo(7), 3, dto as any);

      expect(abastecimentoService.update).toHaveBeenCalledWith(7, 3, dto);
    });

    it('deve propagar recusa por quilometragem regressiva', async () => {
      abastecimentoService.update.mockRejectedValue(
        new Error('A quilometragem informada (500 km) não pode ser menor'),
      );

      await expect(
        controller.update(autenticadoComo(7), 3, { quilometragem: 500 } as any),
      ).rejects.toThrow(/quilometragem informada/);
    });
  });

  describe('exclusao', () => {
    it('deve excluir com o identificador do usuario autenticado', async () => {
      abastecimentoService.remove.mockResolvedValue({ message: 'ok' });

      await controller.remove(autenticadoComo(7), 3);

      expect(abastecimentoService.remove).toHaveBeenCalledWith(7, 3);
    });

    it('deve devolver a mensagem de sucesso', async () => {
      abastecimentoService.remove.mockResolvedValue({
        message: 'Abastecimento excluído com sucesso.',
      });

      await expect(controller.remove(autenticadoComo(7), 3)).resolves.toEqual({
        message: 'Abastecimento excluído com sucesso.',
      });
    });

    it('deve propagar recusa de exclusao de registro alheio', async () => {
      abastecimentoService.remove.mockRejectedValue(
        new Error('Você não tem permissão para acessar este abastecimento.'),
      );

      await expect(controller.remove(autenticadoComo(7), 3)).rejects.toThrow(
        /permissão para acessar/,
      );
    });
  });
});
