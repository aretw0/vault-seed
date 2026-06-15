---
title: Configurando o Obsidian Git
aliases:
  - Setup Obsidian Git
  - Obsidian Git
tags:
  - obsidian/plugin
  - meta/git
  - meta/sincronizacao
status: draft
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

Obsidian Git é o plugin que permite sincronizar o vault com Git sem sair do
Obsidian. Ele pode fazer pull, commit e push usando comandos dentro do app.

Use este guia depois que o repositório já estiver clonado no dispositivo.

## Antes de instalar

Confirme que:

- o vault já está em uma pasta clonada com Git;
- você consegue abrir o vault no Obsidian;
- o repositório remoto está no GitHub, GitLab, Gitea ou Forgejo;
- você sabe como autenticar: GitHub Desktop, Git Credential Manager, SSH ou PAT.

No Android, clone primeiro pelo Termux seguindo
[[Preparando seu Computador para o Vault#Android com Termux]].

## Instalar o plugin

1. Abra o Obsidian.
2. Vá em **Settings > Community plugins**.
3. Desative **Restricted mode**, se ainda estiver ativo.
4. Clique em **Browse**.
5. Procure **Obsidian Git**.
6. Instale e ative o plugin.

## Configuração inicial segura

Comece com sincronização manual. Isso reduz risco de conflitos enquanto você
aprende o fluxo.

Configurações recomendadas para o primeiro dia:

- **Pull on startup:** ativado.
- **Auto pull interval:** desativado ou com intervalo conservador.
- **Commit-and-sync interval:** desativado no início.
- **Commit message:** `vault backup: {{date}}`.
- **Commit author:** use seu nome e email do Git, se o plugin pedir.

Depois que o fluxo estiver estável, você pode ativar commit-and-sync automático
com intervalo maior, como 10 ou 15 minutos.

## Rotina diária

Ao abrir o vault:

1. Rode `Obsidian Git: Pull`.
2. Escreva suas notas.
3. Ao terminar, rode `Obsidian Git: Commit-and-sync`.

Essa rotina faz:

```text
pull -> commit -> push
```

Ou seja: baixa mudanças novas, registra suas mudanças e envia para o remoto.

## Comandos que você precisa conhecer

- `Obsidian Git: Pull`: baixa alterações do remoto.
- `Obsidian Git: Push`: envia commits locais para o remoto.
- `Obsidian Git: Commit all changes`: cria um commit com tudo que mudou.
- `Obsidian Git: Commit-and-sync`: faz commit e sincroniza.
- `Obsidian Git: Open source control view`: abre a visão de arquivos alterados,
  se disponível na sua versão do plugin.

## Autenticação

Se o plugin pedir usuário e senha, lembre-se: GitHub não aceita mais a senha da
conta para Git via HTTPS.

Use uma destas opções:

- Git Credential Manager no desktop.
- Personal Access Token (PAT) no lugar da senha.
- SSH, se você já usa chaves SSH.

Para criar PAT no GitHub:
<https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

Prefira token fine-grained limitado ao repositório do vault, com permissão de
leitura e escrita em Contents.

## Evitando conflitos

Regras simples:

- Não edite a mesma nota em dois dispositivos ao mesmo tempo.
- Sempre faça pull ao abrir o vault.
- Sempre faça commit-and-sync antes de trocar de dispositivo.
- Se aparecer conflito, pare de escrever até resolver.

Para resolver conflitos, geralmente é mais fácil usar VS Code ou GitHub Desktop
no computador. No celular, evite resolver conflito grande.

## Quando não usar Obsidian Git

Use GitHub Desktop em vez de Obsidian Git quando:

- você ainda não entende commits;
- precisa revisar muitas mudanças antes de enviar;
- apareceu conflito;
- você vai renomear ou mover muitas notas de uma vez;
- está fazendo manutenção técnica no template.

Obsidian Git é excelente para rotina diária de notas. Para mudanças grandes, uma
interface dedicada de Git dá mais controle.

---
Voltar para o [[Guia do Jardineiro Digital]]
