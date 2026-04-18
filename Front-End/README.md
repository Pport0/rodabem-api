# RodaBem Front-End

Aplicativo mobile em Expo/React Native para consumo da API do projeto RodaBem.

## Stack

- Expo
- React Native
- Expo Router
- React Query
- Secure Store

## Instalacao

```bash
cd Front-End
npm install
```

## Variaveis de Ambiente

Crie o arquivo `.env` em `Front-End/`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_TOKEN_KEY=rodabem_token
EXPO_PUBLIC_USER_KEY=rodabem_user
```

## Como Rodar

Com a API ja ativa:

```bash
npx expo start --lan
```

## Emulador x Celular Fisico

- Emulador Android:
  - `10.0.2.2` aponta para a maquina host
- Celular fisico com Expo Go:
  - use o IP local do computador, por exemplo `http://192.168.0.15:3000`
  - computador e celular precisam estar na mesma rede Wi-Fi

O app tenta substituir `10.0.2.2` automaticamente pelo IP do host quando detecta Expo Go, mas isso nao elimina a necessidade de a API estar acessivel pela rede.

## Checklist para Expo Go

- Back-end rodando na porta `3000`
- Firewall liberando a porta `3000`
- Mesmo Wi-Fi entre computador e celular
- `.env` apontando para a API correta

## Fluxos Principais Ja Integrados

- login e cadastro
- perfil do usuario
- cadastro e edicao de caminhão
- documentos e renovacao via edicao
- abastecimentos
- simulacao de frete

## Observacoes

- A simulacao de frete depende do back-end estar com:
  - `ORS_API_KEY` valida
  - tabela ANTT populada
  - caminhão com `numeroEixos`
- Se o app abrir mas nao conseguir autenticar ou buscar dados, revise primeiro `EXPO_PUBLIC_API_BASE_URL`.
