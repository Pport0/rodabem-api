import { validateEmail, validatePerfil } from '../userValidation';

describe('validateEmail', () => {
  it('deve aceitar email valido, ignorando espacos nas pontas', () => {
    expect(validateEmail('  gabriel@example.com ')).toBeUndefined();
  });

  it('deve exigir o email', () => {
    expect(validateEmail('   ')).toBe('Email é obrigatório');
  });

  it.each(['gabriel', 'gabriel@', 'gabriel@example', 'gab riel@example.com'])(
    'deve recusar "%s"',
    (email) => {
      expect(validateEmail(email)).toBe('Email inválido');
    },
  );
});

describe('validatePerfil', () => {
  const valido = { nome: 'Gabriel', email: 'gabriel@example.com', telefone: '(62) 99999-9999' };

  it('nao deve acusar nada em um perfil valido', () => {
    expect(validatePerfil(valido)).toEqual({});
  });

  it('deve aceitar telefone em branco, que e opcional', () => {
    expect(validatePerfil({ ...valido, telefone: '' })).toEqual({});
  });

  it('deve recusar telefone incompleto', () => {
    expect(validatePerfil({ ...valido, telefone: '(62) 9999' })).toEqual({ telefone: 'Telefone inválido' });
  });

  it('deve exigir o nome', () => {
    expect(validatePerfil({ ...valido, nome: '  ' })).toEqual({ nome: 'Nome completo é obrigatório' });
  });
});
