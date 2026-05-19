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
status: published
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

Este vault foi pensado para usar Git como historico e backup. GitHub e o caminho
mais simples para comecar, mas a mesma ideia funciona em GitLab, Gitea ou
Forgejo.

Se voce esta comecando agora, use este caminho:

1. Configure o computador com [[Preparando seu Computador para o Vault]].
2. Use GitHub Desktop para clonar e sincronizar.
3. Use Obsidian para escrever.
4. Quando estiver confortavel, instale Obsidian Git se quiser sincronizar sem
   sair do Obsidian. Veja [[Configurando o Obsidian Git]].

## O que cada ferramenta faz?

- **Git:** guarda o historico do vault.
- **GitHub/GitLab/Gitea:** guarda uma copia remota do repositorio.
- **GitHub Desktop:** interface visual para pull, commit e push.
- **Obsidian Git:** plugin que faz pull, commit e push dentro do Obsidian.
- **VS Code:** bom para revisar mudancas, resolver conflitos e editar varios
  arquivos.

## Fluxo simples com GitHub Desktop

Use este fluxo quando quiser maxima previsibilidade:

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

Para um vault pessoal, esse fluxo ja resolve o essencial.

## Fluxo usando so Obsidian Git

Obsidian Git e uma boa opcao quando voce quer escrever e sincronizar no mesmo
aplicativo.

Para instalar e configurar o plugin, siga [[Configurando o Obsidian Git]].

Rotina recomendada dentro do Obsidian:

1. Ao abrir: rode `Obsidian Git: Pull`.
2. Escreva suas notas.
3. Antes de fechar: rode `Obsidian Git: Commit-and-sync`.

Se aparecer conflito, pare de editar e resolva pelo GitHub Desktop ou VS Code.
Conflito nao e desastre; e apenas o Git avisando que a mesma parte de um arquivo
foi alterada em dois lugares.

## Autenticacao com PAT

Algumas ferramentas pedem um Personal Access Token (PAT) em vez de abrir login
no navegador. No GitHub, crie o token pela documentacao oficial:

<https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

Para um vault privado, prefira um token fine-grained limitado ao repositorio do
vault, com permissao de leitura e escrita em Contents.

Cuidados:

- trate o token como senha;
- nao cole o token em notas;
- nao coloque token em `AGENTS.md`;
- nao envie token para assistentes de IA;
- revogue o token se ele aparecer em algum lugar publico.

## Evitando conflitos entre dispositivos

A regra principal e simples:

```text
pull antes de escrever, push quando terminar
```

Use esta rotina em todo dispositivo:

1. Antes de editar: sincronize.
2. Edite.
3. Salve.
4. Commit.
5. Push.

Evite estes padroes:

- editar a mesma nota no desktop e no notebook antes de sincronizar;
- deixar o Obsidian aberto em dois dispositivos alterando notas ao mesmo tempo;
- usar Dropbox/Google Drive e Git na mesma pasta do vault sem entender os
  conflitos entre sincronizadores;
- versionar `.obsidian/plugins/` inteiro.

O template ja ignora os arquivos mais problemáticos de plugins. A lista de
plugins ativados pode ser versionada; os arquivos baixados dos plugins devem ser
instalados localmente em cada dispositivo.

## Branch e Pull Request

Para usuario iniciante, `main` pode ser a branch principal do vault pessoal.
Quando voce quiser testar mudancas grandes, crie um "Rascunho Seguro" (branch).

- **Branch:** copia de trabalho para experimentar.
- **Pull Request:** proposta para revisar antes de juntar ao `main`.

Mesmo em um vault pessoal, Pull Requests sao uteis para mudancas grandes:
renomear muitas notas, reorganizar pastas ou alterar templates.

## Quando usar terminal?

Use terminal quando precisar diagnosticar ou resolver algo fora da interface.

Comandos basicos:

```bash
git status
git pull
git add .
git commit -m "docs: atualiza vault"
git push
```

Se voce usa GitHub Desktop ou Obsidian Git, esses comandos sao a camada de
emergencia e aprendizado, nao uma obrigacao diaria.

## Proximos passos

- Para preparar o computador: [[Preparando seu Computador para o Vault]]
- Para configurar o plugin: [[Configurando o Obsidian Git]]
- Para entender desktop e celular: [[Usando o Vault no Celular vs. Desktop]]
- Para plugins: [[Plugins Essenciais e Recomendados]]

---
Voltar para o [[Guia do Jardineiro Digital]]
