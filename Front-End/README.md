# RodaBem Front-End

Aplicativo mobile em Expo/React Native para uso com a API do projeto.

## Como rodar

1. Instale as dependencias:
```bash
npm install
```

2. Configure o `.env` na raiz do front:
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_TOKEN_KEY=rodabem_token
EXPO_PUBLIC_USER_KEY=rodabem_user
```

3. Suba o back-end antes de abrir o app.

4. Inicie o Expo:
```bash
npx expo start --lan
```

## Emulador x celular fisico

- No emulador Android, `10.0.2.2` aponta para a maquina host.
- No celular fisico, use preferencialmente o IP local da sua maquina, por exemplo `http://192.168.0.15:3000`.
- O app agora tenta trocar `10.0.2.2` automaticamente pelo IP do computador quando estiver no Expo Go, mas o back-end ainda precisa estar acessivel pela rede.

## Checklist para Expo Go

- Computador e celular na mesma rede Wi-Fi.
- Back-end rodando na porta `3000`.
- Firewall do Windows liberando a porta `3000`.
- Se o Expo abrir mas o login falhar, ajuste `EXPO_PUBLIC_API_BASE_URL` para o IP local da maquina.
