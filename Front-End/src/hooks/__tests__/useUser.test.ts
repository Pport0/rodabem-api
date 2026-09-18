import * as SecureStore from 'expo-secure-store';
import { useUser } from '../useUser';

const chaveUsuario = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';

const armazenar = (valor: string | null) =>
  jest.mocked(SecureStore.getItem).mockReturnValue(valor as any);

describe('useUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deve ler o usuario da chave configurada', () => {
    armazenar(null);

    useUser();

    expect(SecureStore.getItem).toHaveBeenCalledWith(chaveUsuario);
  });

  it('deve devolver o usuario desserializado', () => {
    const usuario = { id: 1, nome: 'Gabriel', email: 'gabriel@example.com' };
    armazenar(JSON.stringify(usuario));

    expect(useUser().user).toEqual(usuario);
  });

  it('deve devolver nulo quando nao ha usuario armazenado', () => {
    armazenar(null);

    expect(useUser().user).toBeNull();
  });

  it('deve devolver nulo quando o valor armazenado e vazio', () => {
    armazenar('');

    expect(useUser().user).toBeNull();
  });

  it('propaga o erro quando o valor armazenado nao e um JSON valido', () => {
    armazenar('nao-e-json');

    expect(() => useUser()).toThrow();
  });

  it('deve preservar os campos do usuario armazenado', () => {
    const usuario = {
      id: 7,
      nome: 'Gabriel Silva',
      email: 'gabriel@example.com',
      telefone: '62999999999',
      cpf: '52998224725',
    };
    armazenar(JSON.stringify(usuario));

    const { user } = useUser();

    expect(user?.nome).toBe('Gabriel Silva');
    expect(user?.telefone).toBe('62999999999');
  });
});
