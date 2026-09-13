/**
 * Relatorio de execucao das suites de teste do Front-End.
 *
 * Uso: npm run test:report
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const ALVOS = ['app', 'src'];

const cor = {
  reset: '\x1b[0m', neg: '\x1b[1m', cinza: '\x1b[90m',
  verde: '\x1b[32m', vermelho: '\x1b[31m', amarelo: '\x1b[33m',
};
const LARGURA = 66;
const linha = (c = '-') => c.repeat(LARGURA);
const semCor = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const pad = (rotulo, valor, preenche = '.') =>
  `${rotulo} ${preenche.repeat(Math.max(1, 24 - semCor(rotulo).length))} ${valor}`;

// ---------- deteccao do ferramental ----------
function temJest() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return Boolean(deps.jest || deps['jest-expo']);
  } catch {
    return false;
  }
}

function temDetox() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return Boolean(deps.detox);
  } catch {
    return false;
  }
}

function acharArquivosDeTeste() {
  const achados = [];
  const anda = (dir) => {
    let entradas;
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (/\.(test|spec)\.(t|j)sx?$/.test(e.name)) achados.push(path.relative(RAIZ, p));
    }
  };
  anda(RAIZ);
  return achados;
}

// ---------- medicao do codigo-fonte ----------
/** Resolve typescript e istanbul a partir do Back-End (mesmo repositorio). */
function carregarFerramentas() {
  const candidatos = [
    path.join(RAIZ, 'node_modules'),
    path.join(RAIZ, '..', 'Back-End', 'node_modules'),
  ];
  for (const base of candidatos) {
    try {
      const ts = require(path.join(base, 'typescript'));
      const { createInstrumenter } = require(path.join(base, 'istanbul-lib-instrument'));
      return { ts, createInstrumenter, exato: true };
    } catch { /* tenta o proximo */ }
  }
  return { exato: false };
}

function listarFontes() {
  const arquivos = [];
  const anda = (dir) => {
    let entradas;
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (/\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name)) arquivos.push(p);
    }
  };
  for (const alvo of ALVOS) anda(path.join(RAIZ, alvo));
  return arquivos;
}

function medirCodigo() {
  const { ts, createInstrumenter, exato } = carregarFerramentas();
  const arquivos = listarFontes();
  const modulos = {};
  let total = { s: 0, b: 0, f: 0, arq: 0 };

  if (!exato) {
    return { indisponivel: true, arquivos: arquivos.length };
  }

  const inst = createInstrumenter({ esModules: true, coverageVariable: '__c' });
  for (const f of arquivos) {
    const rel = path.relative(RAIZ, f);
    let cov;
    try {
      const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), {
        compilerOptions: {
          jsx: ts.JsxEmit.React,
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ESNext,
        },
        fileName: f,
      }).outputText;
      inst.instrumentSync(js, f);
      cov = inst.lastFileCoverage();
    } catch {
      continue;
    }
    const partes = rel.split(path.sep);
    const mod = partes[0] === 'app' ? 'app' : partes.slice(0, 2).join('/');
    modulos[mod] = modulos[mod] || { s: 0, b: 0, f: 0, arq: 0 };
    const o = modulos[mod];
    const s = Object.keys(cov.statementMap).length;
    const b = Object.values(cov.branchMap).reduce((a, x) => a + x.locations.length, 0);
    const fn = Object.keys(cov.fnMap).length;
    o.s += s; o.b += b; o.f += fn; o.arq++;
    total.s += s; total.b += b; total.f += fn; total.arq++;
  }
  return { modulos, total };
}

// ---------- execucao via jest, quando existir ----------
function rodarJest() {
  const os = require('os');
  const saidaJson = path.join(os.tmpdir(), `rodabem-front-${Date.now()}.json`);

  const inicio = Date.now();
  spawnSync(
    'npx',
    [
      'jest',
      '--ci',
      '--silent',
      '--passWithNoTests',
      '--forceExit',
      '--coverage',
      '--coverageReporters=json-summary',
      '--json',
      `--outputFile=${saidaJson}`,
    ],
    { cwd: RAIZ, encoding: 'utf8' },
  );
  const duracao = (Date.now() - inicio) / 1000;

  let dados = null;
  try {
    dados = JSON.parse(fs.readFileSync(saidaJson, 'utf8'));
    fs.unlinkSync(saidaJson);
  } catch {
    /* tratado adiante */
  }

  let cobertura = null;
  try {
    cobertura = JSON.parse(
      fs.readFileSync(path.join(RAIZ, 'coverage', 'coverage-summary.json'), 'utf8'),
    ).total;
  } catch {
    /* sem cobertura */
  }

  if (!dados) {
    console.log(`\n${cor.vermelho} Falha ao executar o Jest.${cor.reset}\n`);
    process.exit(1);
  }

  console.log(`\n${cor.neg}SUITES${cor.reset}`);
  const falhas = dados.numFailedTestSuites;
  const marca = falhas ? `${cor.vermelho}FALHOU${cor.reset}` : `${cor.verde}OK${cor.reset}`;
  console.log(
    pad(` [${marca}] Unitarios`, `${dados.numTotalTestSuites} suites, ${dados.numPassedTests} testes`),
  );
  console.log(pad(' [--] E2E (Detox)', `${cor.amarelo}nao configurado${cor.reset}`));

  console.log(`\n${cor.neg}RESULTADO${cor.reset}`);
  console.log(
    pad(' Suites', `${dados.numTotalTestSuites} total, ${dados.numPassedTestSuites} aprovadas, ${falhas} com falha`),
  );
  console.log(
    pad(' Testes', `${dados.numPassedTests} aprovados, ${dados.numFailedTests} falharam, ${dados.numPendingTests || 0} pendentes`),
  );
  console.log(pad(' Duracao', `${duracao.toFixed(1)}s`));

  if (cobertura) {
    console.log(`\n${cor.neg}COBERTURA${cor.reset} ${cor.cinza}(src/**, app/**)${cor.reset}`);
    for (const [rotulo, chave] of [
      ['Statements', 'statements'], ['Branches', 'branches'],
      ['Functions', 'functions'], ['Lines', 'lines'],
    ]) {
      const m = cobertura[chave];
      console.log(pad(` ${rotulo}`, `${String(m.pct).padStart(6)}%  ${cor.cinza}(${m.covered}/${m.total})${cor.reset}`));
    }
  }

  const ok = dados.numFailedTests === 0 && falhas === 0;
  console.log('\n' + linha('='));
  console.log(ok
    ? `${cor.verde}${cor.neg} TODAS AS SUITES PASSARAM${cor.reset}`
    : `${cor.vermelho}${cor.neg} EXISTEM FALHAS - verifique acima${cor.reset}`);
  console.log(linha('=') + '\n');

  process.exit(ok ? 0 : 1);
}

// ---------- relatorio ----------
function main() {
  const carimbo = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  console.log('\n' + linha('='));
  console.log(`${cor.neg} RELATORIO DE TESTES - RODABEM (Front-End)${cor.reset}`);
  console.log(` Executado em: ${carimbo}`);
  console.log(linha('='));

  const jest = temJest();
  const detox = temDetox();
  const suites = acharArquivosDeTeste();

  console.log(`\n${cor.neg}AMBIENTE${cor.reset}`);
  console.log(pad(' Node', `${cor.verde}v${process.versions.node}${cor.reset}`));
  console.log(pad(' Jest', jest
    ? `${cor.verde}configurado${cor.reset}`
    : `${cor.vermelho}nao configurado${cor.reset}`));
  console.log(pad(' Detox (E2E)', detox
    ? `${cor.verde}configurado${cor.reset}`
    : `${cor.vermelho}nao configurado${cor.reset}`));

  // Caminho futuro: havendo Jest e suites, delega a execucao real.
  if (jest && suites.length > 0) {
    console.log(`\n${cor.cinza} Jest detectado - executando a suite...${cor.reset}\n`);
    rodarJest();
    return;
  }

  console.log(`\n${cor.neg}SUITES${cor.reset}`);
  console.log(pad(' [--] Unitarios', `${cor.amarelo}nenhuma suite encontrada${cor.reset}`));
  console.log(pad(' [--] E2E (Detox)', `${cor.amarelo}nao configurado${cor.reset}`));

  console.log(`\n${cor.neg}RESULTADO${cor.reset}`);
  console.log(pad(' Suites', '0 total, 0 aprovadas, 0 com falha'));
  console.log(pad(' Testes', '0 aprovados, 0 falharam, 0 pendentes'));

  const m = medirCodigo();
  console.log(`\n${cor.neg}COBERTURA${cor.reset} ${cor.cinza}(app/**, src/**)${cor.reset}`);

  if (m.indisponivel) {
    console.log(`${cor.amarelo} Nao foi possivel medir o tamanho do codigo-fonte.${cor.reset}`);
    console.log(`${cor.cinza} (typescript/istanbul-lib-instrument indisponiveis)${cor.reset}`);
    console.log(pad(' Arquivos de codigo', String(m.arquivos)));
  } else {
    const t = m.total;
    console.log(pad(' Statements', `${'0.00'.padStart(6)}%  ${cor.cinza}(0/${t.s})${cor.reset}`));
    console.log(pad(' Branches', `${'0.00'.padStart(6)}%  ${cor.cinza}(0/${t.b})${cor.reset}`));
    console.log(pad(' Functions', `${'0.00'.padStart(6)}%  ${cor.cinza}(0/${t.f})${cor.reset}`));

    console.log(`\n${cor.neg}MODULOS SEM COBERTURA${cor.reset}`);
    const ordenados = Object.entries(m.modulos).sort((a, b) => b[1].s - a[1].s);
    for (const [nome, o] of ordenados) {
      if (o.s === 0) continue;
      console.log(pad(`  ${nome}`, `${cor.cinza}0/${o.s} instrucoes, ${o.arq} arquivo(s)${cor.reset}`));
    }
    console.log(`\n${cor.cinza} Total: ${t.arq} arquivos, ${t.s} instrucoes nao cobertas.${cor.reset}`);
  }

  console.log('\n' + linha('='));
  console.log(`${cor.amarelo}${cor.neg} NENHUM TESTE AUTOMATIZADO CONFIGURADO${cor.reset}`);
  console.log(`${cor.cinza} Para habilitar: jest + jest-expo + @testing-library/react-native${cor.reset}`);
  console.log(linha('=') + '\n');

  process.exit(0);
}

main();
