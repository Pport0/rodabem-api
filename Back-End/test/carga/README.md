# Testes de carga e estresse (k6)

## Para que servem, e para que não servem

A API, o Postgres e o próprio gerador de carga dividem a mesma máquina. Isso torna **inútil** qualquer conclusão sobre capacidade: "aguenta N usuários" não se mede assim.

O que estes testes medem bem é **problema algorítmico**:

* custo que cresce junto com o tamanho da tabela;
* consulta sem índice;
* resposta que cresce sem teto;
* recurso que vaza e não volta depois do pico.

Esses achados sobrevivem à troca de máquina. Números absolutos, não.

---

## Preparar

O banco precisa de volume. Sem ele, tudo cabe em memória, o Postgres nunca sai
do caminho feliz e o teste não mede nada.

```bash
cd Back-End
export DATABASE_URL="postgresql://root:root@localhost:5434/rodabem"

npx ts-node test/carga/semear.ts 8000     # semeia
npx ts-node test/carga/semear.ts limpar   # remove so os usuarios de carga
```

Os usuários semeados têm e-mail terminado em `@carga.local`, o que permite removê-los sem tocar no resto. Todos compartilham a senha `senha123` — bcrypt custa cerca de 100 ms por chamada, e cifrar milhares de senhas distintas levaria dezenas de minutos sem nenhum ganho.

Credenciais seguem um esquema determinístico, para o k6 montar qualquer uma sem consultar o banco:

```
email     carga<i>@carga.local
telefone  62 + <i> com nove digitos
cpf       derivado de <i>, sempre valido
```

Com a API no ar (`npm run start:dev`), rodar:

---

## 1. `login-busca.js` — a sonda algorítmica

Compara o login por telefone (consulta indexada) com o login por CPF, que carrega a tabela inteira e decifra cada linha em JavaScript.

```bash
k6 run -e USUARIOS=8000 test/carga/login-busca.js
```

Os dois cenários rodam **em sequência**, nunca em paralelo: competindo por CPU a comparação não valeria nada.

| usuários | telefone p95 | cpf p95 | razão | medido em |
|---|---|---|---|---|
| 2.000 | 98 ms | 156 ms | 1,6x | 11/10/2026 |
| 8.000 | 98 ms | 613 ms | 6,3x | 11/10/2026 |
| 8.000 | 91 ms | 621 ms | 6,8x | 12/10/2026 |
| 16.000 | 86 ms | 1.174 ms | 13,6x | 12/10/2026 |

O telefone fica cravado seja qual for o volume; o CPF acompanha a tabela. É a assinatura de varredura de tabela — e é o defeito, não a lentidão em si.

**Confirmado em 12/10/2026.** Dobrar a semeadura de 8.000 para 16.000 dobrou o p95 do CPF (621 → 1.174 ms, 1,89x) e não mexeu no do telefone. Os três pontos de volume crescem proporcionalmente: 4x de volume entre 2.000 e 8.000 deu 4,0x de tempo; 2x entre 8.000 e 16.000 deu 1,9x. O custo é linear no tamanho da tabela.

Extrapolando a reta, o limite declarado de 2.000 ms para `login_por_cpf` estoura por volta de 28.000 usuários — ou seja, a sonda deixa de passar antes de o produto ter base relevante.

---

## 2. `carga.js` — leituras autenticadas sob volume

```bash
k6 run test/carga/carga.js
```

Rampa até 30 usuários simultâneos sobre `/users/me`, `/abastecimentos`, `/documentos` e `/users?page=1&limit=10`.

A verificação que importa é a da listagem: ela reprova se `GET /users` não devolver uma coleção.

Medido em 12/10/2026, com 16.000 usuários na tabela:

```
p95 por rota          /users/me 5 ms, /abastecimentos 5 ms, /documentos 4 ms, /users 5 ms
requisicoes com erro  0,00 %
verificacoes          66,67 % aprovadas (166.916 reprovadas de 500.748)
GET /users            p95 do corpo da resposta 0,17 KB
```

Exatamente um terço das verificações reprova, e é sempre a mesma: a da coleção. As rotas são rápidas porque nenhuma delas varre tabela — a lentidão do CPF é só no login. O corpo de 0,17 KB é do tamanho de um registro único, e isso confirma o defeito: a rota declara `page`, `limit`, `nome` e `status`, e devolve um usuário só em vez de uma página. Igual ao medido em 11/10/2026.

---

## 3. `estresse.js` — além do limite, e a volta

```bash
k6 run -e PICO=500 test/carga/estresse.js
```

A rampa **pode** quebrar; é o objetivo. Os limites da rampa são folgados de propósito, e existem só para o k6 materializar as submétricas por etiqueta — ele não as coleta sem um threshold declarado.

Os limites que valem são os da fase de recuperação, medida depois que a pressão zera:

```
erros_recuperacao   rate < 1%
tempo_recuperacao   p95  < 500 ms
```

Sistema que não volta ao normal indica recurso vazado: conexão de banco presa, fila sem limite, memória que não retorna.

Medido com pico de 500:

| | sob pressão | depois do pico | medido em |
|---|---|---|---|
| p95 do login | 7.651 ms | 1 ms | 11/10/2026 |
| p95 do login | 7.457 ms | 1 ms | 12/10/2026 |

Erros em 0% nas duas rodadas, nas duas fases. Degrada enfileirando em vez de falhar, e recupera por inteiro. Nenhum defeito de recuperação encontrado, e o resultado se repetiu com um dia e 16.000 usuários de diferença.

---

## Armadilhas

**Submétrica por etiqueta só existe com threshold declarado.** `http_req_duration{rota:x}` volta vazia no `handleSummary` se não houver uma entrada correspondente em `thresholds`.

**`handleSummary` substitui o resumo padrão.** Devolver só as linhas próprias esconde o resultado das verificações e das requisições com erro. Os três scripts reimprimem esses números à mão.

**Semear com bcrypt por usuário é inviável.** A cifragem é feita uma vez e reaproveitada.

**O banco de carga é o mesmo dos testes e2e.** `clearDatabase` apaga tudo, inclusive os usuários de carga. Semeie de novo depois de rodar a suíte e2e.
