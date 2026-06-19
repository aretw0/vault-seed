---
title: Verificando a Aparência do Site Publicado
aliases:
  - Checklist Visual do Site
  - Trilha Visual
tags:
  - meta/site
  - meta/qualidade
status: published
created: 2026-05-01
updated: 2026-06-15
category: guia
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[Verificando a Configuração do Vault]]"
sidebar:
  order: 92
---

# Verificando a Aparência do Site Publicado

Após publicar ou atualizar seu vault, vale confirmar que as principais áreas estão com boa aparência. Este roteiro leva menos de 10 minutos e cobre o que não é verificado automaticamente pelo CI.

---

## Antes de começar

O CI já verifica automaticamente:

- Build sem erros
- Páginas renderizadas e links internos funcionando
- Estrutura do grafo, sidebar e controles presentes
- Responsividade em 4 tamanhos de tela (screenshots no CI)

O que você precisa conferir manualmente é o que é **visual e perceptivo**: aparência real no celular, comportamento de toque e alinhamento.

---

## Checklist mínimo (desktop)

Abra seu site no Chrome ou Firefox e verifique:

- [ ] **Página inicial** carrega com o grafo visível e os nós distribuídos (não amontoados)
- [ ] **"Por onde começar"** → os cards mostram notas acessíveis (marcadas como `iniciante`) — não notas técnicas ou de configuração
- [ ] **Métricas** → strip com contagem de notas, palavras, conexões e tags aparece abaixo do lead
- [ ] **`/explorar/`** → o SVG do graph aparece preenchendo o espaço — não apenas espaço em branco
- [ ] **`/explorar/` em ≥ 1152px** → sidebar direita mostra um graph menor; toolbar (−/+/↻) visível
- [ ] **Arrastar um nó** → ao soltar, os nós vizinhos se afastam progressivamente (não ficam todos amontoados)
- [ ] **Zoom com scroll** → nós ficam dentro da borda do SVG, não "escapam" para fora
- [ ] **Botões da toolbar** (recolher, expandir, recentrar) → ícone SVG centrado no círculo, sem deslocamento vertical
- [ ] **Botões de sidebar** (recolher esquerda, recolher direita) → ícone SVG centrado no círculo
- [ ] **Footer — licença** → linha `© ano · nome [CC BY-SA 4.0]` aparece — este campo é sempre visível quando `vault.config.json` tem `license` preenchido
- [ ] **Footer — kudos** → pílula compacta aparece se `kudos` estiver configurado em `vault.config.json`; ausente se o campo foi removido (comportamento padrão do vault inicializado)

---

## Checklist mínimo (celular)

Abra no Safari iOS ou Chrome Android:

- [ ] **`/explorar/`** → graph preenche a largura da tela — não está encostado à esquerda nem com espaço branco excessivo
- [ ] **Arrastar um nó com o dedo** → responde ao toque; nós vizinhos se afastam ao soltar
- [ ] **Footer — licença** → linha de licença legível e sem quebra de layout
- [ ] **Footer — kudos** → se presente, o ♥ aparece como símbolo de texto preto/branco (não emoji colorido) e a pílula ocupa só a largura do conteúdo
- [ ] **Scroll horizontal** → não existe em nenhuma página (nenhum elemento "estica" a tela)

---

---

## Checklist do Lab (`/lab/`)

Abra `https://seu-usuario.github.io/seu-vault/lab/`:

- [ ] **Listagem de notebooks** → a página mostra os notebooks disponíveis (etl-demo, analise-feeds, analise-outbox, apresentações)
- [ ] **Abrir um notebook** → carrega sem "Failed to fetch" ou tela em branco (modo WASM, sem servidor)
- [ ] **Dados do vault** → as métricas no cabeçalho (contagem de notas, status) são do seu vault — não zero nem dados do vault-seed
- [ ] **Reatividade** → se houver filtros ou sliders, eles respondem ao clique
- [ ] **Tema** → o toggle escuro/claro funciona e o Lab segue o tema do site

Se o Lab mostrar dados desatualizados:

1. Rode `dgk etl` e `dgk lab export` localmente
2. Faça commit da pasta `public/lab/` atualizada
3. Faça push para `main` e espere o deploy

---

## Se algo não estiver correto

1. Verifique se o deploy terminou sem erros (aba Actions no GitHub)
2. Force-refresh a página (`Ctrl+Shift+R` no desktop, ou feche e reabra no celular)
3. Para problemas de dados no Lab, rode `dgk etl` e `dgk lab export` localmente, faça commit de `public/lab/` e push para `main`
4. Se o problema persistir, abra uma issue no repositório `aretw0/vault-seed` com uma screenshot
