/**
 * Estresse: levar a aplicacao alem do limite e verificar se ela volta.
 */
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SENHA = __ENV.SENHA || 'senha123';
const PICO = Number(__ENV.PICO || 200);

const errosRampa = new Rate('erros_rampa');
const errosRecuperacao = new Rate('erros_recuperacao');
const tempoRecuperacao = new Trend('tempo_recuperacao', true);

export const options = {
  scenarios: {
    rampa: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '20s', target: Math.round(PICO * 0.25) },
        { duration: '20s', target: Math.round(PICO * 0.5) },
        { duration: '20s', target: PICO },
        { duration: '20s', target: PICO },
        { duration: '10s', target: 0 },
      ],
      exec: 'pressionar',
    },
    recuperacao: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s',
      // Comeca depois que a rampa zerou, com uma folga para a fila drenar.
      startTime: '100s',
      exec: 'medirRecuperacao',
    },
  },
  thresholds: {
    // A rampa PODE quebrar — e esse o objetivo. O limite abaixo e folgado de proposito: existe so para o k6 materializar
    // a submetrica por etiqueta, que ele nao coleta sem um threshold declarado.
    'http_req_duration{fase:rampa}': ['p(95)<60000'],
    'http_req_duration{rota:login}': ['p(95)<60000'],

    // O que nao se aceita e ficar quebrado depois que a pressao sai.
    erros_recuperacao: ['rate<0.01'],
    tempo_recuperacao: ['p(95)<500'],
  },
};

const telefoneDe = (i) => `62${String(i).padStart(9, '0')}`;

export function setup() {
  const resposta = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ telefone: telefoneDe(0), senha: SENHA }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (resposta.status !== 201) {
    throw new Error(
      `nao autenticou para o estresse (HTTP ${resposta.status}). ` +
        `Semeie o banco antes: npx ts-node test/carga/semear.ts 8000`,
    );
  }

  return { token: resposta.json('access_token') };
}

export function pressionar(dados) {
  const indice = Math.floor(Math.random() * 7900);

  // Uma autenticacao a cada cinco iteracoes: e a operacao cara, mas se fosse toda iteracao o teste mediria so o bcrypt.
  if (indice % 5 === 0) {
    const login = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ telefone: telefoneDe(indice), senha: SENHA }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { fase: 'rampa', rota: 'login' },
      },
    );
    errosRampa.add(login.status !== 201);
    return;
  }

  const leitura = http.get(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${dados.token}` },
    tags: { fase: 'rampa', rota: 'perfil' },
  });
  errosRampa.add(leitura.status !== 200);
}

export function medirRecuperacao(dados) {
  const resposta = http.get(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${dados.token}` },
    tags: { fase: 'recuperacao', rota: 'perfil' },
  });

  errosRecuperacao.add(resposta.status !== 200);
  tempoRecuperacao.add(resposta.timings.duration);

  check(resposta, {
    'a aplicacao volta a responder depois do pico': (r) => r.status === 200,
  });
}

export function handleSummary(dados) {
  const v = (nome) => dados.metrics[nome]?.values ?? {};
  const rampa = v('erros_rampa');
  const recuperacao = v('erros_recuperacao');
  const tempo = v('tempo_recuperacao');
  const duracaoRampa = v('http_req_duration{fase:rampa}');

  const linhas = [
    '',
    `  pico de usuarios simultaneos   ${PICO}`,
    '',
    '  sob pressao',
    `    erros                        ${((rampa.rate ?? 0) * 100).toFixed(2)} %`,
    `    p95 geral                    ${(duracaoRampa['p(95)'] ?? 0).toFixed(0)} ms`,
    `    p95 do login                 ${(v("http_req_duration{rota:login}")['p(95)'] ?? 0).toFixed(0)} ms`,
    '',
    '  depois que a pressao saiu',
    `    erros                        ${((recuperacao.rate ?? 0) * 100).toFixed(2)} %`,
    `    p95                          ${(tempo['p(95)'] ?? 0).toFixed(0)} ms`,
    '',
    '  O numero de usuarios simultaneos nao vale como capacidade: a API, o',
    '  banco e o gerador de carga dividem a mesma maquina. O que vale e a',
    '  recuperacao — erro acima de 1% depois do pico indica recurso vazado.',
    '',
  ].join('\n');

  return { stdout: linhas };
}
