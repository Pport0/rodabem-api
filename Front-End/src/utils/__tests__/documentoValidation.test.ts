import { validateDocumento } from '../documentoValidation';

const valido = {
  nome: 'CRLV 2026',
  numero: 'ABC-123',
  dataEmissao: new Date('2026-01-01T12:00:00'),
  dataVencimento: new Date('2027-01-01T12:00:00'),
};

describe('validateDocumento - regra unica de cadastro e edicao (#50)', () => {
  it('nao deve acusar nada quando os campos estao corretos', () => {
    expect(validateDocumento(valido)).toEqual({});
  });

  it('deve acusar os quatro campos obrigatorios quando estao vazios', () => {
    expect(
      validateDocumento({ nome: '  ', numero: '', dataEmissao: null, dataVencimento: null }),
    ).toEqual({
      nome: 'Nome do documento e obrigatorio',
      numero: 'Numero e obrigatorio',
      dataEmissao: 'Data de emissao obrigatoria',
      dataVencimento: 'Data de vencimento obrigatoria',
    });
  });

  it('deve recusar vencimento anterior a emissao', () => {
    expect(
      validateDocumento({ ...valido, dataVencimento: new Date('2025-12-31T12:00:00') })
        .dataVencimento,
    ).toBe('A data de vencimento nao pode ser anterior a emissao');
  });

  it('deve aceitar vencimento no mesmo dia da emissao', () => {
    expect(validateDocumento({ ...valido, dataVencimento: valido.dataEmissao })).toEqual({});
  });
});
