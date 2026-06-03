---
title: Verificando a Aparência do Site Publicado
tags: [publicação, site, verificação, mobile]
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
- [ ] **`/explorar/`** → o SVG do graph aparece preenchendo o espaço — não apenas espaço em branco
- [ ] **`/explorar/` em ≥ 1152px** → sidebar direita mostra um graph menor; toolbar (−/+/↻) visível
- [ ] **Arrastar um nó** → ao soltar, os nós vizinhos se afastam progressivamente (não ficam todos amontoados)
- [ ] **Zoom com scroll** → nós ficam dentro da borda do SVG, não "escapam" para fora
- [ ] **Botões da toolbar** (recolher, expandir, recentrar) → ícone SVG centrado no círculo, sem deslocamento vertical
- [ ] **Botões de sidebar** (recolher esquerda, recolher direita) → ícone SVG centrado no círculo
- [ ] **Footer** → texto de autoria ("Feito com ♥ por …") aparece centralizado como pílula compacta — sem quebra de layout

---

## Checklist mínimo (celular)

Abra no Safari iOS ou Chrome Android:

- [ ] **`/explorar/`** → graph preenche a largura da tela — não está encostado à esquerda nem com espaço branco excessivo
- [ ] **Arrastar um nó com o dedo** → responde ao toque; nós vizinhos se afastam ao soltar
- [ ] **Footer** → o ♥ aparece como símbolo de texto preto/branco, não como emoji colorido
- [ ] **Footer** → pílula de autoria ocupa só a largura do conteúdo — sem barra grossa ocupando a tela
- [ ] **Scroll horizontal** → não existe em nenhuma página (nenhum elemento "estica" a tela)

---

## Se algo não estiver correto

1. Verifique se o deploy terminou sem erros (aba Actions no GitHub)
2. Force-refresh a página (`Ctrl+Shift+R` no desktop, ou feche e reabra no celular)
3. Se o problema persistir, abra uma issue no repositório `aretw0/vault-seed` com uma screenshot
