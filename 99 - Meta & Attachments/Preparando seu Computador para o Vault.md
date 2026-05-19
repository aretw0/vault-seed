---
title: Preparando seu Computador para o Vault
aliases:
  - Setup do Computador
  - Preparando o Ambiente
  - Checklist de Instalação
tags:
  - meta/setup
  - meta/git
  - iniciante
status: published
created: 2026-05-18
updated: 2026-05-18
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
  - "[[Usando o Vault no Celular vs. Desktop]]"
  - "[[Configurando o Obsidian Git]]"
  - "[[Plugins Essenciais e Recomendados]]"
  - "[[Obsidian]]"
  - "[[VS Code]]"
---
# Preparando seu Computador para o Vault

Este guia prepara um computador para operar um vault versionado com Git sem
transformar o primeiro dia em uma aula de infraestrutura. A ordem importa:
primeiro instale as ferramentas de escrita, depois as ferramentas de
sincronizacao.

## Ordem recomendada

1. Instale o [[Obsidian]].
2. Instale o [[VS Code]].
3. Instale o Git.
4. Instale o GitHub Desktop.
5. Abra o vault no Obsidian.
6. Configure sincronizacao com GitHub Desktop ou com o plugin Obsidian Git.

Essa ordem reduz atrito: primeiro voce garante que consegue ler e escrever
notas; depois adiciona versionamento, backup e sincronizacao.

## Instalando o Git no Windows

Baixe o Git em <https://git-scm.com/downloads>.

Durante a instalacao, use estas escolhas:

- **Default branch name:** escolha `main`.
- **Default editor:** escolha Visual Studio Code.
- **PATH:** escolha a opcao que permite usar Git pela linha de comando e por
  outros programas.
- **Unix tools no Windows:** quando o instalador oferecer a opcao de adicionar
  ferramentas Unix ao ambiente do Windows, marque essa opcao se voce quer usar
  comandos como `bash`, `ssh`, `grep` e `sed` tambem fora do Git Bash.

Se estiver em duvida em telas que nao reconhece, mantenha o padrao do
instalador. As escolhas acima sao as que mais afetam o dia a dia do vault.

## Instalando o GitHub Desktop

Baixe em <https://desktop.github.com/>.

Use o GitHub Desktop se voce quer sincronizar sem decorar comandos. Ele resolve
a maior parte do fluxo iniciante:

- clonar o repositorio;
- ver arquivos alterados;
- escrever uma mensagem de commit;
- fazer push e pull;
- perceber quando ha conflito.

Para usuarios iniciantes, GitHub Desktop e o caminho recomendado no desktop. O
terminal continua util para manutencao, mas nao precisa ser o primeiro contato.

## GitHub, GitLab ou Gitea

Este vault funciona com qualquer servidor Git:

- **GitHub:** melhor caminho para quem quer usar GitHub Desktop e Actions.
- **GitLab:** bom para repositorios privados e CI integrado.
- **Gitea/Forgejo:** bom para hospedagem propria ou ambientes pequenos.

As ideias sao as mesmas: clone, commit, pull e push. O que muda e a tela do
servico e o metodo de autenticacao.

## Autenticacao e PAT

GitHub nao aceita mais senha da conta como senha de Git por HTTPS. Use uma das
opcoes abaixo:

- **GitHub Desktop:** recomendado para iniciantes; ele autentica pela propria
  interface.
- **Git Credential Manager:** instalado junto com o Git para Windows; salva a
  autenticacao de forma segura.
- **Personal Access Token (PAT):** use quando uma ferramenta pedir token em vez
  de abrir login no navegador.

Para criar um PAT no GitHub, use a documentacao oficial:
<https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

Para um vault privado, prefira um token fine-grained limitado ao repositorio do
vault, com permissao de leitura e escrita em Contents. Trate o token como senha:
nao cole em notas, nao versione em Git e nao envie para assistentes de IA.

## Usando Git Bash

Git Bash e um terminal instalado junto com o Git para Windows. Ele oferece uma
experiencia parecida com Linux/macOS para comandos simples.

Comandos uteis:

```bash
git status
git pull
git add .
git commit -m "docs: atualiza nota de projeto"
git push
```

Se voce usa GitHub Desktop ou Obsidian Git, nao precisa rodar esses comandos no
dia a dia. Eles sao importantes para entender o que as ferramentas estao fazendo
por baixo.

## Android com Termux

Termux permite ter um terminal Linux no Android. Com ele, voce pode clonar o
repositorio do vault no armazenamento do celular e depois abrir essa pasta pelo
Obsidian. A partir dai, o plugin Obsidian Git pode assumir a rotina de pull,
commit e push.

Instale o Termux preferencialmente pelo F-Droid:
<https://f-droid.org/packages/com.termux/>

Evite a versao antiga da Play Store, que costuma ficar desatualizada.

### Preparar o Termux

Abra o Termux e rode:

```bash
pkg update
pkg upgrade
pkg install git openssh
termux-setup-storage
```

O Android vai pedir permissao para o Termux acessar arquivos. Aceite. Depois
disso, o Termux cria atalhos como `~/storage/shared`, que aponta para o
armazenamento compartilhado do celular.

### Clonar o vault

Escolha uma pasta facil de encontrar pelo Obsidian:

```bash
cd ~/storage/shared/Documents
git clone https://github.com/SEU-USUARIO/NOME-DO-SEU-REPOSITORIO.git
```

Se voce usa GitLab, Gitea ou Forgejo, troque a URL pelo endereco HTTPS do seu
repositorio.

### Abrir no Obsidian Android

1. Abra o Obsidian no Android.
2. Escolha **Open folder as vault**.
3. Navegue ate `Documents/NOME-DO-SEU-REPOSITORIO`.
4. Abra a pasta clonada como vault.

Depois instale e configure o plugin **Obsidian Git** seguindo
[[Configurando o Obsidian Git]]. A rotina fica:

1. Ao abrir o vault: `Obsidian Git: Pull`.
2. Escreva suas notas.
3. Ao terminar: `Obsidian Git: Commit-and-sync`.

### Autenticacao no Android

Se o Obsidian Git ou o Git no Termux pedir usuario e senha, use um Personal
Access Token (PAT) no lugar da senha. Veja a secao "Autenticacao e PAT" acima.

Para reduzir atrito, voce tambem pode configurar SSH no Termux, mas HTTPS com
PAT costuma ser mais simples para o primeiro setup.

### Cuidados no celular

- Sempre rode pull antes de editar no celular.
- Sempre rode commit-and-sync antes de voltar para o desktop.
- Evite editar a mesma nota aberta no celular e no computador ao mesmo tempo.
- Se aparecer conflito, resolva no desktop com VS Code ou GitHub Desktop.

## Regra de ouro para evitar conflito

Em todo dispositivo:

1. Antes de escrever: sincronize com pull.
2. Depois de escrever: salve, commit e push.
3. Nao edite a mesma nota em dois dispositivos antes de sincronizar.
4. Se algo parecer estranho, pare e veja `git status` ou abra o GitHub Desktop.

Essa rotina simples evita a maioria dos conflitos entre desktop, notebook e
celular.

---
Voltar para o [[Guia do Jardineiro Digital]]
