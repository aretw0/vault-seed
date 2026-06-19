# Roteiro de Teste Manual — vault-seed (completo)

> **Quando usar:** antes de merges em `main`, após mudanças em CSS de layout, VaultGraphView, marimo-vault.css, Footer ou PageFrame.
> **Pré-requisito:** `pnpm run validate` e `pnpm run site:graph-smoke` passando.
> **Ambientes obrigatórios:** Chrome desktop + Safari iOS (ou BrowserStack). Firefox desktop é opcional.

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `overflow: hidden` no canvas SVG | `site_ux_contract.test.js` |
| `aspect-ratio: 1/1` no canvas | `site_ux_contract.test.js` |
| `margin-inline: auto` no sidebar graph | `site_ux_contract.test.js` |
| Settle usa relaxação global (`null` focus) | `site_ux_contract.test.js` |
| `font-variant-emoji: text` nos footers | `site_ux_contract.test.js` |
| Fontes alinhadas entre Astro e Marimo footer | `site_ux_contract.test.js` |
| Expand/collapse/recenter/zoom/pan existem no DOM | `site_ux_contract.test.js` + `graph_interactions_smoke.mjs` |
| Sidebar collapse state (left/right) | `site_ux_contract.test.js` |
| Responsividade (4 viewports, 10 páginas) — screenshots | `smoke_responsive.mjs` |
| `dgk preview` flags (--lab, --network, --port) | `packages/cli/test/preview.test.js` |
| Nós dentro do viewBox após drag/zoom (coordenadas) | `graph_interactions_smoke.mjs` |
| Marimo shell topbar + content gap | `lab_shell_contract.test.mjs` |
| Skip link presente e com CSS de foco (WCAG 2.4.1) | `site_ux_contract.test.js` |
| `<link rel="license">` no head de todas as páginas | `site_ux_contract.test.js` |
| `"license": "GPL-3.0-only"` em todos os `package.json` | `site_ux_contract.test.js` |
| `NOTICE.md` com camadas de licença e SPDX | `site_ux_contract.test.js` |

---

## Seção 1 — Grafo (Graph View)

### 1.1 Mobile — centralização e tamanho

**Dispositivos:** iPhone SE (375px), iPhone Pro Max (430px), Android genérico (360px).
**URL:** `/explorar/`

| # | Ação | Esperado |
|---|------|----------|
| M1 | Rolar até a seção "Graph leve" | SVG preenche a largura disponível — sem espaço vazio à esquerda |
| M2 | Sem interação | Nós aparecem distribuídos ao redor do centro do SVG, não aglomerados em um canto |
| M3 | Verificar sidebar lateral (se visível) | Graph sidebar centralizado, não encostado à esquerda |

**Por que manual:** rendering SVG + layout CSS em Safari iOS difere de emuladores; centralização perceptível só no dispositivo real.

---

### 1.2 Mobile — touch e gesto

**Dispositivos:** mesmos de 1.1.

| # | Ação | Esperado |
|---|------|----------|
| T1 | Tocar e arrastar o fundo do SVG | Viewport pan ocorre com o dedo; nós se movem junto |
| T2 | Arrastar um nó específico | Só o nó segue o dedo; ao soltar, nós vizinhos se afastam |
| T3 | Após arrastar nó para cima de outros | Nós clustered se dispersam progressivamente (settle global) — sem amontoamento permanente |
| T4 | Zoom com pinch (dois dedos) | Graph amplia/reduz; nós não saem da caixa do SVG |
| T5 | Zoom máximo e arrastar | Nós ficam clipados pela borda do SVG — nenhum nó "flutua" fora do retângulo |

**Por que manual:** `touch-action: none` e pointer events são simulados em Playwright mas pinch-to-zoom real, velocidade de inércia e comportamento de scroll conflict são device-specific.

---

### 1.3 Desktop — contenção visual

**Viewport:** 1440×900 Chrome.

| # | Ação | Esperado |
|---|------|----------|
| D1 | Zoom com scroll até o máximo (MAX_SCALE 3.2×) | Nós continuam dentro do retângulo do SVG — sem nó visível fora da borda |
| D2 | Pan até o limite com mouse | Nenhum nó desaparece completamente; pelo menos um nó sempre visível |
| D3 | Duplo clique no SVG | Viewport volta ao centro (recenter) |
| D4 | Arrastar um nó para dentro de um cluster | Ao soltar, os nós do cluster se afastam progressivamente (settle global ativo) |
| D5 | Arrastar vários nós em sequência rápida | Grafo mantém distribuição razoável; sem colapso de todos os nós em um ponto |

---

### 1.4 Desktop — primeiro graph da /explorar/ visível

**Viewport:** 1440×900 Chrome. **URL:** `/explorar/`

| # | Ação | Esperado |
|---|------|----------|
| G1 | Rolar para o topo da página sem interagir | O graph "Graph leve" ocupa seu espaço visual — nenhum espaço branco onde deveria estar o SVG |
| G2 | Inspecionar no DevTools | O `<svg class="vault-graph-view__canvas">` tem `overflow: hidden`; nenhum nó filho está fora dos 200×200 do viewBox |

**Por que manual:** `overflow: hidden` num SVG dentro de `position: fixed; overflow-y: auto` depende da composição de camadas do browser — o smoke testa coordenadas mas não a renderização visual.

---

### 1.5 Sidebar graph (desktop ≥ 72rem)

**URL:** `/explorar/` em largura ≥ 1152px.

| # | Ação | Esperado |
|---|------|----------|
| S1 | Verificar graph visível sem scroll | O graph menor aparece na sidebar — não é espaço branco |
| S2 | Verificar centramento dos ícones | O ícone SVG do rail toggle está no centro do círculo; os ícones da toolbar (recolher, expandir, recentrar) também estão no centro dos seus respectivos círculos |
| S3 | Clicar no rail toggle › para colapsar sidebar direita | Graph sidebar some; main content expande |
| S4 | Reabrir sidebar direita | Graph sidebar reaparece centralizado |

**Por que manual:** alinhamento vertical depende de box model computado que varia com font rendering e zoom do browser.

---

## Seção 2 — Footer

### 2.1 Mobile — sem expansão de layout

**Dispositivos:** mesmos de 1.1. **URL:** qualquer página publicada.

| # | Ação | Esperado |
|---|------|----------|
| F1 | Rolar até o footer | Texto de autoria aparece centralizado como pílula compacta — sem scroll horizontal na página |
| F2 | Inspecionar o ♥ | Renderiza como glifo de texto (preto/branco), não como emoji colorido |
| F3 | Comparar tamanho de fonte | Visualmente igual ao footer do Lab Marimo na mesma página ou em `/lab/` |

**Por que manual:** `font-variant-emoji: text` é honrada diferentemente por versões de iOS Safari; emoji fallback é visual e não tem API de inspeção automatizada.

---

## Seção 3 — Botões (alinhamento visual)

**Viewport:** 1440×900 e 375×812.

| # | Elemento | O que verificar |
|---|----------|----------------|
| B1 | Graph toolbar (recolher, expandir, recentrar) | O ícone SVG de cada botão está visualmente centrado no círculo — sem deslocamento vertical ou horizontal |
| B2 | Rail toggle esquerdo (sidebar nav, desktop) | O ícone SVG está centrado no círculo |
| B3 | Rail toggle direito (sidebar TOC/graph, desktop) | O ícone SVG está centrado no círculo |
| B4 | Lab sidebar toggle (Marimo, desktop) | O ícone está centrado, consistente com os toggles do Astro |
| B5 | Mobile — toolbar do graph | O ícone SVG de cada botão está centrado; área de toque ≥ 44px |

**Por que manual:** `display: grid; place-items: center` centra geometricamente, mas o SVG viewBox pode introduzir padding óptico dependendo do ícone Lucide — o olho percebe deslocamento que DevTools não reporta como erro.

---

## Seção 4 — Temas visuais

**URLs:** `/` e `/explorar/` em cada tema.

| # | Tema | O que verificar |
|---|------|----------------|
| V1 | verde-jardim (padrão) | Grafo com acento verde; footer texto legível no dark e no light |
| V2 | oceano | Grafo com acento azul; sem artefatos de cor no SVG |
| V3 | terracota | Grafo com acento laranja; footer texto legível |
| V4 | Dark ↔ Light toggle | Grafo muda de cor suavemente; sem flash de cor errada |

**Por que manual:** validação de paleta é perceptiva; screenshot comparison requer baseline por tema.

---

## Seção 5 — Regressão rápida pós-deploy

Checar em 5 minutos após deploy:

| # | URL | Verificar |
|---|-----|-----------|
| R1 | `/` | Hero renderiza; graph SVG visível |
| R2 | `/` | Lista de notas recentes em monospace abaixo do hero |
| R3 | `/` | Tag cloud e seção de capacidades ao final |
| R4 | `/explorar/` | Filtros funcionam; graph responde a expand/collapse |
| R5 | `/explorar/` + hover em nó | Rótulos de nós não relacionados somem; vizinhos permanecem |
| R6 | `/lab/` | Sidebar marimo; footer visível; sem JS error no console |
| R7 | `/explorar/` mobile 390px | Graph não está colado à esquerda |
| R8 | `/explorar/` mobile + segurar nó | Nenhum popup do browser aparece |
| R9 | `/explorar/` + arrastar nó | Nós vizinhos se afastam ao soltar |

---

## Seção 6 — Docs técnicas (mantenedor)

> Esta seção aplica-se apenas ao ambiente do mantenedor onde `docs/INDEX.md` existe.
> No vault do usuário `docs/` é removido pelo `initialize.yml` — a seção não aparece.

```bash
pnpm run site:dev   # ou site:build + site:preview
```

### 6.1 Seção de docs técnicas no sidebar

| # | O que verificar | Esperado |
|---|---|---|
| T1 | Sidebar tem grupo "Documentação Técnica" | Aparece abaixo das notas do vault |
| T2 | `docs/ARCHITECTURE.md` listado | Página acessível via `/docs/architecture/` |
| T3 | `docs/diagrams/ECOSYSTEM.md` listado | Página acessível com diagrama Mermaid renderizado |
| T4 | Arquivos `.t.md` de templates NÃO aparecem | `para-structure.t.md`, `vault-flow.t.md`, `dgk-ecosystem.t.md` ausentes do sidebar |
| T5 | `docs/INDEX.md` é a raiz `/docs/` | Página de índice carrega com links para os outros docs |

---

### 6.2 Diagramas Mermaid nos docs

| # | URL | O que verificar |
|---|---|---|
| D1 | `/docs/diagrams/ecosystem/` | Diagrama de camadas renderiza (vault-seed, agents-lab, refarm, instâncias) |
| D2 | `/docs/architecture/` | Bloco `{=dgk-ecosystem}` renderiza o mesmo diagrama |
| D3 | Zoom no diagrama | Subgraphs visíveis e legíveis; sem overflow de texto |

**Por que manual:** Mermaid no Astro/Starlight depende do script de inicialização injetado no
`<head>` — o smoke `validate:mermaid` valida a sintaxe mas não o rendering visual no browser.

---

### 6.3 Links internos dos docs

| # | O que verificar | Esperado |
|---|---|---|
| L1 | Link `ROADMAP.md` em `docs/INDEX.md` removido | Não há link quebrado para `roadmap.md` |
| L2 | Links em `docs/ARCHITECTURE.md` para `diagrams/ECOSYSTEM.md` | Navegação funciona |
| L3 | Links em `ROADMAP.md` para `docs/ARCHITECTURE.md` | Navegação funciona |

---

## Seção 7 — ETL e ciclo de dados (mantenedor + usuário avançado)

> Cobre o pipeline `dgk etl`, idempotência de timestamps e comportamento
> de `dados/lab/` no git. Aplica-se ao mantenedor e a usuários que querem
> entender o fluxo de dados.

Ver trilha detalhada: [`roteiro-teste-etl.md`](roteiro-teste-etl.md)

Smoke de sanidade rápido para incluir no checklist pré-release:

```bash
dgk etl && node -e "
const d=require('./dados/lab/perfil-do-vault.json');
process.exit(d.noteCount > 0 ? 0 : 1)" && echo "ETL OK"
```

| # | O que verificar | Esperado |
|---|---|---|
| ET1 | ETL completa sem erro | Nenhum `Error:` na saída |
| ET2 | `dados/lab/` ignorado no vault do usuário | `git status dados/lab/` vazio após `initialize.yml` |
| ET3 | Segunda execução sem mudança de notas | Timestamps idênticos (`collectedAt` não avançou) |

---

## Seção 8 — Homepage (redesign cassidoo-style)

> Cobre a homepage após o redesign: lista de notas recentes em fonte monospace,
> seção de capacidades, tag cloud e grafo hero.

### 8.1 Desktop — estrutura e legibilidade

**Viewport:** 1280×900 Chrome. **URL:** `/`

| # | O que verificar | Esperado |
|---|---|---|
| H1 | Hero acima da dobra | Grafo SVG visível à direita; título e tagline à esquerda |
| H2 | Seção "Notas recentes" | Lista em fonte monospace; título sublinhado + data em itálico + `#tags` |
| H3 | Sem parágrafos de excerpts | Apenas título, data e tags por item — sem bloco de texto truncado |
| H4 | Datas no formato `25 de mai. de 2026` | Localização pt-BR aplicada |
| H5 | Seção "Ver por tag" | Pills de tags clicáveis; clique abre `/explorar/` com filtro pré-selecionado |
| H6 | "Assine via RSS" | Link aponta para `/rss.xml`; clique abre o feed |
| H7 | Seção "O que este vault oferece" | Lista com `→` bullets; cada item é link para a doc correspondente |
| H8 | Nota mais recente aparece no topo | Ordenação por `updated` desc, depois `created` |

---

### 8.2 Mobile — lista de notas e responsividade

**Dispositivo:** iPhone Pro (390×844, DPR 3). **URL:** `/`

| # | O que verificar | Esperado |
|---|---|---|
| M1 | Grafo hero visível sem scroll | SVG ocupa a largura da tela; rótulos legíveis |
| M2 | Lista de notas abaixo do hero | Fonte monospace renderizada; título nunca ultrapassa a largura da tela |
| M3 | Tags por nota | Pills em linha; quebra de linha natural quando não cabem |
| M4 | Tag cloud "Ver por tag" | Pills centralizada; sem overflow horizontal |
| M5 | Seção de capacidades | `→` bullets com links funcionando; sem quebra de layout |

---

### 8.3 Vault sem notas publicadas (estado vazio)

> Simular removendo temporariamente o `status: published` de todas as notas,
> ou criando uma instância de vault zerada.

| # | O que verificar | Esperado |
|---|---|---|
| E1 | Página carrega sem erro | Sem `undefined`, `null` ou JS error no console |
| E2 | Mensagem de estado vazio | Texto orientando a marcar notas com `status: published` |
| E3 | Seção de capacidades presente | Ainda visível mesmo sem notas |
| E4 | Seção de tags ausente | Não renderiza se não há tags (array vazio) |

**Por que manual:** estado vazio só acontece no vault do usuário novo — a demo do template sempre tem notas publicadas.

---

## Seção 9 — Grafo: comportamento de hover e mobile

### 9.1 Desktop — foco de labels durante hover

**Viewport:** 1280×900 Chrome. **URL:** `/` ou `/explorar/`

| # | Ação | Esperado |
|---|------|----------|
| G1 | Passar o mouse sobre um nó | Rótulo completo aparece na hover-layer; rótulo curto do próprio nó desaparece |
| G2 | Nós vizinhos (com aresta direta) | Rótulos **permanecem visíveis**; círculos ficam mais saturados |
| G3 | Nós não relacionados | Rótulos **desaparecem** (opacity 0); círculos ficam com opacity 0.45 |
| G4 | Tirar o mouse do nó | Todos os rótulos voltam suavemente (transição 120ms) |
| G5 | Foco via teclado (Tab) | Mesmo comportamento do mouse; nenhuma regressão de acessibilidade |

---

### 9.2 Mobile — long-press nos nós do grafo

**Dispositivo:** iOS Safari (iPhone qualquer) ou Chrome Android.

| # | Ação | Esperado |
|---|------|----------|
| LP1 | Toque curto em um nó | Navega para a nota |
| LP2 | Segurar um nó por 1 segundo+ | **Nenhum** popup do browser ("Open in New Tab", "Copy Link", etc.) |
| LP3 | Segurar o fundo do SVG | Nenhum popup; inicia pan se arrastar |
| LP4 | Toque em link normal fora do grafo | Popup do browser aparece normalmente (comportamento padrão preservado) |

**Por que manual:** `-webkit-touch-callout: none` é CSS mas só verificável em dispositivo iOS real; Android usa mecanismo diferente (menos problemático).

---

## Seção 10 — `dgk preview` (command)

> Cobre o comando `dgk preview` que substitui os scripts `site:dev:lab:host`
> para usuários do template.

### 10.1 Preview básico (só o site)

```bash
dgk preview
```

| # | O que verificar | Esperado |
|---|---|---|
| P1 | Servidor inicia | Mensagem `astro dev` na saída; URL exibida (padrão `http://localhost:4321/`) |
| P2 | Browser abre em `localhost:4321` | Homepage carrega; grafo hero visível |
| P3 | Sem notebooks exportados | Não roda `export_notebooks.mjs` antes de iniciar |
| P4 | `Ctrl+C` encerra | Terminal volta ao prompt; porta liberada |

---

### 10.2 Preview com Lab

```bash
dgk preview --lab
```

| # | O que verificar | Esperado |
|---|---|---|
| L1 | Mensagem de exportação | `[dgk] Exportando notebooks antes do preview...` aparece antes do Astro |
| L2 | Notebooks exportados antes | `public/lab/` atualizado antes do servidor subir |
| L3 | Astro sobe em seguida | Mesmo comportamento de P1 |
| L4 | `/lab/` no browser | Notebooks WASM acessíveis; sem erro de "arquivo não encontrado" |

---

### 10.3 Preview na rede local

```bash
dgk preview --network
```
ou
```bash
dgk preview --lab --network
```

| # | O que verificar | Esperado |
|---|---|---|
| N1 | Astro escuta em `0.0.0.0` | Saída mostra URL de rede local além de `localhost` |
| N2 | Acesso de outro dispositivo na rede | `http://<IP-local>:4321/` abre no celular (mesmo Wi-Fi) |
| N3 | `--lab --network` combinados | Export acontece antes; site acessível na rede **com** notebooks |

---

### 10.4 Porta customizada

```bash
dgk preview --port 8080
```

| # | O que verificar | Esperado |
|---|---|---|
| C1 | Servidor sobe na porta informada | Saída mostra `localhost:8080` |
| C2 | Porta padrão 4321 não usada | `localhost:4321` dá connection refused |

---

### 10.5 Help e comparação com scripts npm

| Cenário | Comando usuário (`dgk`) | Script npm equivalente (dev) |
|---|---|---|
| Só o site | `dgk preview` | `pnpm run site:dev` |
| Site + lab | `dgk preview --lab` | `pnpm run site:dev:lab` |
| Site + lab + LAN | `dgk preview --lab --network` | `pnpm run site:dev:lab:host` |
| Admin panel | `dgk serve` | — |
| Notebook específico | `dgk lab analise-feeds` | — |

**Por que o `dgk preview` existe:** a cadeia `site:dev:lab:host` não é autodescritiva para
quem não conhece o projeto. `dgk preview --lab --network` declara o que acontece e é
componível — cada flag é independente.

---

## Como reportar falhas

Criar issue com:
- URL exata
- Dispositivo / browser / versão
- Screenshot ou screen recording
- O que estava esperado vs. o que aconteceu
- Se `pnpm run validate` está passando
