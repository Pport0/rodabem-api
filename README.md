# RodaBem

Aplicativo voltado ao apoio do caminhoneiro, com foco em cadastro/autenticação, controle básico de abastecimento, acompanhamento de documentos e visualização de telas do fluxo do app.

Este repositório está organizado em dois projetos:

- **Back-End**: API em **NestJS + Prisma + PostgreSQL**
- **Front-End**: interface em **React + Vite + TypeScript**

## Estrutura do projeto

```bash
rodabem-api/
├── Back-End/
│   ├── prisma/
│   ├── src/
│   └── package.json
└── Front-End/
    ├── public/
    ├── src/
    └── package.json
```

## Funcionalidades identificadas

### Back-End
- Cadastro de usuário
- Login com **CPF ou telefone + senha**
- Logout com blacklist de token
- Listagem paginada de usuários
- Edição e exclusão de usuários
- Validação de CPF
- Criptografia de CPF no banco

### Front-End
- Tela inicial
- Login
- Cadastro
- Dashboard
- Perfil e edição de perfil
- Abastecimento
- Postos e preços
- Fluxo de documentos do motorista
- Fluxo de documentos do veículo

> Observação: pela análise do código atual, o **Front-End ainda está majoritariamente visual/prototipado** e **não possui integração HTTP implementada** com o Back-End neste momento.

---

## Requisitos

Antes de rodar o projeto, tenha instalado:

- **Node.js** 18 ou superior
- **npm**
- **PostgreSQL**

Para conferir:

```bash
node -v
npm -v
```

---

## 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd rodabem-api
```

---

## 2. Configurar o Back-End

Entre na pasta do back-end:

```bash
cd Back-End
```

### Instalar dependências

```bash
npm install
```

### Criar arquivo `.env`

Na pasta `Back-End`, crie um arquivo chamado `.env` com este conteúdo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/rodabem?schema=public"
JWT_SECRET="sua_chave_jwt_segura"
JWT_EXPIRES_IN="1d"
CRYPTO_SECRET="sua_chave_de_32_caracteres"
PORT=3000
```

### Explicação das variáveis

- `DATABASE_URL`: conexão com o PostgreSQL
- `JWT_SECRET`: chave usada para assinar o token JWT
- `JWT_EXPIRES_IN`: tempo de expiração do token
- `CRYPTO_SECRET`: chave usada para criptografar CPF
- `PORT`: porta da API

> Importante: a `CRYPTO_SECRET` deve ter tamanho adequado para manter consistência na criptografia.

### Criar o banco de dados

No PostgreSQL, crie um banco chamado `rodabem`.

### Rodar as migrations

```bash
npx prisma migrate deploy
```

Se estiver em ambiente local de desenvolvimento, você também pode usar:

```bash
npx prisma migrate dev
```

### Gerar o client do Prisma

```bash
npx prisma generate
```

### Rodar o servidor

```bash
npm run start:dev
```

Se tudo estiver certo, a API ficará disponível em:

```bash
http://localhost:3000
```

---

## 3. Configurar o Front-End

Abra outro terminal e entre na pasta do front-end:

```bash
cd Front-End
```

### Instalar dependências

```bash
npm install
```

### Rodar a aplicação

```bash
npm run dev
```

O Vite mostrará uma URL parecida com esta:

```bash
http://localhost:5173
```

Abra essa URL no navegador.

---

## Como rodar o aplicativo completo

Você precisará de **dois terminais abertos**.

### Terminal 1 — Back-End

```bash
cd Back-End
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### Terminal 2 — Front-End

```bash
cd Front-End
npm install
npm run dev
```

Depois acesse:

```bash
http://localhost:5173
```

---

## Scripts disponíveis

### Back-End

```bash
npm run start
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
npm run test:cov
```

### Front-End

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## Rotas principais da API

### Criar usuário

```http
POST /users
```

Exemplo de body:

```json
{
  "nome": "Gabriel Bertonsin",
  "email": "gabriel@email.com",
  "senha": "123456",
  "cpf": "12345678909",
  "telefone": "62999999999"
}
```

### Login

```http
POST /auth/login
```

Exemplo com CPF:

```json
{
  "cpf": "12345678909",
  "senha": "123456"
}
```

Exemplo com telefone:

```json
{
  "telefone": "62999999999",
  "senha": "123456"
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer SEU_TOKEN
```

### Listar usuários

```http
GET /users?page=1&limit=10
Authorization: Bearer SEU_TOKEN
```

### Atualizar usuário

```http
PUT /users/:id
Authorization: Bearer SEU_TOKEN
```

### Excluir usuário

```http
DELETE /users/:id
Authorization: Bearer SEU_TOKEN
```

---

## Tecnologias utilizadas

### Back-End
- NestJS
- Prisma ORM
- PostgreSQL
- JWT
- Bcrypt
- Class Validator

### Front-End
- React
- Vite
- TypeScript
- CSS

---

## Possíveis melhorias

- Integrar o Front-End com a API
- Adicionar documentação Swagger
- Criar arquivo `.env.example`
- Adicionar Docker para facilitar execução
- Criar seeds para popular banco de desenvolvimento
- Implementar recuperação de senha
- Implementar upload real de documentos

---

## Observações importantes

- O projeto está dividido em **Back-End** e **Front-End**, então os comandos devem ser executados na pasta correta.
- O banco precisa estar ativo antes de rodar a API.
- O Front-End atual funciona bem como apresentação visual do fluxo, mas ainda depende de integração para uso completo em produção.

---

## Autor

Projeto RodaBem.
