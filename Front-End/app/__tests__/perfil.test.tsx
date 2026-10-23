import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import { Alert } from 'react-native';

import Perfil from '../perfil';
import { Toast } from '@/shared/ui/molecules/Toast';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { deleteUser, getMeuPerfil } from '@/services/userService';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/contexts/authContext';

jest.mock('@/services/caminhaoService', () => ({ getMeuCaminhao: jest.fn() }));
jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn(), deleteUser: jest.fn() }));
jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));
// a tela usa useAuth() para o logout; o provedor real arrastaria Toast, SecureStore e router.
jest.mock('@/contexts/authContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/shared/ui/molecules/Toast', () => ({ Toast: { show: jest.fn() } }));
jest.mock('@/utils/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

const perfilCompleto = {
  id: 1,
  nome: 'Gabriel Silva',
  email: 'gabriel@example.com',
  telefone: '62999999999',
  cpf: '529.982.247-25',
};

const caminhaoCompleto = {
  id: 10,
  placa: 'ABC1D23',
  modelo: 'FH 540',
  marca: 'VOLVO',
  anoFabricacao: 2020,
  cor: 'BRANCA',
};

const montarTela = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(<Perfil />, { wrapper });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useUser).mockReturnValue({ user: null } as any);
  jest.mocked(useAuth).mockReturnValue({ logout: jest.fn() } as any);
  jest.mocked(getMeuPerfil).mockResolvedValue(perfilCompleto as any);
  jest.mocked(getMeuCaminhao).mockResolvedValue(null);
});

describe('Tela de perfil - dados do usuario', () => {



  it('deve recorrer ao usuario armazenado enquanto a API nao responde', async () => {
    jest
      .mocked(useUser)
      .mockReturnValue({ user: { nome: 'Do Armazenamento' } } as any);
    jest.mocked(getMeuPerfil).mockReturnValue(new Promise(() => {}) as any);

    await montarTela();

    expect(screen.getAllByText('Do Armazenamento').length).toBeGreaterThan(0);
  });

  it('deve preferir os dados da API aos do armazenamento', async () => {
    jest
      .mocked(useUser)
      .mockReturnValue({ user: { nome: 'Do Armazenamento' } } as any);

    await montarTela();

    await waitFor(() =>
      expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0),
    );
    expect(screen.queryByText('Do Armazenamento')).toBeNull();
  });



  it('deve exibir travessao nos campos que o perfil nao traz', async () => {
    jest.mocked(getMeuPerfil).mockResolvedValue({ nome: 'Gabriel' } as any);

    await montarTela();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });
});

describe('Tela de perfil - caminhao vinculado', () => {


  it('deve omitir marca, ano e cor quando o caminhao nao os possui', async () => {
    jest
      .mocked(getMeuCaminhao)
      .mockResolvedValue({ id: 10, placa: 'ABC1D23', modelo: 'FH 540' } as any);

    await montarTela();

    await waitFor(() => expect(screen.getByText('FH 540')).toBeTruthy());
    expect(screen.queryByText('Marca')).toBeNull();
    expect(screen.queryByText('Ano')).toBeNull();
    expect(screen.queryByText('Cor')).toBeNull();
  });


});

describe('Tela de perfil - navegacao', () => {
  it('deve levar ao cadastro quando ainda nao ha caminhao', async () => {
    // Sem esse atalho o motorista recem-cadastrado ve "Nenhum caminhao cadastrado" e precisa
    // descobrir sozinho por onde cadastrar — e sem caminhao nada no aplicativo funciona.
    jest.mocked(getMeuCaminhao).mockResolvedValue(null);
    await montarTela();

    await waitFor(() => expect(screen.getByText('Cadastrar Caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Cadastrar Caminhão'));

    expect(router.push).toHaveBeenCalledWith('/caminhoes/novo');
  });

  it('deve levar a edicao do caminhao existente', async () => {
    jest.mocked(getMeuCaminhao).mockResolvedValue(caminhaoCompleto as any);
    await montarTela();

    await waitFor(() => expect(screen.getByText('Editar caminhão')).toBeTruthy());
    await fireEvent.press(screen.getByText('Editar caminhão'));

    expect(router.push).toHaveBeenCalledWith('/caminhoes/editar');
  });

  it('deve levar a edicao dos dados pessoais', async () => {
    await montarTela();

    await fireEvent.press(screen.getByText('Editar dados'));

    expect(router.push).toHaveBeenCalledWith('/editarPerfil');
  });
});

describe('Tela de perfil - alterar senha', () => {

  it('o botao de alterar senha deve levar a alguma tela', async () => {
    await montarTela();

    await fireEvent.press(screen.getByText('ALTERAR SENHA'));

    expect(
      jest.mocked(router.push).mock.calls.length +
        jest.mocked(router.navigate).mock.calls.length,
    ).toBeGreaterThan(0);
  });
});


describe('Tela de perfil - exclusao da conta', () => {
  /** Toca em excluir e devolve os botoes do alerta de confirmacao. */
  const pedirExclusao = async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await fireEvent.press(screen.getByText('EXCLUIR MINHA CONTA'));

    const botoes = alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    alerta.mockRestore();
    return botoes;
  };

  it('deve pedir confirmacao antes de excluir a conta', async () => {
    // Acao irreversivel: nao pode acontecer com um toque so.
    await montarTela();
    // Esperar o PERFIL, nao so o botao: a mutacao monta o id com `perfil?.id ?? user?.id`, e
    // com os dois vazios ela lanca antes de chegar ao servico.
    await waitFor(() => expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0));

    const botoes = await pedirExclusao();

    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Excluir']);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('nao deve excluir quando o usuario desiste', async () => {
    await montarTela();
    // Esperar o PERFIL, nao so o botao: a mutacao monta o id com `perfil?.id ?? user?.id`, e
    // com os dois vazios ela lanca antes de chegar ao servico.
    await waitFor(() => expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0));

    const [cancelar] = await pedirExclusao();
    cancelar.onPress?.();

    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deve encerrar a sessao depois de excluir a conta', async () => {
    // Sem o logout o aplicativo continuaria com um token de conta que nao existe mais, e a
    // proxima requisicao falharia com erro que nao explica nada.
    const sair = jest.fn();
    jest.mocked(useAuth).mockReturnValue({ logout: sair } as any);
    jest.mocked(deleteUser).mockResolvedValue({ message: 'ok' } as any);

    await montarTela();
    // Esperar o PERFIL, nao so o botao: a mutacao monta o id com `perfil?.id ?? user?.id`, e
    // com os dois vazios ela lanca antes de chegar ao servico.
    await waitFor(() => expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0));

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(deleteUser).toHaveBeenCalled());
    await waitFor(() => expect(sair).toHaveBeenCalled());
  });

  // O back bloqueia a exclusao quando ha caminhao, documento, abastecimento ou simulacao
  // vinculados. O motivo precisa chegar ao usuario, senao o botao parece inerte.
  //
  // As tres formas abaixo sao as que o back realmente produz: o `ValidationPipe` devolve LISTA
  // de mensagens, as excecoes do service devolvem TEXTO, e queda de rede nao devolve corpo
  // nenhum. Cada uma cai num ramo diferente de `getErrorMessage`, e todas falhariam calada se
  // a tela so soubesse ler uma delas.
  it.each([
    [
      'texto',
      { response: { data: { message: 'Remova o caminhao antes de excluir a conta.' } } },
      'Remova o caminhao antes de excluir a conta.',
    ],
    [
      'lista',
      { response: { data: { message: ['Remova o caminhao antes de excluir a conta.'] } } },
      'Remova o caminhao antes de excluir a conta.',
    ],
    ['nada', new Error('Network request failed'), 'Ocorreu um erro inesperado. Tente novamente.'],
  ])('deve explicar a recusa quando o back responde com %s', async (_, erro, naTela) => {
    jest.mocked(deleteUser).mockRejectedValue(erro as any);
    const sair = jest.fn();
    jest.mocked(useAuth).mockReturnValue({ logout: sair } as any);

    await montarTela();
    // Esperar o PERFIL, nao so o botao: a mutacao monta o id com `perfil?.id ?? user?.id`, e
    // com os dois vazios ela lanca antes de chegar ao servico.
    await waitFor(() => expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0));

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(deleteUser).toHaveBeenCalled());
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(naTela, expect.anything()),
    );
    expect(sair).not.toHaveBeenCalled();
  });

  it('deve excluir pelo usuario armazenado enquanto o perfil nao respondeu', async () => {
    // O botao fica visivel antes de a consulta do perfil terminar. Sem o recurso ao usuario
    // guardado no aparelho, tocar nele nesse intervalo nao faria nada.
    jest.mocked(getMeuPerfil).mockReturnValue(new Promise(() => {}) as any);
    jest.mocked(useUser).mockReturnValue({ user: { id: 9, nome: 'Do Armazenamento' } } as any);
    jest.mocked(deleteUser).mockResolvedValue({ message: 'ok' } as any);

    await montarTela();
    await waitFor(() =>
      expect(screen.getAllByText('Do Armazenamento').length).toBeGreaterThan(0),
    );

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(9));
  });

  it('deve avisar, e nao ficar inerte, quando nao se sabe de quem e a conta', async () => {
    // Nem perfil nem usuario guardado: acontece quando o token expirou e o aparelho foi
    // reiniciado. Chamar a rota com `undefined` excluiria o que o back resolvesse sozinho.
    jest.mocked(getMeuPerfil).mockReturnValue(new Promise(() => {}) as any);
    jest.mocked(useUser).mockReturnValue({ user: null } as any);

    await montarTela();
    await waitFor(() => expect(screen.getByText('EXCLUIR MINHA CONTA')).toBeTruthy());

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(Toast.show).toHaveBeenCalled());
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deve impedir o segundo toque enquanto a exclusao esta em andamento', async () => {
    // Acao irreversivel e demorada. Dois toques mandariam duas requisicoes, e a segunda voltaria
    // erro sobre uma conta que acabou de deixar de existir.
    // A promessa e liberada no fim de proposito: mutacao deixada pendente no teardown segura o
    // processo do Jest e a suite termina sem sair.
    let responder: (valor: unknown) => void = () => {};
    jest
      .mocked(deleteUser)
      .mockReturnValue(new Promise((resolve) => (responder = resolve)) as any);

    await montarTela();
    await waitFor(() => expect(screen.getAllByText('Gabriel Silva').length).toBeGreaterThan(0));

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(screen.queryByText('EXCLUIR MINHA CONTA')).toBeNull());

    responder({ message: 'ok' });
    await waitFor(() => expect(deleteUser).toHaveBeenCalledTimes(1));
  });
});
