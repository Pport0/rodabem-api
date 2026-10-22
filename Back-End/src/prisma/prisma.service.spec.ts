import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    jest.spyOn(service, '$connect').mockResolvedValue(undefined as never);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);
  });

  it('deve abrir a conexao quando o modulo sobe', async () => {
    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it('deve devolver a conexao ao pool quando o modulo e encerrado', async () => {
    await service.onModuleDestroy();

    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('deve propagar a falha ao encerrar, em vez de engolir', async () => {
    jest
      .spyOn(service, '$disconnect')
      .mockRejectedValue(new Error('conexao ja perdida') as never);

    await expect(service.onModuleDestroy()).rejects.toThrow('conexao ja perdida');
  });
});
