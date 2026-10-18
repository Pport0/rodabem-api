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


  describe('cadastro', () => {

    it('nao deve aceitar identificador de usuario vindo do corpo', async () => {
      abastecimentoService.create.mockResolvedValue({ id: 1 });

      await controller.create(autenticadoComo(7), { userId: 999 } as any);

      expect(abastecimentoService.create).toHaveBeenCalledWith(7, expect.anything());
    });

  });






});
