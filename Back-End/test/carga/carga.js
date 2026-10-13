/**
 * Carga: comportamento das leituras autenticadas sob volume crescente.
 *
 */
import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SENHA = __ENV.SENHA || 'senha123';

const tamanhoListaUsuarios = new Trend('bytes_lista_usuarios');

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '30s', target: 30 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{rota:perfil}': ['p(95)<300'],
    'http_req_duration{rota:abastecimentos}': ['p(95)<500'],
    'http_req_duration{rota:documentos}': ['p(95)<500'],
    // GET /users declara paginacao. Se ela funcionar, o tempo nao depende do tamanho da tabela e a resposta nao cresce.
    'http_req_duration{rota:usuarios}': ['p(95)<500'],
    bytes_lista_usuarios: ['p(95)<100000'],
  },
};

export function setup() {
  const resposta = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ telefone: '62000000000', senha: SENHA }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (resposta.status !== 201) {
    throw new Error(
      `nao autenticou para a carga (HTTP ${resposta.status}). ` +
        `Semeie o banco antes: npx ts-node test/carga/semear.ts 8000`,
    );
  }

  return { token: resposta.json('access_token') };
}

export default function (dados) {
  const cabecalhos = {
    headers: { Authorization: `Bearer ${dados.token}` },
  };

  group('leituras do proprio usuario', () => {
    const perfil = http.get(`${BASE_URL}/users/me`, {
      ...cabecalhos,
      tags: { rota: 'perfil' },
    });
    check(perfil, { 'perfil responde 200': (r) => r.status === 200 });

    const abastecimentos = http.get(`${BASE_URL}/abastecimentos`, {
      ...cabecalhos,
      tags: { rota: 'abastecimentos' },
    });
    check(abastecimentos, {
      'abastecimentos responde 200': (r) => r.status === 200,
    });

    const documentos = http.get(`${BASE_URL}/documentos`, {
      ...cabecalhos,
      tags: { rota: 'documentos' },
    });
    check(documentos, { 'documentos responde 200': (r) => r.status === 200 });
  });

  group('listagem paginada', () => {
    const usuarios = http.get(`${BASE_URL}/users?page=1&limit=10`, {
      ...cabecalhos,
      tags: { rota: 'usuarios' },
    });

    tamanhoListaUsuarios.add(usuarios.body.length);

    check(usuarios, {
      'usuarios responde 200': (r) => r.status === 200,
      'a rota de listagem devolve uma colecao': (r) => {
        const corpo = r.json();
        return Array.isArray(corpo) || Array.isArray(corpo.data);
      },
      'a pagina respeita o limite pedido': (r) => {
        const corpo = r.json();
        const itens = Array.isArray(corpo) ? corpo : corpo.data;
        return Array.isArray(itens) && itens.length <= 10;
      },
    });
  });
}

export function handleSummary(dados) {
  const v = (nome) => dados.metrics[nome]?.values ?? {};
  const bytes = v('bytes_lista_usuarios');
  const checks = v('checks');
  const falhas = v('http_req_failed');

  const ms = (rota) =>
    (v(`http_req_duration{rota:${rota}}`)['p(95)'] ?? 0).toFixed(0);

  const linhas = [
    '',
    '  p95 por rota',
    `    GET /users/me          ${ms('perfil')} ms`,
    `    GET /abastecimentos    ${ms('abastecimentos')} ms`,
    `    GET /documentos        ${ms('documentos')} ms`,
    `    GET /users             ${ms('usuarios')} ms`,
    '',
    `  requisicoes com erro     ${((falhas.rate ?? 0) * 100).toFixed(2)} %`,
    `  verificacoes aprovadas   ${((checks.rate ?? 0) * 100).toFixed(2)} %`,
    `    (${checks.fails ?? 0} reprovadas de ${
      (checks.passes ?? 0) + (checks.fails ?? 0)
    })`,
    '',
    `  GET /users — tamanho da resposta`,
    `    p95    ${((bytes['p(95)'] ?? 0) / 1024).toFixed(2)} KB`,
    '',
    '  Resposta grande demais significa limite ignorado e tabela inteira na',
    '  resposta. Resposta pequena demais, do tamanho de um unico registro,',
    '  significa que a rota nem lista — e aí a verificacao da colecao reprova.',
    '',
  ].join('\n');

  return { stdout: linhas };
}
