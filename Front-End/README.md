# 🚚 RodaBem — Front-end

Aplicativo mobile para caminhoneiros focado na organização financeira e operacional. Permite registrar ganhos e despesas, calcular consumo de combustível, localizar postos próximos e acompanhar documentos com alertas de vencimento.

---

## Tecnologias

- [Expo](https://expo.dev) + [React Native](https://reactnative.dev)
- [Expo Router](https://expo.github.io/router) (navegação por arquivos)
- [TanStack Query](https://tanstack.com/query) (gerenciamento de dados)
- [Axios](https://axios-http.com) (cliente HTTP)

---

## Como rodar

**1. Clone o repositório**
```bash
git clone <url-do-repositorio>
cd frontend
```

**2. Instale as dependências**
```bash
npm install
```

**3. Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz com base no exemplo abaixo:
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_TOKEN_KEY=rodabem_token
EXPO_PUBLIC_USER_KEY=rodabem_user
```

> Para emulador Android use `10.0.2.2`. Para dispositivo físico use o IP local da máquina.

**4. Suba o back-end**

Certifique-se que a API está rodando antes de iniciar o app.

**5. Rode o front-end**
```bash
npx expo start
```

**6. Abra no dispositivo**

- **Android Studio** — pressione `a` no terminal
- **iOS Simulator** — pressione `i` no terminal
- **Dispositivo físico** — escaneie o QR Code com o app [Expo Go](https://expo.dev/go)

---
