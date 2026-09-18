import { api } from '../api';
import { createUser, getMeuPerfil } from '../userService';

jest.mock('../api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));

describe('createUser', () => {
  const novoUsuario = {
    nome: 'Gabriel Silva',
    email: 'gabriel@example.com',
    cpf: '52998224725',
    telefone: '62999999999',
    senha: '123456',
  };

  beforeEach(() => jest.clearAllMocks());

  it('deve enviar o cadastro ao endpoint de usuarios', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as any);

    await createUser(novoUsuario);

    expect(api.post).toHaveBeenCalledWith('/users', novoUsuario);
  });

  it('deve devolver apenas o corpo da resposta', async () => {
    const criado = { id: 1, nome: 'Gabriel Silva', email: 'gabriel@example.com' };
    jest.mocked(api.post).mockResolvedValue({
      data: criado,
      status: 201,
      headers: {},
    } as any);

    const resultado = await createUser(novoUsuario);

    expect(resultado).toEqual(criado);
    expect(resultado).not.toHaveProperty('status');
    expect(resultado).not.toHaveProperty('headers');
  });

  it('deve repassar cadastro sem campos opcionais', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as any);

    await createUser({ nome: 'Gabriel', senha: '123456' });

    expect(api.post).toHaveBeenCalledWith('/users', {
      nome: 'Gabriel',
      senha: '123456',
    });
  });

  it('deve propagar recusa por cpf ja cadastrado', async () => {
    const falha = Object.assign(new Error('Conflict'), {
      response: { status: 409, data: { message: 'CPF já cadastrado' } },
    });
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(createUser(novoUsuario)).rejects.toBe(falha);
  });

  it('deve propagar recusa por cpf invalido', async () => {
    const falha = Object.assign(new Error('Bad Request'), {
      response: { status: 400, data: { message: 'CPF inválido.' } },
    });
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(createUser(novoUsuario)).rejects.toBe(falha);
  });
});

describe('getMeuPerfil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve consultar o endpoint do proprio perfil', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: { id: 1 } } as any);

    await getMeuPerfil();

    expect(api.get).toHaveBeenCalledWith('/users/me');
  });

  it('deve devolver o perfil recebido', async () => {
    const perfil = {
      id: 1,
      nome: 'Gabriel',
      email: 'gabriel@example.com',
      cpf: '52998224725',
      telefone: '62999999999',
    };
    jest.mocked(api.get).mockResolvedValue({ data: perfil } as any);

    await expect(getMeuPerfil()).resolves.toEqual(perfil);
  });

  it('deve propagar falha de autenticacao', async () => {
    const falha = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    jest.mocked(api.get).mockRejectedValue(falha);

    await expect(getMeuPerfil()).rejects.toBe(falha);
  });
});
