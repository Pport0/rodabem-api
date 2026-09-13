/**
 * Relatorio de execucao das suites de teste.
 *
 * Uso: npm run test:report
 */
const { spawnSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.resolve(__dirname, '..');

// utilidades de formatacao
const cor = {
  reset: '\x1b[0m', neg: '\x1b[1m', cinza: '\x1b[90m',
  verde: '\x1b[32m', vermelho: '\x1b[31m', amarelo: '\x1b[33m', ciano: '\x1b[36m',
};
const LARGURA = 66;
const linha = (c = '-') => c.repeat(LARGURA);
const semCor = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const pad = (rotulo, valor, preenche = '.') =>
  `${rotulo} ${preenche.repeat(Math.max(1, 24 - semCor(rotulo).length))} ${valor}`;

// pre-checagens de ambiente
function versaoNodeSuportada() {
  const maior = Number(process.versions.node.split('.')[0]);
  return { ok: maior >= 18, atual: process.versions.node };
}

function lerDestinoDoBanco() {
  try {
    const env = fs.readFileSync(path.join(RAIZ, '.env'), 'utf8');
    const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
    if (!m) return null;
    const url = m[1].trim();
    const u = new URL(url);
    return { host: u.hostname, porta: Number(u.port || 5432), url };
  } catch {
    return null;
  }
}

function bancoDisponivel({ host, porta, url }, timeout = 1500) {
  const portaAberta = spawnSync(process.execPath, [
    '-e',
    `const n=require('net');const s=n.connect(${porta},${JSON.stringify(host)});
     s.setTimeout(${timeout});
     s.on('connect',()=>{s.destroy();process.exit(0)});
     s.on('error',()=>process.exit(1));
     s.on('timeout',()=>{s.destroy();process.exit(1)});`,
  ]);
  if (portaAberta.status !== 0) return { ok: false, motivo: 'porta fechada' };

  const autentica = spawnSync(
    process.execPath,
    [
      '-e',
      `const {PrismaClient}=require('@prisma/client');
       const p=new PrismaClient();
       p.$connect().then(()=>p.$disconnect()).then(()=>process.exit(0)).catch(()=>process.exit(1));`,
    ],
    {
      cwd: RAIZ,
      timeout: 15000,
      env: { ...process.env, DATABASE_URL: url },
    },
  );
  if (autentica.status !== 0) {
    return { ok: false, motivo: 'porta ocupada por outro banco / credenciais invalidas' };
  }

  return { ok: true };
}

// execucao do jest
function rodarJest({ comE2e }) {
  const saidaJson = path.join(os.tmpdir(), `rodabem-jest-${Date.now()}.json`);
  const regex = comE2e ? '\\.(spec|e2e-spec)\\.ts$' : 'src/.*\\.spec\\.ts$';

  const args = [
    'jest',
    '--rootDir', '.',
    '--testRegex', regex,
    '--testEnvironment', 'node',
    '--transform', '{"^.+\\\\.(t|j)s$":"ts-jest"}',
    '--runInBand',
    '--forceExit',
    '--silent',
    '--testTimeout=30000',
    '--coverage',
    '--coverageReporters=json-summary',
    '--coverageReporters=text-summary',
    '--collectCoverageFrom=src/**/*.ts',
    '--coverageDirectory=coverage',
    '--json',
    `--outputFile=${saidaJson}`,
  ];

  const inicio = Date.now();
  const proc = spawnSync('npx', args, { cwd: RAIZ, encoding: 'utf8' });
  const duracao = (Date.now() - inicio) / 1000;

  let dados = null;
  try {
    dados = JSON.parse(fs.readFileSync(saidaJson, 'utf8'));
    fs.unlinkSync(saidaJson);
  } catch {}
  return { dados, duracao, stderr: proc.stderr || '' };
}

function lerCobertura() {
  try {
    const j = JSON.parse(
      fs.readFileSync(path.join(RAIZ, 'coverage', 'coverage-summary.json'), 'utf8'),
    );
    return j.total;
  } catch {
    return null;
  }
}

// montagem do relatorio
function main() {
  const agora = new Date();
  const carimbo = agora.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const node = versaoNodeSuportada();
  const destino = lerDestinoDoBanco();
  const diag = destino ? bancoDisponivel(destino) : { ok: false, motivo: 'DATABASE_URL ausente' };
  const bancoOk = diag.ok;

  console.log('\n' + linha('='));
  console.log(`${cor.neg} RELATORIO DE TESTES - RODABEM (Back-End)${cor.reset}`);
  console.log(` Executado em: ${carimbo}`);
  console.log(linha('='));

  console.log(`\n${cor.neg}AMBIENTE${cor.reset}`);
  console.log(
    pad(' Node', node.ok
      ? `${cor.verde}v${node.atual}${cor.reset}`
      : `${cor.vermelho}v${node.atual} (requer >= 18)${cor.reset}`),
  );
  const alvo = destino ? `${destino.host}:${destino.porta}` : 'nao configurado';
  console.log(
    pad(' Banco de dados', bancoOk
      ? `${cor.verde}disponivel${cor.reset} ${cor.cinza}(${alvo})${cor.reset}`
      : `${cor.amarelo}indisponivel${cor.reset} ${cor.cinza}(${alvo} - ${diag.motivo})${cor.reset}`),
  );

  if (!node.ok) {
    console.log(
      `\n${cor.vermelho} Node ${node.atual} nao suporta a sintaxe usada pelo Prisma/Jest.` +
      `\n Execute "nvm use 22" e rode novamente.${cor.reset}\n`,
    );
    process.exit(1);
  }

  if (!bancoOk) {
    console.log(
      `\n${cor.amarelo} Banco indisponivel: os testes de integracao (e2e) serao ignorados.` +
      `\n Para inclui-los: docker compose up -d${cor.reset}`,
    );
  }

  console.log(`\n${cor.cinza} Executando suites...${cor.reset}`);
  const { dados, duracao, stderr } = rodarJest({ comE2e: bancoOk });

  if (!dados) {
    console.log(`\n${cor.vermelho} Falha ao executar o Jest.${cor.reset}`);
    console.log(stderr.split('\n').slice(-15).join('\n'));
    process.exit(1);
  }

  // separa unitarios de e2e
  const unit = [], e2e = [];
  for (const s of dados.testResults) {
    (s.name.includes('e2e-spec') ? e2e : unit).push(s);
  }
  const contar = (grupo) =>
    grupo.reduce((a, s) => a + s.assertionResults.filter((t) => t.status === 'passed').length, 0);

  console.log(`\n${cor.neg}SUITES${cor.reset}`);
  const marca = (falhou) => (falhou ? `${cor.vermelho}FALHOU${cor.reset}` : `${cor.verde}OK${cor.reset}`);
  const falhasUnit = unit.filter((s) => s.status === 'failed').length;
  const falhasE2e = e2e.filter((s) => s.status === 'failed').length;
  console.log(pad(` [${marca(falhasUnit)}] Unitarios`, `${unit.length} suites, ${contar(unit)} testes`));
  if (e2e.length) {
    console.log(pad(` [${marca(falhasE2e)}] Integracao (e2e)`, `${e2e.length} suites, ${contar(e2e)} testes`));
  } else {
    console.log(pad(' [--] Integracao (e2e)', `${cor.amarelo}nao executados${cor.reset}`));
  }

  console.log(`\n${cor.neg}RESULTADO${cor.reset}`);
  console.log(pad(' Suites', `${dados.numTotalTestSuites} total, ${dados.numPassedTestSuites} aprovadas, ${dados.numFailedTestSuites} com falha`));
  const pendentes = (dados.numPendingTests || 0) + (dados.numTodoTests || 0);
  console.log(pad(' Testes', `${dados.numPassedTests} aprovados, ${dados.numFailedTests} falharam, ${pendentes} pendentes`));
  console.log(pad(' Duracao', `${duracao.toFixed(1)}s`));

  const cob = lerCobertura();
  if (cob) {
    console.log(`\n${cor.neg}COBERTURA${cor.reset} ${cor.cinza}(src/**/*.ts)${cor.reset}`);
    for (const [rotulo, chave] of [
      ['Statements', 'statements'], ['Branches', 'branches'],
      ['Functions', 'functions'], ['Lines', 'lines'],
    ]) {
      const m = cob[chave];
      console.log(pad(` ${rotulo}`, `${String(m.pct).padStart(6)}%  ${cor.cinza}(${m.covered}/${m.total})${cor.reset}`));
    }
    console.log(`\n${cor.cinza} Relatorio navegavel: coverage/index.html${cor.reset}`);
  }

  const ok = dados.numFailedTests === 0 && dados.numFailedTestSuites === 0;
  console.log('\n' + linha('='));
  console.log(ok
    ? `${cor.verde}${cor.neg} TODAS AS SUITES PASSARAM${cor.reset}`
    : `${cor.vermelho}${cor.neg} EXISTEM FALHAS - verifique acima${cor.reset}`);
  console.log(linha('=') + '\n');

  process.exit(ok ? 0 : 1);
}

main();
