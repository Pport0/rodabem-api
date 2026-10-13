/**
 * Sonda algoritmica: o custo do login cresce com o tamanho da tabela?
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USUARIOS = Number(__ENV.USUARIOS || 2000);
const SENHA = __ENV.SENHA || 'senha123';

const duracaoCpf = new Trend('login_por_cpf', true);
const duracaoTelefone = new Trend('login_por_telefone', true);

export const options = {
  scenarios: {
    telefone: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
      exec: 'porTelefone',
    },
    cpf: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
      exec: 'porCpf',
      startTime: '22s',
    },
  },
  thresholds: {
    // A busca por telefone e o que o sistema consegue fazer bem. A busca por CPF nao deveria custar mais do que o dobro dela.
    login_por_telefone: ['p(95)<1000'],
    login_por_cpf: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

/** Mesmo algoritmo de `semear.ts`, para montar credencial sem consultar o banco. */
function cpfValidoDe(indice) {
  let base = `${indice}`.padStart(9, '0').slice(-9);

  if (/^(\d)\1{8}$/.test(base)) {
    base = base.slice(0, 8) + ((Number(base[8]) + 1) % 10);
  }

  const digito = (parcial, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < parcial.length; i++) {
      soma += Number(parcial[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };

  const primeiro = digito(base, 10);
  return `${base}${primeiro}${digito(`${base}${primeiro}`, 11)}`;
}

const telefoneDe = (i) => `62${String(i).padStart(9, '0')}`;

/**
 * Sorteia na metade final da tabela. A busca por CPF para no primeiro acerto, entao usar sempre o primeiro usuario esconderia o problema.
 */
function indiceSorteado() {
  const metade = Math.floor(USUARIOS / 2);
  return metade + Math.floor(Math.random() * (USUARIOS - metade - 1));
}

function entrar(credencial, metrica, nome) {
  const resposta = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ ...credencial, senha: SENHA }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { busca: nome },
    },
  );

  metrica.add(resposta.timings.duration);

  check(resposta, {
    [`login por ${nome} autentica`]: (r) =>
      r.status === 201 && !!r.json('access_token'),
  });
}

export function porTelefone() {
  entrar({ telefone: telefoneDe(indiceSorteado()) }, duracaoTelefone, 'telefone');
}

export function porCpf() {
  entrar({ cpf: cpfValidoDe(indiceSorteado()) }, duracaoCpf, 'cpf');
}

export function handleSummary(dados) {
  const metrica = (nome) => dados.metrics[nome]?.values ?? {};
  const telefone = metrica('login_por_telefone');
  const cpf = metrica('login_por_cpf');
  const razao =
    telefone['p(95)'] > 0 ? (cpf['p(95)'] / telefone['p(95)']).toFixed(1) : '?';

  const linhas = [
    '',
    `  usuarios na tabela         ${USUARIOS}`,
    `  login por telefone  p95    ${(telefone['p(95)'] ?? 0).toFixed(0)} ms`,
    `  login por cpf       p95    ${(cpf['p(95)'] ?? 0).toFixed(0)} ms`,
    `  razao cpf / telefone       ${razao}x`,
    '',
    '  Rode de novo com o dobro de usuarios semeados. Se a razao acompanhar',
    '  o volume, o custo e linear no tamanho da tabela — e isso e o defeito,',
    '  nao a lentidao em si.',
    '',
  ].join('\n');

  return { stdout: linhas };
}
