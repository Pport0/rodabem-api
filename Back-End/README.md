# ⚙️ RodaBem — Back-End

API REST do RodaBem. É responsável por autenticação, armazenamento dos dados, leitura automática de documentos (OCR), cálculo de consumo médio e simulação de frete com base no piso mínimo da ANTT.

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Docker-4169E1?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

---

## Sumário

1. [Módulos](#1-módulos)
2. [Arquitetura](#2-arquitetura)
3. [Tecnologias](#3-tecnologias)
4. [Como rodar](#4-como-rodar)
5. [Variáveis de ambiente](#5-variáveis-de-ambiente)
6. [Endpoints](#6-endpoints)
7. [Regras de negócio](#7-regras-de-negócio)
8. [Modelo de dados](#8-modelo-de-dados)
9. [Testes](#9-testes)
10. [Estrutura de pastas](#10-estrutura-de-pastas)
---

## 1. Módulos

| Módulo | Responsabilidade |
|---|---|
| **auth** | Login com JWT (por CPF ou telefone + senha) e logout com *blacklist* de tokens. |
| **users** | Cadastro, consulta, edição, exclusão da conta e troca de senha. |
| **caminhao** | Cadastro do veículo (um por usuário) e **leitura do CRLV** por OCR. |
| **documento** | Cadastro de documentos, leitura por OCR e **alertas de vencimento**. |
| **abastecimento** | Registro de abastecimentos, **consumo médio (km/L)** e relatório por período. |
| **frete** | **Simulação de frete** com rota real e piso ANTT, e histórico de simulações. |

## 2. Arquitetura

A API segue a arquitetura modular do NestJS: cada domínio tem seu próprio **módulo**, com *controller* (rotas HTTP), *service* (regras de negócio) e *DTOs* (validação de entrada). O acesso ao banco é centralizado no `PrismaService`.

```mermaid
flowchart LR
    C[Cliente HTTP] -- "Bearer token" --> API

    subgraph API["API (NestJS)"]
        direction TB
        Auth[auth]
        Users[users]
        Cam[caminhao]
        Doc[documento]
        Ab[abastecimento]
        Frete[frete]
        Prisma[(PrismaService)]
        Auth & Users & Cam & Doc & Ab & Frete --> Prisma
    end

    Prisma --> DB[(PostgreSQL)]
    Cam & Doc -- "upload" --> Cloud[Cloudinary]
    Cam & Doc -- "OCR" --> Tess[Tesseract.js<br/>idioma: por]
    Frete -- "geocoding + rota" --> ORS[OpenRouteService]
```

**Ciclo de uma requisição autenticada:**

1. O cliente envia `Authorization: Bearer <token>`.
2. O `JwtAuthGuard` valida o token e verifica se ele não está na *blacklist*.
3. O `ValidationPipe` global valida o corpo contra o DTO e descarta campos desconhecidos.
4. O *service* executa a regra de negócio **sempre filtrando pelo `userId` do token**, então um usuário nunca acessa dados de outro.

## 3. Tecnologias

| Tecnologia | Uso |
|---|---|
| **NestJS 11** | Framework (módulos, injeção de dependência, guards, pipes). |
| **Prisma 6** | ORM, migrations e seed. |
| **PostgreSQL** | Banco relacional, executado via Docker. |
| **Passport + JWT** | Autenticação stateless. |
| **bcrypt** | Hash de senhas. |
| **crypto (AES-256-CBC)** | Criptografia do CPF. |
| **class-validator** | Validação dos DTOs. |
| **Tesseract.js** | OCR em português. |
| **pdf2pic** | Conversão de PDF em imagem para o OCR. |
| **Cloudinary** | Armazenamento dos arquivos enviados. |
| **OpenRouteService** | Geocodificação e cálculo de rota/distância. |
| **Jest + Supertest** | Testes unitários e end-to-end. |

## 4. Como rodar

### Pré-requisitos

- **Node.js 18+** e **npm**
- **Docker** (ou um PostgreSQL local)
- **GraphicsMagick** e **Ghostscript**, exigidos pelo `pdf2pic` para ler PDFs
  - Ubuntu/Debian: `sudo apt install graphicsmagick ghostscript`
  - macOS: `brew install graphicsmagick ghostscript`
  - Windows: instale pelos sites oficiais e adicione ao `PATH`
- Chave gratuita do **[OpenRouteService](https://openrouteservice.org/dev/#/signup)**
- Conta gratuita do **[Cloudinary](https://cloudinary.com/)**

### Passo a passo

```bash
# 1. Entre na pasta
cd Back-End

# 2. Instale as dependências
npm install

# 3. Crie o arquivo .env (ver seção 5)

# 4. Suba o PostgreSQL (porta 5433)
docker compose up -d

# 5. Crie as tabelas
npx prisma migrate dev

# 6. Popule a tabela do piso mínimo ANTT (obrigatório para o frete)
npx prisma db seed

# 7. Inicie em modo desenvolvimento
npm run start:dev
```

A API fica disponível em **http://localhost:3000** e escuta em todas as interfaces de rede, então também pode ser acessada pelo IP local da máquina (ex.: `http://192.168.0.10:3000`).

## 5. Variáveis de ambiente

Crie o arquivo `.env` dentro de `Back-End/`:

```env
DATABASE_URL="postgresql://root:root@localhost:5433/rodabem"
JWT_SECRET="troque-por-um-valor-longo-e-aleatorio"
JWT_EXPIRES_IN="7d"
CRYPTO_SECRET="troque-por-uma-chave-de-32-chars"
PORT=3000
ORS_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
DIAS_ALERTA_VENCIMENTO=30
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Conexão com o PostgreSQL. |
| `JWT_SECRET` | ✅ | Segredo para assinar os tokens. |
| `JWT_EXPIRES_IN` | ✅ | Validade do token (ex.: `7d`). |
| `CRYPTO_SECRET` | ✅ | Chave de 32 caracteres para criptografar o CPF. |
| `PORT` | ➖ | Porta da API (padrão `3000`). |
| `ORS_API_KEY` | ✅ p/ frete | Chave do OpenRouteService com permissão de *geocode* e *directions*. |
| `CLOUDINARY_CLOUD_NAME` | ✅ p/ OCR | Nome da conta Cloudinary. |
| `CLOUDINARY_API_KEY` | ✅ p/ OCR | Chave da API Cloudinary. |
| `CLOUDINARY_API_SECRET` | ✅ p/ OCR | Segredo da API Cloudinary. |
| `DIAS_ALERTA_VENCIMENTO` | ➖ | Antecedência dos alertas de documento, em dias. Padrão `30`. |

> ⚠️ Nunca faça commit do arquivo `.env`.

## 6. Endpoints

🔒 = exige header `Authorization: Bearer <token>`.

### Autenticação e usuários

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/users` | Cria uma conta (nome, e-mail, CPF, senha, telefone). |
| `POST` | `/auth/login` | Login com `cpf` **ou** `telefone` + `senha`; retorna o token. |
| `POST` | `/auth/logout` 🔒 | Invalida o token atual. |
| `GET` | `/users/me` 🔒 | Dados do usuário logado. |
| `PUT` | `/users/:id` 🔒 | Edita a própria conta. |
| `PATCH` | `/users/me/senha` 🔒 | Troca de senha (`senhaAtual`, `novaSenha`). |
| `DELETE` | `/users/:id` 🔒 | Exclui a própria conta. |

### Caminhão

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/caminhao/scan` 🔒 | Recebe foto/PDF do CRLV (campo `documento`, *multipart*) e retorna os dados extraídos. |
| `POST` | `/caminhao` 🔒 | Cadastra o caminhão. |
| `GET` | `/caminhao` 🔒 | Retorna o caminhão do usuário. |
| `PUT` | `/caminhao` 🔒 | Atualiza o caminhão. |
| `DELETE` | `/caminhao` 🔒 | Remove o caminhão. |

### Documentos

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/documentos/scan` 🔒 | Recebe o arquivo (campo `documento`) e retorna os dados extraídos. |
| `POST` | `/documentos` 🔒 | Cadastra um documento. |
| `GET` | `/documentos` 🔒 | Lista os documentos do usuário. |
| `GET` | `/documentos/alertas` 🔒 | Documentos que vencem nos próximos `DIAS_ALERTA_VENCIMENTO` dias. |
| `PUT` | `/documentos/:id` 🔒 | Atualiza um documento. |
| `DELETE` | `/documentos/:id` 🔒 | Remove um documento. |

### Abastecimentos

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/abastecimentos` 🔒 | Registra um abastecimento. |
| `GET` | `/abastecimentos` 🔒 | Lista os abastecimentos. |
| `GET` | `/abastecimentos/media-consumo` 🔒 | Consumo médio em km/L. |
| `GET` | `/abastecimentos/relatorio?dataInicio=&dataFim=` 🔒 | Totais gastos e litros no período. |
| `GET` | `/abastecimentos/:id` 🔒 | Detalhe de um abastecimento. |
| `PATCH` | `/abastecimentos/:id` 🔒 | Atualiza um abastecimento. |
| `DELETE` | `/abastecimentos/:id` 🔒 | Remove um abastecimento. |

### Frete

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/frete/simular` 🔒 | Simula um frete (ver seção 7). |
| `GET` | `/frete/historico` 🔒 | Lista as simulações do usuário. |
| `GET` | `/frete/historico/:id` 🔒 | Detalhe de uma simulação. |

<details>
<summary><b>Exemplo: login e simulação de frete</b></summary>

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf": "12345678909", "senha": "Senha@123"}'

# Simulação (use o token retornado acima)
curl -X POST http://localhost:3000/frete/simular \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "origem": "Uberlândia, MG",
    "destino": "São Paulo, SP",
    "tipoCarga": "GERAL",
    "precoCombustivel": 6.19,
    "pedagiosManual": 120,
    "retornoVazio": false
  }'
```

Resposta (resumida):

```json
{
  "distanciaKm": 586.4,
  "litrosNecessarios": 195.47,
  "custoCombustivel": 1209.96,
  "pedagiosEstimados": 120,
  "valorMinimoAntt": 2669.88,
  "valorLiquidoEstimado": 1339.92,
  "abaixoMinimoAntt": false,
  "aviso": null
}
```

*Valores ilustrativos.*
</details>

## 7. Regras de negócio

### Consumo médio (km/L)

Os abastecimentos são ordenados pela quilometragem. Para cada par consecutivo:

```
consumo do trecho = (km atual − km anterior) ÷ litros abastecidos no registro atual
```

A média final é a média dos trechos. São necessários **pelo menos dois abastecimentos**; trechos com distância ou litros inválidos são ignorados. A quilometragem de um novo abastecimento não pode ser menor que a do anterior.

### Simulação de frete

```mermaid
flowchart TD
    A[Origem, destino, tipo de carga,<br/>preço do diesel, pedágios] --> B{Caminhão cadastrado<br/>com nº de eixos?}
    B -- não --> X[Erro 400]
    B -- sim --> C[OpenRouteService<br/>calcula a distância]
    C --> D{Consumo informado<br/>manualmente?}
    D -- sim --> E[Usa o valor informado]
    D -- não --> F[Usa o consumo médio<br/>dos abastecimentos]
    E & F --> G[Custo = litros × preço + pedágios]
    G --> H[Piso ANTT = valor/km × distância<br/>conforme eixos e tipo de carga]
    H --> I[Líquido = piso ANTT − custo]
    I --> J[Salva no histórico e retorna<br/>aviso se o resultado for negativo]
```

- Com **retorno vazio**, a distância e os pedágios são dobrados.
- O valor por km vem da tabela `tabela_antt`, populada pelo seed: caminhões de **2 a 6 eixos** e cargas `GERAL`, `GRANEL_SOLIDO`, `GRANEL_LIQUIDO`, `FRIGORIFICADA`, `PERIGOSA` e `CONTEINER`.
- Se o resultado for negativo, a resposta traz `abaixoMinimoAntt: true` e um aviso de que o piso da ANTT não cobre os custos.

> Os valores ficam em [`prisma/seeds/antt.seed.ts`](./prisma/seeds/antt.seed.ts) e devem ser atualizados a cada nova resolução da ANTT. O comando `npx prisma db seed` **apaga e recria** a tabela.

### Leitura de documentos (OCR)

1. O arquivo é enviado ao Cloudinary.
2. Se for PDF, é convertido em imagem (`pdf2pic`).
3. O Tesseract extrai o texto em português (`por.traineddata`).
4. Expressões regulares identificam os campos: placa (padrão antigo e Mercosul), RENAVAM (11 dígitos), chassi (17 caracteres), ano, cor etc.
5. A resposta traz os campos encontrados e a lista dos obrigatórios que **não** foram reconhecidos.

### Segurança

- Senhas armazenadas com **bcrypt**.
- CPF armazenado **criptografado (AES-256-CBC)** e como *hash*, para garantir unicidade sem expor o valor.
- Logout real: o token é gravado em `TokenBlackList` e passa a ser recusado.
- Todas as consultas filtram pelo `userId` do token, com testes e2e específicos de isolamento.

## 8. Modelo de dados

```mermaid
erDiagram
    usuarios ||--o| Caminhao : possui
    usuarios ||--o{ Documento : possui
    usuarios ||--o{ abastecimentos : registra
    usuarios ||--o{ simulacoes_frete : faz
    Caminhao ||--o{ Documento : "pode ter"
    Caminhao ||--o{ abastecimentos : recebe
    Caminhao ||--o{ simulacoes_frete : usado_em

    usuarios { int id string nome string email string cpfEncrypted string telefone }
    Caminhao { int id string placa string renavam string modelo int numeroEixos }
    Documento { int id string nome string numero date dataVencimento string arquivoUrl }
    abastecimentos { int id float totalLitros float precoPorLitro int quilometragem enum tipoCombustivel }
    simulacoes_frete { int id string origem string destino float distanciaKm float valorMinimoAntt float valorLiquidoEstimado }
    tabela_antt { int numeroEixos enum tipoCarga float valorPorKm }
```

O schema completo está em [`prisma/schema.prisma`](./prisma/schema.prisma).

## 9. Testes

```bash
npm test               # unitários (*.spec.ts em src/)
npm run test:e2e       # end-to-end (pasta test/, precisa do banco rodando)
npm run test:cov       # cobertura dos unitários
npm run test:report    # executa todas as suítes e gera um relatório resumido
```

Os testes e2e cobrem os fluxos de cada módulo e cenários de **segurança**: requisição sem token, token inválido, acesso a dados de outro usuário e envio de arquivos inválidos para o OCR.

## 10. Estrutura de pastas

```text
Back-End/
├── prisma/
│   ├── schema.prisma        # modelo do banco
│   ├── migrations/          # histórico de alterações do banco
│   ├── seed.ts              # ponto de entrada do seed
│   └── seeds/antt.seed.ts   # valores do piso mínimo ANTT
├── src/
│   ├── main.ts              # inicialização: ValidationPipe, CORS, porta
│   ├── app.module.ts        # registro dos módulos
│   ├── auth/                # login, logout, estratégia e guard JWT
│   ├── users/               # conta do usuário (+ validador de CPF)
│   ├── caminhao/            # CRUD do caminhão + scan/ (OCR e Cloudinary)
│   ├── documento/           # CRUD, alertas de vencimento + scan/
│   ├── abastecimento/       # CRUD, consumo médio e relatório
│   ├── frete/               # simulação, histórico e cliente OpenRouteService
│   ├── prisma/              # PrismaService compartilhado
│   └── common/utils/        # criptografia do CPF
├── test/                    # testes e2e
├── docker-compose.yaml      # PostgreSQL local (porta 5433)
└── por.traineddata          # modelo de OCR em português
```
