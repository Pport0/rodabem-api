import { router } from 'expo-router';

import { voltarAoInicio } from '../sessao';

jest.mock('@/utils/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

// Registra a ordem das chamadas de navegacao, que importa: esvaziar a pilha, trocar pela tela inicial e so entao abrir o login.
const ordemDaNavegacao = () => {
  const chamadas: string[] = [];
  jest.mocked(router.dismissAll).mockImplementation(() => chamadas.push('dismissAll'));
  jest.mocked(router.replace).mockImplementation((href) => chamadas.push(`replace ${href}`));
  jest.mocked(router.push).mockImplementation((href) => chamadas.push(`push ${href}`));
  return chamadas;
};

describe('voltarAoInicio - pilha de navegacao ao encerrar a sessao', () => {
  it('deve esvaziar a pilha, deixar a tela inicial na base e abrir o login com o motivo por cima', () => {
    jest.mocked(router.canDismiss).mockReturnValue(true);
    const chamadas = ordemDaNavegacao();

    voltarAoInicio('sessao-expirada');

    expect(chamadas).toEqual(['dismissAll', 'replace /', 'push /login?motivo=sessao-expirada']);
  });

  it('nao deve tentar esvaziar a pilha quando ja nao ha tela para tras', () => {
    jest.mocked(router.canDismiss).mockReturnValue(false);
    const chamadas = ordemDaNavegacao();

    voltarAoInicio('senha-alterada');

    expect(chamadas).toEqual(['replace /', 'push /login?motivo=senha-alterada']);
  });

  it('sem motivo (logout), deve parar na tela inicial', () => {
    jest.mocked(router.canDismiss).mockReturnValue(true);
    const chamadas = ordemDaNavegacao();

    voltarAoInicio();

    expect(chamadas).toEqual(['dismissAll', 'replace /']);
  });
});
