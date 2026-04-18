# RodaBem

Projeto full stack para apoio ao caminhoneiro, com API em NestJS e aplicativo mobile em Expo/React Native.

## Estrutura

```text
rodabem-api/
|-- Back-End/   API NestJS + Prisma + PostgreSQL
|-- Front-End/  App Expo/React Native
```

## Estado Atual

- Back-end com autenticacao, caminhao, documentos, abastecimentos e simulacao de frete.
- Front-end integrado aos fluxos principais e preparado para Expo Go em celular fisico.
- Seed da tabela ANTT disponivel no back-end.

## O que consultar

- API e banco: [Back-End/README.md](./Back-End/README.md)
- App mobile: [Front-End/README.md](./Front-End/README.md)

## Setup Rapido

1. Suba o banco e a API seguindo o README do back-end.
2. Configure o `.env` do front-end.
3. Inicie o Expo em rede local com `npx expo start --lan`.

## Observacoes Importantes

- A calculadora de frete depende de:
  - `ORS_API_KEY` valida no back-end
  - tabela ANTT populada
  - caminhão com `numeroEixos`
  - historico de abastecimento suficiente ou consumo manual
- Para popular a tabela ANTT no banco local:

```bash
cd Back-End
npx prisma db seed
```

- O seed recria os registros da `tabela_antt`.
