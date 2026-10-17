import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SENHA = __ENV.SENHA || 'senha123';
const PICO = Number(__ENV.PICO || 200);

const MARCAS_DO_DUBLE = [0.77, 0.54];

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
      startTime: '100s',
      exec: 'medirRecuperacao',
    },
  },
  thresholds: {
    'http_req_duration{fase:rampa}': ['p(95)<60000'],
    'http_req_duration{rota:simular}': ['p(95)<60000'],

    erros_recuperacao: ['rate<0.01'],
    tempo_recuperacao: ['p(95)<500'],
  },
};

function corpoDaSimulacao(semente) {
  return JSON.stringify({
    origem: `Goiania ${semente % 500}`,
    destino: `Brasilia ${semente % 500}`,
    tipoCarga: 'GERAL',
    precoCombustivel: 6.2,
    retornoVazio: semente % 3 === 0,
    consumoMedioKmLOverride: 3.5,
  });
}

function temMarcaDoDuble(resposta) {
  const distancia = resposta.json('distanciaKm') ?? 0;
  return MARCAS_DO_DUBLE.includes(Number((distancia % 1).toFixed(2)));
}

export function setup() {
  const login = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ telefone: '62000000000', senha: SENHA }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (login.status !== 201) {
    throw new Error(
      `nao autenticou para o estresse (HTTP ${login.status}). ` +
        `Semeie o banco antes: npx ts-node test/carga/semear.ts 8000`,
    );
  }

  const token = login.json('access_token');

  const afericao = http.post(`${BASE_URL}/frete/simular`, corpoDaSimulacao(1), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (afericao.status !== 201 && afericao.status !== 200) {
    throw new Error(
      `afericao falhou (HTTP ${afericao.status}): ${afericao.body}. ` +
        `Confira o caminhao do usuario: npx ts-node test/carga/semear-frete.ts`,
    );
  }

  if (!temMarcaDoDuble(afericao)) {
    exec.test.abort(
      `ORS NAO ESTA DUBLADO — distanciaKm=${afericao.json('distanciaKm')} nao termina em ` +
        `,77 nem em ,54. A rodada foi abortada antes da rampa para nao queimar a cota ` +
        `diaria. Suba a aplicacao com: node -r ./test/carga/duble-ors.cjs dist/src/main`,
    );
  }

  console.log(
    `afericao: ORS dublado confirmado (distanciaKm=${afericao.json('distanciaKm')})`,
  );

  const leitor = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ telefone: '62000000001', senha: SENHA }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (leitor.status !== 201) {
    throw new Error(
      `nao autenticou o leitor da recuperacao (HTTP ${leitor.status}). ` +
        `Semeie o banco antes: npx ts-node test/carga/semear.ts 8000`,
    );
  }

  return { token, leitor: leitor.json('access_token') };
}

export function pressionar(dados) {
  const resposta = http.post(
    `${BASE_URL}/frete/simular`,
    corpoDaSimulacao(exec.scenario.iterationInTest),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dados.token}`,
      },
      tags: { fase: 'rampa', rota: 'simular' },
    },
  );

  errosRampa.add(resposta.status !== 201);
}

export function medirRecuperacao(dados) {
  const resposta = http.get(`${BASE_URL}/frete/historico`, {
    headers: { Authorization: `Bearer ${dados.leitor}` },
    tags: { fase: 'recuperacao', rota: 'historico' },
  });

  errosRecuperacao.add(resposta.status !== 200);
  tempoRecuperacao.add(resposta.timings.duration);

  check(resposta, {
    'o frete volta a responder depois do pico': (r) => r.status === 200,
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
    '  sob pressao (gravando simulacao)',
    `    erros                        ${((rampa.rate ?? 0) * 100).toFixed(2)} %`,
    `    p95 geral                    ${(duracaoRampa['p(95)'] ?? 0).toFixed(0)} ms`,
    `    p95 do simular               ${(v('http_req_duration{rota:simular}')['p(95)'] ?? 0).toFixed(0)} ms`,
    '',
    '  depois que a pressao saiu (lendo historico de 25 linhas, outro usuario)',
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
