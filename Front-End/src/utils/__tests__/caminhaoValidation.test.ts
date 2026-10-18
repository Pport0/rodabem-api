import { validateCaminhao } from '../caminhaoValidation';

const valido = {
  placa: 'ABC1D23',
  modelo: 'FH 540',
  renavam: '12345678901',
  numeroEixos: '6',
};

describe('validateCaminhao - regra unica de cadastro e edicao (#50)', () => {
  it('nao deve acusar nada quando os campos estao corretos', () => {
    expect(validateCaminhao(valido)).toEqual({});
  });

  it('deve acusar os quatro campos obrigatorios quando estao vazios', () => {
    expect(
      validateCaminhao({ placa: '', modelo: '', renavam: '', numeroEixos: '' }),
    ).toEqual({
      placa: 'Placa invalida (ex: ABC1234 ou ABC1D23)',
      modelo: 'Modelo e obrigatorio',
      renavam: 'RENAVAM invalido',
      numeroEixos: 'Numero de eixos e obrigatorio',
    });
  });

  it('deve recusar placa com menos de 7 caracteres', () => {
    expect(validateCaminhao({ ...valido, placa: 'ABC123' }).placa).toBeDefined();
  });

  it('deve recusar RENAVAM com menos de 9 digitos', () => {
    expect(validateCaminhao({ ...valido, renavam: '12345678' }).renavam).toBe('RENAVAM invalido');
  });

  it.each(['1', '2.5', 'abc'])('deve recusar numero de eixos "%s"', (numeroEixos) => {
    expect(validateCaminhao({ ...valido, numeroEixos }).numeroEixos).toBe(
      'Informe um numero de eixos valido',
    );
  });
});
