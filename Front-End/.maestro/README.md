# Fluxos de E2E de aplicativo (Maestro)

## Como rodar

```bash
export JAVA_HOME="$HOME/.homebrew/opt/openjdk@21"     # o Maestro nao roda no 25
export ANDROID_HOME="$HOME/.homebrew/share/android-commandlinetools"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$HOME/.maestro/bin:$PATH"

emulator -avd rodabem &                 # precisa de hw.keyboard=no (ver abaixo)
npx expo run:android --variant release  # a bancada roda em release
maestro test .maestro/
```

A API precisa estar no ar em `http://10.0.2.2:3000` visto de dentro do emulador, que e como `Front-End/.env` esta configurado. `10.0.2.2` e o apelido do host.

Cada fluxo cria a propria conta e nao depende de dado semeado antes, entao a ordem de execucao nao importa e rodar duas vezes seguidas da o mesmo resultado.

## Pre-requisitos da bancada, e por que cada um existe

**APK de release, nao debug.** A build de desenvolvimento exibe o aviso do LogBox; a caixa fica no rodape, mas a AREA DE TOQUE sobe ate cerca de 16% acima da base e engole qualquer botao ali. O botao CRIAR CONTA da tela de abertura parecia inerte por causa disso, inclusive para `adb shell input tap`. Nao e defeito do aplicativo: em producao o LogBox nao existe.

**`android/app/src/release/AndroidManifest.xml` concede `usesCleartextTraffic`.** Com `targetSdk 36` o Android bloqueia HTTP em texto claro, e a release nao alcancaria a API local. Trocar o host para `localhost` com `adb reverse` **nao** resolve: a politica e sobre o esquema, nao sobre o host. Esse arquivo vive em `android/`, que e gerado por `expo prebuild` e esta no `.gitignore` — some a cada prebuild e precisa ser recriado.

**AVD com `hw.keyboard=no`.** Com teclado de hardware ligado, o teclado virtual aparecia so em alguns campos. Como no Android o `hideKeyboard` do Maestro e uma tecla VOLTAR, nos campos sem teclado ele tirava o app da tela e o campo seguinte falhava como "elemento nao encontrado" — sintoma que aponta para o lugar errado.

## Armadilhas do Maestro aprendidas aqui

**`env` e `output` valem um unico nivel de `runFlow`.** Subfluxo que chama outro subfluxo recebe variavel vazia, sem erro nenhum: o `inputText` reporta `COMPLETED` tendo digitado nada. Por isso `preencher-cadastro.yaml` e chamado direto pelo fluxo de topo, e o bloco de "criar conta e entrar" aparece repetido nos fluxos em vez de virar um invólucro.

**Comparacao de texto e regex de linha inteira.** `CONFIRME SUA SENHA` nao casa com o rotulo `CONFIRME SUA SENHA*`, que tem asterisco literal. E `Falha ao fazer login` nao casa com o aviso real, porque `authContext.tsx:45` concatena a mensagem do erro sem separador. Usar `.*` quando o texto for composto, e preferir placeholder de campo como ancora.

**Campo abaixo da dobra exige `scrollUntilVisible` antes do toque**, com `visibilityPercentage` baixo quando o teclado estiver aberto — exigir 100% de visibilidade de um campo que o teclado cobre em parte nunca e satisfeito.

**`assertVisible` nao aceita `timeout`.** Para esperar, `extendedWaitUntil`.

**A comparacao ignora maiusculas e minusculas.** O item `Abastecimentos` do menu lateral colide com o cartao `ABASTECIMENTOS` da tela inicial, que fica atras do painel aberto: o Maestro acerta o cartao coberto, reporta o toque como concluido e nada acontece. O sintoma parece botao inerte do aplicativo. Por isso os fluxos navegam pelos cartoes da tela inicial, que e o caminho primario do usuario; o menu lateral fica para `Meu Perfil` e `Sair`, que nao colidem com nada.

## Mapa de navegacao que os fluxos assumem

Levantado dirigindo o aplicativo, nao lendo o codigo:

```
abertura ──ENTRAR──────────> login ──Acessar───> inicial
         └─CRIAR CONTA─────> cadastro ──CONTINUAR──> login

inicial ──MEU CAMINHAO─────> PERFIL ──Cadastrar Caminhao──> formulario
        ──ABASTECIMENTOS───> historico ──NOVO ABASTECIMENTO──> formulario
        ──menu (8%,8%)─────> Meu Perfil | Sair
```

Dois pontos nao obvios. O cartao **MEU CAMINHAO leva ao perfil**, nao a um formulario: o caminhao e uma secao da tela de perfil, coerente com o vinculo 1:1 da RNE-03. E o cadastro do caminhao **termina no perfil**, entao chegar aos abastecimentos depois dele exige voltar antes para a tela inicial.

## Cenarios aprovados que NAO viraram fluxo

**Alerta de vencimento na tela inicial (RNE-11).** Bloqueado: o cenario exige um documento perto do vencimento, e `POST /documentos` esta quebrado em producao (DTO sem decorators somado a `whitelist: true` no ValidationPipe). Sem conseguir criar o documento, um fluxo aqui falharia pela montagem do cenario, nao pela regra. Registrado: `app/(drawer)/home.tsx` nao menciona documentos nem vencimento, e nada no front consome `GET /documentos/alertas`.

**Os cinco cenarios de documento.** Mesma causa. Os 11 testes vermelhos em `Back-End/test/documento.e2e-spec.ts` ja documentam o defeito; repetir aqui seria duplicar o mesmo motivo de falha, o que o plano proibe. Alem disso as datas usam seletor nativo, que o Maestro dirige mal — quando o cadastro voltar a funcionar, esse ponto precisa ser reavaliado.

**Edicao de caminhao e de abastecimento.** Os botoes de editar sao so icone, sem texto, `testID` ou `accessibilityLabel`. Diferente do botao de menu, que tem posicao fixa e por isso aceita toque por coordenada, esses ficam dentro de listas e mudam de lugar conforme o conteudo.
