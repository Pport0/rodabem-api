# RodaBem — Full Stack

## Estrutura
```
rodabem-full/
  Back-End/   → NestJS API (porta 3000)
  Front-End/  → React + Vite (porta 5173)
```

## Como rodar

### 1. Back-End
```bash
cd Back-End
npm install
# Configure o arquivo .env com sua DATABASE_URL e JWT_SECRET
cp .env.example .env   # edite com suas credenciais
npx prisma migrate deploy
npm run start:dev
```

### 2. Front-End
```bash
cd Front-End
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## Integração implementada

| Tela            | Endpoint               | Método |
|-----------------|------------------------|--------|
| Login           | /auth/login            | POST   |
| Logout          | /auth/logout           | POST   |
| Criar Conta     | /users                 | POST   |
| Editar Perfil   | /users/:id             | PUT    |
| Ver Perfil      | AuthContext (local)    | —      |

### Token JWT
- Salvo em `localStorage` após login
- Enviado automaticamente como `Authorization: Bearer TOKEN` em todas as rotas protegidas
- Sessão restaurada automaticamente ao reabrir o app

### Variáveis de ambiente (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/rodabem"
JWT_SECRET="sua-chave-secreta-aqui"
```
