import { api } from '../api';
import { signIn } from '../authService';

jest.mock('../api', () => ({ api: { post: jest.fn() } }));

describe('authService.signIn', () => {
  const resposta = {
    data: {
      access_token: 'jwt-token',
      user: { id: 1, nome: 'Gabriel', email: 'gabriel@example.com' },
    },
  };

  it('deve chamar o endpoint de login da API', async () => {
    jest.mocked(api.post).mockResolvedValue(resposta as any);

    await signIn({ telefone: '62999999999', senha: '123456' });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      telefone: '62999999999',
      senha: '123456',
    });
  });

  it('deve devolver apenas o corpo da resposta, sem os metadados do axios', async () => {
    jest.mocked(api.post).mockResolvedValue(resposta as any);

    const resultado = await signIn({ telefone: '62999999999', senha: '123456' });

    expect(resultado).toEqual(resposta.data);
    expect(resultado).not.toHaveProperty('status');
    expect(resultado).not.toHaveProperty('headers');
  });

  it('deve repassar o payload de login por cpf sem alteracao', async () => {
    jest.mocked(api.post).mockResolvedValue(resposta as any);

    await signIn({ cpf: '52998224725', senha: '123456' });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      cpf: '52998224725',
      senha: '123456',
    });
  });

  it('deve propagar o erro da API sem tratamento', async () => {
    const falha = Object.assign(new Error('Request failed with status code 401'), {
      response: { status: 401 },
    });
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(
      signIn({ telefone: '62999999999', senha: 'errada' }),
    ).rejects.toBe(falha);
  });
});
