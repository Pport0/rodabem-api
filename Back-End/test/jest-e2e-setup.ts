import * as http from 'http';
import * as https from 'https';

/**
 * Desliga o keep-alive do agente HTTP global durante os testes e2e.
 *
 * A partir do Node 19 o `http.globalAgent` vem com `keepAlive: true`. O supertest sobe um servidor efemero a cada
 * `request(app.getHttpServer())` e o derruba em seguida; com keep-alive ligado,
 * o agente reaproveita um socket apontando para um servidor que ja nao existe e le lixo no lugar da resposta.
 */


// `keepAlive` nao aparece na interface publica de Agent, e `globalAgent` e somente-leitura no tipo — por isso a asercao.
// Em tempo de execucao a propriedade existe e e consultada a cada requisicao.
type AgenteComKeepAlive = http.Agent & { keepAlive: boolean };

(http.globalAgent as AgenteComKeepAlive).keepAlive = false;
(https.globalAgent as unknown as AgenteComKeepAlive).keepAlive = false;
