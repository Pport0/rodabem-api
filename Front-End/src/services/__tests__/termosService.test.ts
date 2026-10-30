import * as SecureStore from 'expo-secure-store';

import { api, liberarRedirecionamentoTermo } from '../api';
import {
  aceitarTermo,
  getAceiteLocal,
  getTermoVigente,
  guardarAceiteLocal,
} from '../termosService';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  liberarRedirecionamentoTermo: jest.fn(),
}));

const CHAVE = 'rodabem_termo_aceite';

const termo = {
  id: 1,
  versao: '1.0',
  conteudo: 'texto do termo',
  publicadoEm: '2026-10-20T00:00:00.000Z',
};

const guardado = (valor: unknown) =>
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
    typeof valor === 'string' ? valor : JSON.stringify(valor),
  );

describe('Servico de termos - termo vigente', () => {
  it('deve entregar o termo que a API publica como vigente', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: termo } as never);

    await expect(getTermoVigente()).resolves.toEqual(termo);
    expect(api.get).toHaveBeenCalledWith('/termos/vigente');
  });

  it('deve propagar a falha da consulta, para a tela poder avisar', async () => {
    jest.mocked(api.get).mockRejectedValue(new Error('Network Error'));

    await expect(getTermoVigente()).rejects.toThrow('Network Error');
  });
});

describe('Servico de termos - copia local do aceite', () => {
  it('deve guardar versao, data e usuario do aceite', async () => {
    await guardarAceiteLocal('1.0', 7, '2026-10-22T13:00:00.000Z');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      CHAVE,
      JSON.stringify({ versao: '1.0', aceitoEm: '2026-10-22T13:00:00.000Z', userId: 7 }),
    );
  });

  it('deve registrar o momento do aceite quando a data nao e informada', async () => {
    const antes = Date.now();

    await guardarAceiteLocal('1.0', 7);

    const [, gravado] = jest.mocked(SecureStore.setItemAsync).mock.calls[0];
    const aceitoEm = Date.parse(JSON.parse(gravado as string).aceitoEm);
    expect(aceitoEm).toBeGreaterThanOrEqual(antes);
    expect(aceitoEm).toBeLessThanOrEqual(Date.now());
  });

  it('deve devolver o aceite guardado para o usuario correspondente', async () => {
    const aceite = { versao: '1.0', aceitoEm: '2026-10-22T13:00:00.000Z', userId: 7 };
    guardado(aceite);

    await expect(getAceiteLocal(7)).resolves.toEqual(aceite);
  });

  it('deve devolver o aceite quando nenhum usuario e informado', async () => {
    const aceite = { versao: '1.0', aceitoEm: '2026-10-22T13:00:00.000Z', userId: 7 };
    guardado(aceite);

    await expect(getAceiteLocal()).resolves.toEqual(aceite);
  });

  it('nao deve entregar a outro usuario o aceite guardado no aparelho', async () => {
    guardado({ versao: '1.0', aceitoEm: '2026-10-22T13:00:00.000Z', userId: 7 });

    await expect(getAceiteLocal(8)).resolves.toBeNull();
  });

  it('nao deve inventar aceite quando nada foi guardado', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null as never);

    await expect(getAceiteLocal(7)).resolves.toBeNull();
  });

  it.each([
    ['sem versao', { aceitoEm: '2026-10-22T13:00:00.000Z', userId: 7 }],
    ['sem data', { versao: '1.0', userId: 7 }],
  ])('nao deve aceitar registro %s', async (_caso, registro) => {
    guardado(registro);

    await expect(getAceiteLocal(7)).resolves.toBeNull();
  });

  it('nao deve quebrar quando o que esta guardado nao e um registro valido', async () => {
    guardado('isto nao e json');

    await expect(getAceiteLocal(7)).resolves.toBeNull();
  });
});

describe('Servico de termos - registro do aceite', () => {
  it('deve enviar a versao aceita e guardar a copia local', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: {} } as never);

    await aceitarTermo('1.0', 7);

    expect(api.post).toHaveBeenCalledWith('/termos/aceite', { termoVersao: '1.0' });
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('deve liberar a navegacao depois de registrar o aceite', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: {} } as never);

    await aceitarTermo('1.0', 7);

    expect(liberarRedirecionamentoTermo).toHaveBeenCalled();
  });

  it('nao deve falhar o aceite ja confirmado pelo servidor quando a copia local nao grava', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: {} } as never);
    jest.mocked(SecureStore.setItemAsync).mockRejectedValue(new Error('sem espaco'));

    await expect(aceitarTermo('1.0', 7)).resolves.toBeUndefined();
    expect(liberarRedirecionamentoTermo).toHaveBeenCalled();
  });

  it('deve propagar a falha quando o servidor nao registra o aceite', async () => {
    jest.mocked(api.post).mockRejectedValue(new Error('Network Error'));

    await expect(aceitarTermo('1.0', 7)).rejects.toThrow('Network Error');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
