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
sidebar:
  order: 6
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

Este guia ajuda você a escolher o caminho de setup certo e a configurar
seu computador para operar o vault com Git.

## Qual caminho é pra mim?

| Quero... | Caminho recomendado |
| --- | --- |
| Usar só o Obsidian, sem terminal | Instale o Obsidian e abra esta pasta |
| VS Code + scripts (fnm, uv) | [[Configurando Localmente]] |
| Devcontainer (VS Code + Docker) | [[Configurando com Devcontainer]] |
| Usar com agentes de IA | [[Usando com Agentes de IA]] |

Qualquer caminho exige Git e uma conta no GitHub, GitLab ou serviço similar.
Continue lendo para instalar o Git e configurar autenticação.

## Instalando o Git no Windows

Baixe o Git em <https://git-scm.com/downloads>.

Durante a instalação, use estas escolhas:

- **Default branch name:** escolha `main`.
- **Default editor:** escolha Visual Studio Code.
- **PATH:** escolha a opção que permite usar Git pela linha de comando e por
  outros programas.
- **Unix tools no Windows:** quando o instalador oferecer a opção de adicionar
  ferramentas Unix ao ambiente do Windows, marque essa opção se você quer usar
  comandos como `bash`, `ssh`, `grep` e `sed` também fora do Git Bash.

Se estiver em dúvida em telas que não reconhece, mantenha o padrão do
instalador. As escolhas acima são as que mais afetam o dia a dia do vault.

## Instalando o GitHub Desktop

Baixe em <https://desktop.github.com/>.

Use o GitHub Desktop se você quer sincronizar sem decorar comandos. Ele resolve
a maior parte do fluxo iniciante:

- clonar o repositório;
- ver arquivos alterados;
- escrever uma mensagem de commit;
- fazer push e pull;
- perceber quando há conflito.

Para usuários iniciantes, GitHub Desktop é o caminho recomendado no desktop. O
terminal continua útil para manutenção, mas não precisa ser o primeiro contato.

## GitHub, GitLab ou Gitea

Este vault funciona com qualquer servidor Git:

- **GitHub:** melhor caminho para quem quer usar GitHub Desktop e Actions.
- **GitLab:** bom para repositórios privados e CI integrado.
- **Gitea/Forgejo:** bom para hospedagem própria ou ambientes pequenos.

As ideias são as mesmas: clone, commit, pull e push. O que muda é a tela do
serviço e o método de autenticação.

## Autenticação e PAT

GitHub não aceita mais senha da conta como senha de Git por HTTPS. Use uma das
opções abaixo:

- **GitHub Desktop:** recomendado para iniciantes; ele autentica pela própria
  interface.
- **Git Credential Manager:** instalado junto com o Git para Windows; salva a
  autenticação de forma segura.
- **Personal Access Token (PAT):** use quando uma ferramenta pedir token em vez
  de abrir login no navegador.

Para criar um PAT no GitHub, use a documentação oficial:
<https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

Para um vault privado, prefira um token fine-grained limitado ao repositório do
vault, com permissão de leitura e escrita em Contents. Trate o token como senha:
não cole em notas, não versione em Git e não envie para assistentes de IA.

## Usando Git Bash

Git Bash é um terminal instalado junto com o Git para Windows. Ele oferece uma
experiência parecida com Linux/macOS para comandos simples.

Comandos úteis:

```bash
git status
git pull
git add .
git commit -m "docs: atualiza nota de projeto"
git push
```

Se você usa GitHub Desktop ou Obsidian Git, não precisa rodar esses comandos no
dia a dia. Eles são importantes para entender o que as ferramentas estão fazendo
por baixo.

## Android com Termux

Termux permite ter um terminal Linux no Android. Com ele, você pode clonar o
repositório do vault no armazenamento do celular e depois abrir essa pasta pelo
Obsidian. A partir daí, o plugin Obsidian Git pode assumir a rotina de pull,
commit e push.

Instale o Termux preferencialmente pelo F-Droid:
<https://f-droid.org/packages/com.termux/>

Evite a versão antiga da Play Store, que costuma ficar desatualizada.

### Preparar o Termux

Abra o Termux e rode:

```bash
pkg update
pkg upgrade
pkg install git openssh
termux-setup-storage
```

O Android vai pedir permissão para o Termux acessar arquivos. Aceite. Depois
disso, o Termux cria atalhos como `~/storage/shared`, que aponta para o
armazenamento compartilhado do celular.

### Clonar o vault

Escolha uma pasta fácil de encontrar pelo Obsidian:

```bash
cd ~/storage/shared/Documents
git clone https://github.com/SEU-USUARIO/NOME-DO-SEU-REPOSITORIO.git
```

Se você usa GitLab, Gitea ou Forgejo, troque a URL pelo endereço HTTPS do seu
repositório.

### Abrir no Obsidian Android

1. Abra o Obsidian no Android.
2. Escolha **Open folder as vault**.
3. Navegue até `Documents/NOME-DO-SEU-REPOSITORIO`.
4. Abra a pasta clonada como vault.

Depois instale e configure o plugin **Obsidian Git** seguindo
[[Configurando o Obsidian Git]]. A rotina fica:

1. Ao abrir o vault: `Obsidian Git: Pull`.
2. Escreva suas notas.
3. Ao terminar: `Obsidian Git: Commit-and-sync`.

### Autenticação no Android

Se o Obsidian Git ou o Git no Termux pedir usuário e senha, use um Personal
Access Token (PAT) no lugar da senha. Veja a seção "Autenticação e PAT" acima.

Para reduzir atrito, você também pode configurar SSH no Termux, mas HTTPS com
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
3. Não edite a mesma nota em dois dispositivos antes de sincronizar.
4. Se algo parecer estranho, pare e veja `git status` ou abra o GitHub Desktop.

Essa rotina simples evita a maioria dos conflitos entre desktop, notebook e
celular.

---
Voltar para o [[Guia do Jardineiro Digital]]
