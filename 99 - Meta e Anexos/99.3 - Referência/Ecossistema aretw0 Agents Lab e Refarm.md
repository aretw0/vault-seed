---
title: Ecossistema aretw0, Agents Lab e Refarm
aliases:
  - Ecossistema aretw0
  - Agents Lab e Refarm
status: draft
created: 2026-05-26
updated: 2026-05-26
tags:
  - meta/ecossistema
  - meta/ia
  - meta/workflow
category: referencia
audience: tecnico
related:
  - "[[Conhecendo o Agents Lab]]"
  - "[[Usando com Agentes de IA]]"
  - "[[Inbox Soberana de Fontes]]"
---

# Ecossistema aretw0, Agents Lab e Refarm

O `vault-seed` é o primeiro produto de uma jornada maior: transformar práticas
de computação, tecnologia da informação, agentes e jardinagem digital em uma
base local-first, auditável e reaproveitável.

Ele se relaciona com outros projetos do ecossistema, mas não depende deles para
funcionar.

## Papel Do Vault Seed

O `vault-seed` é a base inicial para uma pessoa ou time organizar conhecimento,
publicar um jardim digital, preparar dados e operar com agentes por arquivos,
terminal, Git e validações.

Ele deve permanecer utilizável por um público amplo: pessoas técnicas,
jardineiros digitais, pesquisadores, equipes pequenas e usuários que querem
controle operacional sem virar mantenedores de plataforma.

## Papel Do Agents Lab

O `agents-lab` é laboratório de capacidades de agentes. Quando uma rotina fica
repetível — por exemplo transformar item de feed em nota candidata, revisar
diffs ou operar notebooks Marimo — ela pode amadurecer lá antes de virar
contrato no `vault-seed`.

No `vault-seed`, a fronteira continua simples:

- agente lê e escreve arquivos;
- humano revisa diff;
- validações locais rodam antes de publicar;
- integrações mais profundas são opcionais.

## Papel Do Refarm

O `refarm` é tratado como referência de operações e automações mais amplas do
ecossistema. Ele pode inspirar padrões de orquestração, ambientes e governança,
mas não deve virar requisito para usar este vault.

Se uma capacidade nascer fora daqui, ela só entra no `vault-seed` quando puder
ser explicada como arquivo, comando, documentação ou contrato verificável.

## Regra De Integração

Uma integração do ecossistema só é bem-vinda quando preserva estes limites:

1. o vault continua funcionando sem o outro repositório;
2. o usuário final não precisa conhecer caminhos locais do mantenedor;
3. o dado produzido tem proveniência;
4. o agente nunca publica sem revisão;
5. `pnpm run validate` continua sendo a régua canônica.

Assim, o ecossistema pode crescer sem transformar o vault em uma caixa-preta.
