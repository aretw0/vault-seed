# vault-seed

Esta "semente" (seed) de cofre (vault) com foco no Obsidian e Visual Studio Code (Foam), visa equilibrar estrutura e flexibilidade, permitindo que seu cofre de conhecimento cresça organicamente.

> Template original: [https://github.com/aretw0/vault-seed](https://github.com/aretw0/vault-seed)

## Pré-requisitos

- Git instalado no seu sistema ([https://git-scm.com/downloads](https://git-scm.com/downloads)).
- Conta no GitHub ([https://github.com/](https://github.com/)).
- A Obsidian ([https://obsidian.md/](https://obsidian.md/)) ou Visual Studio Code ([https://code.visualstudio.com/](https://code.visualstudio.com/)) instalados.

# 🚀 Primeiros Passos (Setup Inicial)

Este repositório é um template. Para começar seu próprio cofre de conhecimento a partir dele, siga os passos abaixo.

### 1. Crie seu Repositório a partir do Template

Clique no botão "Use this template" no topo da página do GitHub ou use este link: <a id="copy" href="https://github.com/new?template_name=vault-seed&template_owner=aretw0"><img src="https://img.shields.io/badge/📠_Criar_seu_cofre-008000" height="25pt"/></a>. Isso criará um novo repositório na sua conta com uma cópia limpa de todos os arquivos, mas **sem o histórico de desenvolvimento deste template**.

### 2. Clone seu Novo Repositório

Clone o repositório que **você acabou de criar** para a sua máquina local.

```bash
git clone https://github.com/SEU-USUARIO/NOME-DO-SEU-REPOSITORIO.git
```

### 3. Inicialize seu Cofre (Passo Crucial!)

Abra um terminal na pasta do seu novo repositório e execute o seguinte comando. Ele irá preparar seu cofre para um começo limpo, resetando o histórico de mudanças e a versão.

```bash
bash scripts/initialize_vault.sh
```

Este script irá:
- Limpar o arquivo `CHANGELOG.md`.
- Resetar a versão inicial para `0.0.1`.
- Criar um "commit de fundação" para seu novo histórico.
- Se auto-destruir após a execução.

### 4. Abra e Explore

Agora seu cofre está pronto! Abra a pasta no Obsidian ou Visual Studio Code.

➡️ Para começar sua jornada, abra a nota **`[[Guia do Jardineiro Digital]]`**.

---
## Traduções (Translations)

A língua principal deste projeto é o Português (Brasil). Contribuições que adicionem traduções da documentação para outros idiomas são bem-vindas. Por favor, veja o nosso [Guia de Contribuição](CONTRIBUTING.md) para mais detalhes.

*The main language of this project is Portuguese (Brazil). Contributions that add translations of the documentation into other languages are welcome. Please see our [Contribution Guide](CONTRIBUTING.md) for more details.*