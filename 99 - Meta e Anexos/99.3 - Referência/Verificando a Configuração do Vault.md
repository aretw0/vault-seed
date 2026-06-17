---
title: Verificando a Configuração do Vault
aliases:
  - Trilha de Configuração
  - Checklist de Configuração
tags:
  - meta/site
  - meta/qualidade
status: published
created: 2026-06-15
updated: 2026-06-15
category: guia
audience: todos
related:
  - "[[Verificando a Aparencia do Site Publicado]]"
  - "[[Depois da Recepcao do Template]]"
  - "[[Publicando seu Vault como Site]]"
sidebar:
  order: 93
---

# Verificando a Configuração do Vault

Este roteiro cobre o que o CI não verifica automaticamente: se os campos de
configuração do vault estão preenchidos corretamente antes de publicar.
Leva menos de 5 minutos e evita que o site público mostre dados do template
no lugar dos seus.

---

## Antes de começar

O CI já verifica automaticamente:

- Build sem erros e todas as páginas geradas
- Links internos funcionando
- `vault.config.json` com JSON válido
- Sidebar com seções preenchidas

O que você precisa conferir é o que é **semântico**: os valores nos campos
refletem você e o seu vault, não o vault-seed de exemplo.

---

## Trilha 1 — Identidade e Licença

Abra `vault.config.json` na raiz do repositório.

```json
{
  "license": {
    "type": "CC BY-SA 4.0",
    "holder": "Seu Nome"
  },
  "kudos": "Feito com ♥"
}
```

- [ ] `holder` está com o **seu nome ou apelido** — não `aretw0`
- [ ] `type` declara a licença que você escolheu para o seu conteúdo

  | Opção | Uso |
  |---|---|
  | `CC BY 4.0` | Qualquer uso com atribuição |
  | `CC BY-SA 4.0` | Uso com atribuição + mesma licença |
  | `CC BY-NC 4.0` | Uso não-comercial com atribuição |
  | `CC0` | Domínio público |

- [ ] `kudos` contém uma mensagem pessoal sua — ou o campo está **ausente** se você prefere só a linha de licença no footer

  Para remover o kudos, delete a linha ou defina `"kudos": null`.

Abra o site publicado e confirme:

- [ ] Footer mostra `© ano · Seu Nome [CC BY-SA 4.0]`
- [ ] Pílula kudos aparece (se configurada) ou está ausente (se removida)

---

## Trilha 2 — Sidebar e Navegação

Navegue pelas seções da sidebar e verifique se as notas aparecem nos lugares certos:

- [ ] **Começar** → mostra notas acessíveis para iniciantes (Bem-vindo, Visão Geral, Convenções…)
- [ ] **Organizar** → mostra métodos PKM, links, tags e MOCs
- [ ] **Explorar** → mostra Lab, notebooks, diagramas
- [ ] **Publicar** → mostra fluxo de publicação, RSS, outbox, identidade visual do site
- [ ] **Automatizar** → mostra agentes, inbox soberana, automações no Obsidian
- [ ] **Manter** → mostra Git, sync, plugins, qualidade

Se uma nota aparecer na seção errada, verifique as `tags` no frontmatter dela e compare com as regras de `information-architecture.json`.

---

## Trilha 3 — Notas Publicadas vs. Rascunho

No Obsidian ou VS Code, abra qualquer nota que você **não** quer no site público e confirme que tem `status: draft` no frontmatter.

- [ ] Notas pessoais ou em rascunho têm `status: draft`
- [ ] Notas que você quer publicar têm `status: published`
O CI verifica estrutura e wiki links (`pnpm run validate`), mas o status individual de cada nota é uma decisão sua — revise o frontmatter das notas novas antes de cada push.

---

## Trilha 4 — Após Publicar

Depois do deploy no GitHub Pages:

- [ ] Abra `https://seu-usuario.github.io/seu-vault/` — página inicial carrega
- [ ] `/explorar/` carrega com o grafo das suas notas
- [ ] `/rss.xml` existe e tem itens (suas notas publicadas)
- [ ] Footer mostra seus dados, não os do vault-seed de exemplo

Se algo estiver fora, consulte [[Verificando a Aparencia do Site Publicado]] para o checklist visual completo.

---

## Trilha 5 — Lab publicado

Abra `https://seu-usuario.github.io/seu-vault/lab/` após o deploy:

- [ ] A página `/lab/` carrega sem erro
- [ ] Pelo menos os notebooks padrão estão listados: `etl-demo`, `analise-feeds`, `analise-outbox`
- [ ] Abrir um notebook: botão "Abrir" visível e funcional — só aparece após `dgk lab export` ter sido rodado e os HTMLs incluídos no deploy; antes do export, os notebooks mostram "Aguardando exportação"
- [ ] Os dados são do vault — não dados de exemplo do vault-seed

Para verificar localmente antes do deploy:

```bash
dgk etl
dgk lab export
```

- [ ] `public/lab/etl-demo.html` existe depois do export
- [ ] O HTML abre no navegador sem erros de rede

---

## Trilha 6 — Outbox e canais

Verifique se o pipeline de outbox está operacional:

```bash
dgk check
```

- [ ] Canais configurados aparecem com `✓` (ex: `✓ Telegram`)
- [ ] Canais não configurados aparecem com `○` e a instrução `dgk sow <canal>`

Rode o ETL e confirme que o dataset da outbox é gerado:

```bash
dgk etl
```

- [ ] `.dgk/outbox-publicacao.json` existe

Para o passo a passo de uma publicação real, consulte [[Trilha de Publicação em Canal]].
