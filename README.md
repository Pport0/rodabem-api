# 🚛 RodaBem — Full Stack

![Node](https://img.shields.io/badge/Node.js-18+-green)
![NestJS](https://img.shields.io/badge/NestJS-API-red)
![Expo](https://img.shields.io/badge/Expo-Mobile-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

Aplicação **mobile + API** para gestão de caminhoneiros, incluindo autenticação, controle de caminhões e documentos.

---

## 📁 Estrutura do Projeto
rodabem-full/
├── Back-End/ # API NestJS (porta 3000)
└── Front-End/ # App mobile com Expo

---

## ⚙️ Tecnologias

### 🔙 Back-End
- NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication

### 📱 Front-End
- React Native
- Expo
- React Query
- Expo Router

---

## 🚀 Como rodar o projeto

---

## 🔧 1. Back-End

### 📁 Acesse

```bash
cd Back-End 
```
```bash
npm install
```

### Configure o .env

### Crie o arquivo .env:
```bash
DATABASE_URL="postgresql://root:root@localhost:5432/rodabem"
JWT_SECRET="rodabem-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3000
```
### Suba o banco
```bash
docker compose up -d
```
### Rode migrations
```bash
npx prisma migrate deploy
npx prisma generate
```
### Inicie
```bash
npm run start:dev
```
### API
```bash
http://localhost:3000
```
### 2. Front-End (Expo)
📁 Acesse
```bash
cd Front-End
```
### 📦 Instale
```bash
npm install
```
### 🧪 Configure o .env

### 🤖 Android Studio (Emulador)
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_TOKEN_KEY=rodabem_token
EXPO_PUBLIC_USER_KEY=rodabem_user

### ▶️ Rodar
```bash
npx expo start
```
### 🤖 Android Studio (Guia rápido)
Abrir Android Studio
Virtual Device Manager
Create Device (Pixel 5 recomendado)
Baixar Android 13/14
Iniciar emulador
No terminal do Expo:
```bash
a
```

###🔐 Autenticação
JWT armazenado automaticamente
Enviado via:
Authorization: Bearer TOKEN
"# RODABEM-FULL" 
