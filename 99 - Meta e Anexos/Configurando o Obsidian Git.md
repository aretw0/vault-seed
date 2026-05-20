---
title: Configurando o Obsidian Git
aliases:
  - Setup Obsidian Git
  - Obsidian Git
tags:
  - obsidian/plugin
  - meta/git
  - meta/sincronizacao
status: published
created: 2026-05-18
updated: 2026-05-18
category: guia
audience: iniciante
related:
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Plugins Essenciais e Recomendados]]"
  - "[[Usando o Vault no Celular vs. Desktop]]"
---
# Configurando o Obsidian Git

Obsidian Git e o plugin que permite sincronizar o vault com Git sem sair do
Obsidian. Ele pode fazer pull, commit e push usando comandos dentro do app.

Use este guia depois que o repositorio ja estiver clonado no dispositivo.

## Antes de instalar

Confirme que:

- o vault ja esta em uma pasta clonada com Git;
- voce consegue abrir o vault no Obsidian;
- o repositorio remoto esta no GitHub, GitLab, Gitea ou Forgejo;
- voce sabe como autenticar: GitHub Desktop, Git Credential Manager, SSH ou PAT.

No Android, clone primeiro pelo Termux seguindo
[[Preparando seu Computador para o Vault#Android com Termux]].

## Instalar o plugin

1. Abra o Obsidian.
2. Va em **Settings > Community plugins**.
3. Desative **Restricted mode**, se ainda estiver ativo.
4. Clique em **Browse**.
5. Procure **Obsidian Git**.
6. Instale e ative o plugin.

## Configuracao inicial segura

Comece com sincronizacao manual. Isso reduz risco de conflitos enquanto voce
aprende o fluxo.

Configuracoes recomendadas para o primeiro dia:

- **Pull on startup:** ativado.
- **Auto pull interval:** desativado ou com intervalo conservador.
- **Commit-and-sync interval:** desativado no inicio.
- **Commit message:** `vault backup: {{date}}`.
- **Commit author:** use seu nome e email do Git, se o plugin pedir.

Depois que o fluxo estiver estavel, voce pode ativar commit-and-sync automatico
com intervalo maior, como 10 ou 15 minutos.

## Rotina diaria

Ao abrir o vault:

1. Rode `Obsidian Git: Pull`.
2. Escreva suas notas.
3. Ao terminar, rode `Obsidian Git: Commit-and-sync`.

Essa rotina faz:

```text
pull -> commit -> push
```

Ou seja: baixa mudancas novas, registra suas mudancas e envia para o remoto.

## Comandos que voce precisa conhecer

- `Obsidian Git: Pull`: baixa alteracoes do remoto.
- `Obsidian Git: Push`: envia commits locais para o remoto.
- `Obsidian Git: Commit all changes`: cria um commit com tudo que mudou.
- `Obsidian Git: Commit-and-sync`: faz commit e sincroniza.
- `Obsidian Git: Open source control view`: abre a visao de arquivos alterados,
  se disponivel na sua versao do plugin.

## Autenticacao

Se o plugin pedir usuario e senha, lembre-se: GitHub nao aceita mais a senha da
conta para Git via HTTPS.

Use uma destas opcoes:

- Git Credential Manager no desktop.
- Personal Access Token (PAT) no lugar da senha.
- SSH, se voce ja usa chaves SSH.

Para criar PAT no GitHub:
<https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

Prefira token fine-grained limitado ao repositorio do vault, com permissao de
leitura e escrita em Contents.

## Evitando conflitos

Regras simples:

- Nao edite a mesma nota em dois dispositivos ao mesmo tempo.
- Sempre faca pull ao abrir o vault.
- Sempre faca commit-and-sync antes de trocar de dispositivo.
- Se aparecer conflito, pare de escrever ate resolver.

Para resolver conflitos, geralmente e mais facil usar VS Code ou GitHub Desktop
no computador. No celular, evite resolver conflito grande.

## Quando nao usar Obsidian Git

Use GitHub Desktop em vez de Obsidian Git quando:

- voce ainda nao entende commits;
- precisa revisar muitas mudancas antes de enviar;
- apareceu conflito;
- voce vai renomear ou mover muitas notas de uma vez;
- esta fazendo manutencao tecnica no template.

Obsidian Git e excelente para rotina diaria de notas. Para mudancas grandes, uma
interface dedicada de Git da mais controle.

---
Voltar para o [[Guia do Jardineiro Digital]]
