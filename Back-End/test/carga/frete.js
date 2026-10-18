import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SENHA = __ENV.SENHA || 'senha123';

const MARCAS_DO_DUBLE = [0.77, 0.54];

const linhasDoHistorico = new Trend('linhas_historico');

export const options = {
  scenarios: {
    escrita: {
      executor: 'ramping-vus',
      exec: 'escrever',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 30 },
        { duration: '15s', target: 0 },
      ],
    },
    leitura: {
      executor: 'constant-vus',
      exec: 'ler',
      vus: 3,
      duration: '60s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{rota:simular}': ['p(95)<800'],
    'http_req_duration{rota:historico}': ['p(95)<200'],
    linhas_historico: ['max==25', 'min==25'],
  },
};

function autenticar(telefone) {
  const resposta = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ telefone, senha: SENHA }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (resposta.status !== 201) {
    throw new Error(
      `nao autenticou ${telefone} (HTTP ${resposta.status}). ` +
        `Semeie o banco antes: npx ts-node test/carga/semear.ts 8000`,
    );
  }

  return resposta.json('access_token');
}

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

function aferir(token) {
  const resposta = http.post(`${BASE_URL}/frete/simular`, corpoDaSimulacao(1), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (resposta.status !== 201 && resposta.status !== 200) {
    throw new Error(
      `afericao falhou (HTTP ${resposta.status}): ${resposta.body}. ` +
        `Confira o caminhao do usuario: npx ts-node test/carga/semear-frete.ts`,
    );
  }

  if (!temMarcaDoDuble(resposta)) {
    exec.test.abort(
      `ORS NAO ESTA DUBLADO — distanciaKm=${resposta.json('distanciaKm')} nao termina ` +
        `em ,77 nem em ,54. A rodada foi abortada antes da rampa para nao queimar a cota ` +
        `diaria. Suba a aplicacao com: node -r ./test/carga/duble-ors.cjs dist/src/main`,
    );
  }

  console.log(
    `afericao: ORS dublado confirmado (distanciaKm=${resposta.json('distanciaKm')})`,
  );
}

export function setup() {
  const escritor = autenticar('62000000000');
  aferir(escritor);

  const leitor = autenticar('62000000001');
  const inicial = http.get(`${BASE_URL}/frete/historico`, {
    headers: { Authorization: `Bearer ${leitor}` },
  });

  const linhas = inicial.json();
  console.log(`leitor comeca com ${linhas.length} simulacoes no historico`);

  return { escritor, leitor };
}

export function escrever(dados) {
  const resposta = http.post(
    `${BASE_URL}/frete/simular`,
    corpoDaSimulacao(exec.scenario.iterationInTest),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dados.escritor}`,
      },
      tags: { rota: 'simular' },
    },
  );

  check(resposta, {
    'simular responde 201': (r) => r.status === 201,
    'ORS segue dublado': temMarcaDoDuble,
  });
}

export function ler(dados) {
  const resposta = http.get(`${BASE_URL}/frete/historico`, {
    headers: { Authorization: `Bearer ${dados.leitor}` },
    tags: { rota: 'historico' },
  });

  check(resposta, { 'historico responde 200': (r) => r.status === 200 });

  const linhas = resposta.json();
  if (Array.isArray(linhas)) linhasDoHistorico.add(linhas.length);
}
