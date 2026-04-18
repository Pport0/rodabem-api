# RodaBem Back-End

API do projeto RodaBem, construída com NestJS, Prisma e PostgreSQL.

## Stack

- NestJS
- Prisma ORM
- PostgreSQL
- JWT

## Modulos Principais

- `users`
- `auth`
- `caminhao`
- `documento`
- `abastecimento`
- `frete`

## Requisitos

- Node.js 18+
- npm
- Docker ou PostgreSQL local

## Banco de Dados

O repositório já possui [docker-compose.yaml](./docker-compose.yaml) para o PostgreSQL:

```bash
cd Back-End
docker compose up -d
```

Porta publicada localmente:

- PostgreSQL: `5433`

## Variaveis de Ambiente

Crie o arquivo `.env` em `Back-End/`:

```env
DATABASE_URL="postgresql://root:root@localhost:5433/rodabem"
JWT_SECRET="rodabem-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3000
ORS_API_KEY=sua_chave_openrouteservice
```

## Instalacao

```bash
cd Back-End
npm install
```

## Prisma

Gerar client e aplicar schema:

```bash
npx prisma generate
npx prisma migrate deploy
```

Se estiver em ambiente local sem migrations aplicadas, pode ser necessario usar:

```bash
npx prisma migrate dev
```

## Seed da ANTT

A calculadora de frete depende da tabela ANTT persistida no banco.

Para popular a tabela:

```bash
npx prisma db seed
```

O seed:

- limpa a `tabela_antt`
- recria os registros base usados na simulacao

## Execucao

Modo desenvolvimento:

```bash
npm run start:dev
```

API local:

```text
http://localhost:3000
```

## Testes

Unitarios:

```bash
npm test -- --runInBand
```

E2E:

```bash
npm run test:e2e -- --runInBand
```

## Observacoes de Integracao

- A API sobe em `0.0.0.0`, facilitando testes pelo Expo Go na mesma rede.
- A simulacao de frete usa OpenRouteService para geocoding e rota.
- Se a `ORS_API_KEY` nao tiver permissao para geocoding/directions, a simulacao falhara mesmo com enderecos validos.

## Situacao Conhecida

- O comando `npx tsc --noEmit` atualmente falha por configuracao do `tsconfig.json`, embora os testes da API estejam passando.
- O Prisma avisa que `package.json#prisma` esta depreciado para Prisma 7; o seed continua funcionando.
