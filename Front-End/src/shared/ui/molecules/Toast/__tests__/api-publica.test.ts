import { Toast } from '../index';

// #48: Toast.update e Toast.dismiss nunca eram chamados e sairam da API publica.
// O fechamento individual continua existindo dentro do provedor (botao do proprio toast).
it('deve expor apenas show e dismissAll', () => {
  expect(Object.keys(Toast).sort()).toEqual(['dismissAll', 'show']);
});
