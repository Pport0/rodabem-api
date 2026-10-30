# Fluxos de E2E de aplicativo (Maestro)

## Como rodar

```bash
export JAVA_HOME="$HOME/.homebrew/opt/openjdk@21"     # o Maestro nao roda no 25
export ANDROID_HOME="$HOME/.homebrew/share/android-commandlinetools"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$HOME/.maestro/bin:$PATH"

emulator -avd rodabem &                 # precisa de hw.keyboard=no
npx expo run:android --variant release  # a bancada roda em release
maestro test .maestro/
```

A API precisa estar no ar em `http://10.0.2.2:3000` visto de dentro do emulador, que é como `Front-End/.env` está configurado. Cada fluxo cria a própria conta, então a ordem não importa e rodar duas vezes dá o mesmo resultado.

## Pré-requisitos

**APK de release, não debug.** O LogBox da build de desenvolvimento fica no rodapé, mas a área de toque sobe cerca de 16% acima da base e engole qualquer botão ali.

**`android/app/src/release/AndroidManifest.xml` concede `usesCleartextTraffic`.** Com `targetSdk 36` o Android bloqueia HTTP em texto claro. Trocar o host para `localhost` com `adb reverse` não resolve: a política é sobre o esquema. O arquivo vive em `android/`, gerado por `expo prebuild` e no `.gitignore` — some a cada prebuild.

**AVD com `hw.keyboard=no`.** Com teclado de hardware ligado, o virtual aparece só em alguns campos e o fechamento passa a tocar em lugar errado nos outros.

**`ORS_API_KEY` válida no `.env` do back.** Os dois fluxos que simulam frete dependem dela. O plano gratuito dá 1.000 geocodificações por dia e cada simulação gasta duas.

## Armadilhas

**Não usar `hideKeyboard`.** No Android ele é a tecla VOLTAR e, a partir do Maestro 2.11.0, em algumas telas fecha o teclado e sai da tela na mesma ação. O passo sai COMPLETED e quem falha é o `tapOn` seguinte, com "elemento não encontrado" numa tela que não é mais a esperada. Em seu lugar, `_comum/fechar-teclado.yaml`, que toca na tecla de confirmação do próprio teclado.

Duas alternativas não servem: tocar fora do campo só funciona em tela com `ScrollView`, e rolar até o campo seguinte não funciona em formulário que cabe inteiro na tela, porque não há o que rolar.

**O teclado cobre o centro do campo, e o Maestro toca no centro.** Quando o campo fica na faixa que o teclado ocupa, o toque cai no teclado, o foco não muda, e o texto vai para o campo anterior. Fechar o teclado antes de cada toque resolve. Para conferir posição, `adb shell uiautomator dump`.

**`scrollUntilVisible` espera e rola; `extendedWaitUntil` só espera.** Depois de uma ação demorada que muda a página, a tela não fica onde estava. Nesses pontos, rolar com `timeout` longo.

**`env` e `output` valem um único nível de `runFlow`.** Subfluxo que chama outro recebe variável vazia, sem erro: o `inputText` reporta COMPLETED tendo digitado nada. Por isso `preencher-cadastro.yaml` é chamado direto pelo fluxo de topo.

**Comparação de texto é regex de linha inteira.** `CONFIRME SUA SENHA` não casa com o rótulo `CONFIRME SUA SENHA*`. Usar `.*` quando o texto for composto, e preferir placeholder de campo como âncora.

**Rolar até um texto que se repete para na primeira ocorrência.** Os dois campos de endereço do frete têm o mesmo placeholder; para voltar ao topo, mirar num título de seção.

**Campo abaixo da dobra exige `scrollUntilVisible` antes do toque**, com `visibilityPercentage` baixo quando o teclado estiver aberto.

**`assertVisible` não aceita `timeout`.** Para esperar, `extendedWaitUntil`.

**A comparação ignora maiúsculas.** `Abastecimentos` do menu lateral colide com o cartão `ABASTECIMENTOS` da tela inicial, que fica atrás do painel aberto: o Maestro acerta o cartão coberto e nada acontece. Por isso os fluxos navegam pelos cartões; o menu fica para `Meu Perfil` e `Sair`.

**Título, cabeçalho e botão com o mesmo texto são três elementos.** Em `reset-password` o texto `REDEFINIR SENHA` aparece no cabeçalho do navegador, no título da tela e no botão de enviar. O Maestro toca no primeiro que encontra, que é o cabeçalho, o passo sai COMPLETED e nada acontece — quem falha é a asserção seguinte. Resolver com seletor relativo (`below:` o último campo do formulário), não com `index:`, que muda se alguém mexer no cabeçalho.

## Mapa de navegação que os fluxos assumem

```
abertura ──ENTRAR──────────> login ──Acessar───> inicial
         └─CRIAR CONTA─────> cadastro ──CONTINUAR──> login

inicial ──MEU CAMINHAO─────> PERFIL ──Cadastrar Caminhao──> formulario
        ──ABASTECIMENTOS───> historico ──NOVO ABASTECIMENTO──> formulario
        ──menu (8%,8%)─────> Meu Perfil | Sair
```

O cartão MEU CAMINHÃO leva ao perfil, não a um formulário: o caminhão é uma seção da tela de perfil, coerente com o vínculo 1:1 da RNE-03. E o cadastro do caminhão termina no perfil.

## Alcance por seletor

O Maestro só alcança elemento com texto visível, `testID` ou `accessibilityLabel`. O aplicativo não usa os dois últimos, então botão só com ícone fica fora: voltar do cabeçalho, editar e excluir das listagens.

O botão de menu é a exceção — tem posição fixa e aceita toque por coordenada, encapsulado em `_comum/abrir-menu.yaml`. Se o cabeçalho mudar de altura, conferir com `adb shell uiautomator dump` e ajustar ali.

## Recuperação de senha

Os quatro fluxos de `recuperacao-senha/` rodam na suíte normal e não dependem de caixa de e-mail: usam um endereço não cadastrado, e o back responde a mensagem genérica sem chegar a enviar nada. Cobrem o envio confirmado, a oferta de colar o código, a recusa de e-mail inválido, as validações da tela de redefinir e a recusa de código inválido com o caminho de volta para pedir outro e-mail.

Os dois de `recuperacao-senha/manual/` ficam **fora** do `config.yaml` de propósito, porque dependem de uma caixa de e-mail real e de alguém para ler o código:

```bash
maestro test -e EMAIL=<caixa-de-e-mail-que-voce-abre> .maestro/recuperacao-senha/manual/pede-o-codigo-por-email.yaml
maestro test -e TOKEN=<codigo-do-email> -e CREDENCIAL=<cpf-ou-telefone-da-conta> .maestro/recuperacao-senha/manual/redefine-com-o-codigo-do-email.yaml
```

O segundo precisa rodar dentro dos 30 minutos de validade, e consome o código: para repetir, pedir outro. Ele termina com a conta usando `SENHA_NOVA`, então a senha anterior deixa de valer — é esse o ponto do fluxo. A conta usada tem que existir com esse e-mail, senão o primeiro fluxo passa igual — é o que a mensagem genérica garante — e nenhum e-mail chega.

Ele entra pelo esquema `rodabem://reset-password?token=...`, que é o que a tela espera. **O e-mail que o back envia hoje não usa esse esquema**: o link sai como `${APP_URL}/reset-password?token=...`, HTTP, que o aparelho abre no navegador e não no aplicativo. Por isso o caminho testado é o do código colado, e o link do e-mail fica como defeito registrado, não como passo de fluxo.
