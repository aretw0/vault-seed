---
title: Usando o Git e o GitHub para Sincronizar seu Vault
aliases:
  - Sincronização Git
  - GitHub para Vault
  - Obsidian Git
tags:
  - meta/git
  - meta/github
  - meta/workflow
status: draft
created: 2023-10-27
updated: 2026-05-18
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Configurando o Obsidian Git]]"
  - "[[Usando o Vault no Celular vs. Desktop]]"
  - "[[Plugins Essenciais e Recomendados]]"
  - "[[O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)]]"
---
# Usando o Git e o GitHub para Sincronizar seu Vault

Este vault foi pensado para usar Git como histórico e backup. GitHub é o caminho
mais simples para começar, mas a mesma ideia funciona em GitLab, Gitea ou
Forgejo.

Se você está começando agora, use este caminho:

1. Configure o computador com [[Preparando seu Computador para o Vault]].
2. Use GitHub Desktop para clonar e sincronizar.
3. Use Obsidian para escrever.
4. Quando estiver confortável, instale Obsidian Git se quiser sincronizar sem
   sair do Obsidian. Veja [[Configurando o Obsidian Git]].

## O que cada ferramenta faz?

- **Git:** guarda o histórico do vault.
- **GitHub/GitLab/Gitea:** guarda uma cópia remota do repositório.
- **GitHub Desktop:** interface visual para pull, commit e push.
- **Obsidian Git:** plugin que faz pull, commit e push dentro do Obsidian.
- **VS Code:** bom para revisar mudanças, resolver conflitos e editar vários
  arquivos.

## Fluxo simples com GitHub Desktop

Use este fluxo quando quiser máxima previsibilidade:

1. Abra o GitHub Desktop.
2. Clique em **Fetch origin** ou **Pull origin** antes de escrever.
3. Abra o vault no Obsidian e escreva normalmente.
4. Volte ao GitHub Desktop.
5. Revise os arquivos alterados.
6. Escreva uma mensagem curta de commit.
7. Clique em **Commit to main**.
8. Clique em **Push origin**.

Mensagem de commit simples:

```text
docs: atualiza notas de leitura
```

Para a maioria dos vaults, esse fluxo já resolve o essencial.

## Fluxo usando só Obsidian Git

Obsidian Git é uma boa opção quando você quer escrever e sincronizar no mesmo
aplicativo.

Para instalar e configurar o plugin, siga [[Configurando o Obsidian Git]].

Rotina recomendada dentro do Obsidian:

1. Ao abrir: rode `Obsidian Git: Pull`.
2. Escreva suas notas.
3. Antes de fechar: rode `Obsidian Git: Commit-and-sync`.

Se aparecer conflito, pare de editar e resolva pelo GitHub Desktop ou VS Code.
Conflito não é desastre; é apenas o Git avisando que a mesma parte de um arquivo
foi alterada em dois lugares.

## Autenticação com PAT

Algumas ferramentas pedem um Personal Access Token (PAT) em vez de abrir login
no navegador. No GitHub, crie o token pela documentação oficial:

<https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

Para um vault privado, prefira um token fine-grained limitado ao repositório do
vault, com permissão de leitura e escrita em Contents.

Cuidados:

- trate o token como senha;
- não cole o token em notas;
- não coloque token em `AGENTS.md`;
- não envie token para assistentes de IA;
- revogue o token se ele aparecer em algum lugar público.

## Evitando conflitos entre dispositivos

A regra principal é simples:

```text
pull antes de escrever, push quando terminar
```

Use esta rotina em todo dispositivo:

1. Antes de editar: sincronize.
2. Edite.
3. Salve.
4. Commit.
5. Push.

Evite estes padrões:

- editar a mesma nota no desktop e no notebook antes de sincronizar;
- deixar o Obsidian aberto em dois dispositivos alterando notas ao mesmo tempo;
- usar Dropbox/Google Drive e Git na mesma pasta do vault sem entender os
  conflitos entre sincronizadores;
- versionar `.obsidian/plugins/` inteiro.

Este vault já ignora os arquivos mais problemáticos de plugins. A lista de
plugins ativados pode ser versionada; os arquivos baixados dos plugins devem ser
instalados localmente em cada dispositivo.

## Branch e Pull Request

Para vaults simples, `main` pode ser a branch principal.
Quando quiser testar mudanças grandes, crie um "Rascunho Seguro" (branch).

- **Branch:** cópia de trabalho para experimentar.
- **Pull Request:** proposta para revisar antes de juntar ao `main`.

Pull Requests são úteis para mudanças grandes em qualquer vault:
renomear muitas notas, reorganizar pastas ou alterar templates.

## Quando usar terminal?

Use terminal quando precisar diagnosticar ou resolver algo fora da interface.

Comandos básicos:

```bash
git status
git pull
git add .
git commit -m "docs: atualiza vault"
git push
```

Se você usa GitHub Desktop ou Obsidian Git, esses comandos são a camada de
emergência e aprendizado, não uma obrigação diária.

## Próximos passos

- Para preparar o computador: [[Preparando seu Computador para o Vault]]
- Para configurar o plugin: [[Configurando o Obsidian Git]]
- Para entender desktop e celular: [[Usando o Vault no Celular vs. Desktop]]
- Para plugins: [[Plugins Essenciais e Recomendados]]

---
Voltar para o [[Guia do Jardineiro Digital]]
