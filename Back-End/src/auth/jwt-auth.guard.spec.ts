import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let canActivatePai: jest.SpyInstance;

  const contextoFalso = { switchToHttp: () => ({ getRequest: () => ({}) }) } as ExecutionContext;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    canActivatePai = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    );
  });

  afterEach(() => {
    canActivatePai.mockRestore();
  });

  it('deve repassar o contexto de execucao ao guard do Passport', () => {
    canActivatePai.mockReturnValue(true);

    guard.canActivate(contextoFalso);

    expect(canActivatePai).toHaveBeenCalledWith(contextoFalso);
  });

  it('deve liberar o acesso quando o Passport autoriza', () => {
    canActivatePai.mockReturnValue(true);

    expect(guard.canActivate(contextoFalso)).toBe(true);
  });

  it('deve negar o acesso quando o Passport recusa', () => {
    canActivatePai.mockReturnValue(false);

    expect(guard.canActivate(contextoFalso)).toBe(false);
  });

  it('deve preservar o resultado assincrono do Passport', async () => {
    canActivatePai.mockResolvedValue(true);

    await expect(guard.canActivate(contextoFalso)).resolves.toBe(true);
  });

  it('nao deve capturar o erro lancado pelo Passport', () => {
    canActivatePai.mockImplementation(() => {
      throw new Error('Unauthorized');
    });

    expect(() => guard.canActivate(contextoFalso)).toThrow('Unauthorized');
  });
});
