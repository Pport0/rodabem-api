# Testes de carga e estresse (k6)

API, Postgres e gerador de carga dividem a mesma máquina, então nenhuma conclusão sobre capacidade vale aqui. O que estes testes medem é problema algorítmico: custo que cresce com o tamanho da tabela, consulta sem índice, resposta sem teto e recurso que não volta depois do pico.

## Preparar

```bash
cd Back-End
export DATABASE_URL="postgresql://root:root@localhost:5434/rodabem"

npx ts-node test/carga/semear.ts 8000     # semeia
npx ts-node test/carga/semear.ts limpar   # remove so os usuarios de carga
```

Usuários de carga têm e-mail terminado em `@carga.local` e senha `senha123`. As credenciais são determinísticas, para o k6 montá-las sem consultar o banco:

```
email     carga<i>@carga.local
telefone  62 + <i> com nove digitos
cpf       derivado de <i>, sempre valido
```

Para os cenários de frete, também:

```bash
npx ts-node test/carga/semear-frete.ts 2000 50000   # caminhoes e simulacoes
npx ts-node test/carga/semear-frete.ts limpar
```

## Os scripts

### `login-busca.js`

```bash
k6 run -e USUARIOS=8000 test/carga/login-busca.js
```

Compara login por telefone com login por CPF. Os dois cenários rodam em sequência, nunca em paralelo — competindo por CPU a comparação não valeria nada. O limiar reprova quando o tempo do CPF acompanha o tamanho da tabela.

### `carga.js`

```bash
k6 run test/carga/carga.js
```

Rampa até 30 simultâneos sobre `/users/me`, `/abastecimentos`, `/documentos` e `/users?page=1&limit=10`. A verificação que importa é a da listagem: reprova se `GET /users` não devolver uma coleção.

### `estresse.js`

```bash
k6 run -e PICO=500 test/carga/estresse.js
```

Pressiona leitura além do limite. A rampa pode quebrar; é o objetivo. Os limiares que valem são os da recuperação, medida depois que a pressão zera: `erros_recuperacao < 1%` e `tempo_recuperacao p95 < 500 ms`.

### `busca-antt.ts`

```bash
npx ts-node test/carga/busca-antt.ts
```

Mede a consulta da tabela da ANTT direto no banco, com `EXPLAIN ANALYZE`. Não é cenário de k6 porque o único caminho HTTP até ela passa pelo OpenRouteService, que é cota de terceiro.

### `frete.js`

```bash
npm run build
node -r ./test/carga/duble-ors.cjs dist/src/main    # em outro terminal
k6 run test/carga/frete.js
```

Dois cenários: **escrita** grava simulações com o usuário 0, **leitura** busca o histórico do usuário 1, em quem ninguém escreve. Separados de propósito — com o mesmo usuário a fatia lida cresce durante a rodada e o que se mede vira tamanho de resposta, não tempo de consulta.

### `estresse-frete.js`

```bash
k6 run -e PICO=200 test/carga/estresse-frete.js
```

Mesma preparação. O `estresse.js` pressiona leitura; este pressiona gravação, que segura conexão por mais tempo. A recuperação é medida na leitura, com o usuário que não recebeu escrita.

## O dublê do OpenRouteService

Os dois cenários de frete exigem `duble-ors.cjs`, carregado com `node -r` antes da aplicação subir. Ele troca o `fetch` global e responde localmente no host do ORS; a aplicação continua subindo pelo `main.ts` de verdade, com `ValidationPipe` e banco.

Sem ele a rodada estoura a cota: o plano gratuito dá 100 geocodificações por minuto e cada simulação gasta duas.

A trava contra esquecer: toda distância que o dublê devolve termina em `,77` km, e `retornoVazio` dobra o número para `,54`. Os dois scripts conferem a marca e **abortam a rodada** se ela faltar.

## Armadilhas

**Submétrica por etiqueta só existe com threshold declarado.** `http_req_duration{rota:x}` volta vazia no `handleSummary` sem uma entrada correspondente em `thresholds`.

**`handleSummary` substitui o resumo padrão.** Devolver só as linhas próprias esconde verificações e requisições com erro. Os scripts reimprimem esses números à mão.

**Semear com bcrypt por usuário é inviável.** A cifragem é feita uma vez e reaproveitada por todos os usuários de carga.

**`npm run start:prod` aponta para o lugar errado.** O script é `node dist/main` e o `nest build` gera `dist/src/main.js`, porque o programa TypeScript inclui a pasta `prisma`. Usar `node dist/src/main`.

**O banco de carga é o mesmo dos testes e2e.** `clearDatabase` apaga tudo, inclusive os usuários de carga e a tabela da ANTT. Depois da suíte e2e, rodar `npx ts-node prisma/seed.ts` e semear de novo.
