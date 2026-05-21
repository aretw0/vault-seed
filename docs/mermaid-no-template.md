# Mermaid no Template

Este documento descreve como o suporte a Mermaid está implementado no vault-seed: o pipeline de renderização, a integração com o Expressive Code do Starlight, as restrições de sintaxe conhecidas e as ferramentas de validação disponíveis.

---

## Pipeline de renderização

O Mermaid é renderizado **no cliente**, após o carregamento da página. O fluxo é:

1. O Starlight processa o Markdown e o Expressive Code transforma blocos ` ```mermaid ` em `<figure><pre data-language="mermaid">...</pre></figure>`.
2. Um script inline carregado via `<script type="module">` importa o Mermaid do CDN:
   ```js
   import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
   ```
3. O script busca todos os `pre[data-language="mermaid"]` no DOM, extrai o código-fonte e chama `mermaid.render()`.
4. Se a renderização for bem-sucedida, o `<figure>` é substituído por um `<div class="mermaid-diagram">` contendo o SVG gerado.
5. Se falhar (erro de sintaxe ou SVG com mensagem de erro), o bloco de código original é mantido intacto — sem mensagem de erro visível para o usuário.

O script é re-disparado no evento `astro:page-load` para funcionar com View Transitions.

### Localização do script

O script inline está definido em `astro.config.mjs` como constante `mermaidScript` e injetado via:

```js
starlight({
  head: [
    { tag: 'script', attrs: { type: 'module' }, content: mermaidScript },
  ],
})
```

---

## Detecção de erro de renderização

O Mermaid v11 pode retornar um SVG de erro em vez de lançar uma exceção. O script detecta isso verificando o texto do SVG:

```js
if (svg.includes('Syntax error') || svg.includes('error in text')) {
  console.warn('[mermaid] syntax error in diagram — leaving code block intact');
  continue;
}
```

Isso evita que a mensagem de erro `Syntax error in textmermaid version X.Y.Z` apareça na página como texto.

---

## Botões de cópia

Quando o Mermaid substitui o `<figure>` gerado pelo Expressive Code, o botão de cópia padrão do EC é perdido. O script adiciona um grupo com dois botões:

- **"Copiar fonte"** — copia o código Mermaid bruto (útil para editar ou reutilizar)
- **"Copiar SVG"** — copia o `outerHTML` do `<svg>` renderizado (útil para colar em ferramentas externas)

```js
const btnGroup = document.createElement('div');
btnGroup.className = 'mermaid-btn-group';

const btn = document.createElement('button');
btn.className = 'mermaid-copy-btn';
btn.textContent = 'Copiar fonte';
btn.addEventListener('click', () => {
  navigator.clipboard.writeText(source).then(() => {
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = 'Copiar fonte'; }, 2000);
  });
});
btnGroup.appendChild(btn);

const svgBtn = document.createElement('button');
svgBtn.className = 'mermaid-copy-btn';
svgBtn.textContent = 'Copiar SVG';
svgBtn.addEventListener('click', () => {
  const svgEl = container.querySelector('svg');
  navigator.clipboard.writeText(svgEl?.outerHTML ?? '').then(() => {
    svgBtn.textContent = 'Copiado!';
    setTimeout(() => { svgBtn.textContent = 'Copiar SVG'; }, 2000);
  });
});
btnGroup.appendChild(svgBtn);

container.appendChild(btnGroup);
```

O grupo aparece ao passar o mouse sobre o diagrama. Os estilos estão em `.site/styles/custom.css` sob `.mermaid-diagram`, `.mermaid-btn-group` e `.mermaid-copy-btn`. A opacidade é controlada em `.mermaid-btn-group` (não nos botões individuais) para evitar duplicação de regras.

---

## Tema claro/escuro

O script lê `document.documentElement.dataset.theme` para escolher entre o tema `'dark'` e `'neutral'` do Mermaid:

```js
const dark = document.documentElement.dataset.theme === 'dark';
mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral' });
```

O tema não muda dinamicamente quando o usuário alterna — a página precisa ser recarregada ou revisitada. Isso é uma limitação da abordagem atual de inicialização única por `page-load`.

---

## Restrições de sintaxe conhecidas

O Mermaid v11 usa o parser Chevrotain, que é mais restrito do que versões anteriores. Padrões que funcionam no plugin do Obsidian podem falhar no CDN:

### 1. IDs de nó não-ASCII (flowchart/graph)

IDs de nó precisam seguir `/^[a-zA-Z_][a-zA-Z0-9_-]*$/`. Labels visuais podem conter qualquer texto se estiverem entre aspas.

```
%% ✓
A["Organização"] --> B["Revisão"]

%% ✗ — "Organização" usado como ID
Organização --> Revisão
```

### 2. Emoji em labels não-quotados

Emoji são caracteres suplementares (codepoints > U+FFFF) codificados como pares substitutos em JavaScript. O lexer do Mermaid v11 falha ao processá-los fora de strings delimitadas.

```
%% ✓
KW1("📝 Usar Templates"):::action

%% ✗
KW1(📝 Usar Templates):::action
```

### 3. Wikilinks em labels de aresta

A sequência `[[` tem significado especial no lexer do Mermaid. Mesmo dentro de strings entre aspas, `[[Nota]]` pode causar falha de parse.

```
%% ✓
A -- "ver documentação" --> B

%% ✗
A -- "ver [[Nota]]" --> B
```

### 4. IDs de estado não-ASCII em stateDiagram-v2

Use o padrão alias para separar o label visual do ID:

```
state "Concluído" as Concluido
Ativo --> Concluido
```

### 5. Labels não-quotados com `/` em `()`

O caractere `/` pode ser interpretado como delimitador de forma do paralelogramo:

```
%% ✓
Start("Nova Informação / Ideia")

%% ✗
Start(Nova Informação / Ideia)
```

### 6. Valores de `classDef` não podem conter espaços

O parser de `classDef` usa espaço como separador de tokens. Qualquer valor com espaço interno — como `stroke-dasharray:5 5` — encerra o token prematuramente e corrompem **todo o diagrama** que usa aquela classe, não apenas o nó afetado.

```
%% ✓
classDef principle fill:#fde0dc,stroke:#980000,stroke-dasharray:5

%% ✗ — o diagrama inteiro falha silenciosamente
classDef principle fill:#fde0dc,stroke:#980000,stroke-dasharray:5 5
```

Este foi o bug raiz que impedia todos os diagramas que usavam `:::principle` de renderizar. O Mermaid não emite erro explícito — o diagrama simplesmente não aparece.

---

## Validação determinística

O script `scripts/check_mermaid.js` verifica todos os blocos Mermaid nas pastas do vault (00–99) antes do build. Ele detecta os padrões acima sem precisar de um navegador ou do Playwright:

```bash
pnpm run validate:mermaid
```

O script é incluído no pipeline `pnpm run validate`. Ele reporta por arquivo, bloco e número de linha.

Para verificar se os templates de diagrama estão sincronizados com os arquivos alvo:

```bash
pnpm run diagrams:check
```

---

## Relação com o mdt_cli

O `mdt_cli` (comando `mdt`) é uma ferramenta separada, escrita em Rust, para sincronizar **templates de diagrama** com arquivos alvo. Ela NÃO faz renderização — apenas garante que o código Mermaid nos arquivos alvo está atualizado em relação aos templates.

- Templates ficam em `99 - Meta e Anexos/Diagramas/.templates/` e `docs/diagrams/.templates/`
- Arquivos alvo usam marcadores `<!-- {=nome} -->` e `<!-- {/nome} -->`
- Atualizar: `pnpm run diagrams:update`
- Verificar sincronismo (usado no CI): `pnpm run diagrams:check`

O `mdt_cli` precisa ser instalado separadamente — ver `docs/compatibilidade-de-ambiente-e-setup.md`.

---

## Verificação no smoke test

O `scripts/smoke_site.js` executa duas verificações relacionadas a Mermaid após o build:

**CDN script presente no `<head>`** (seção 6c): garante que a injeção via `head[]` no `astro.config.mjs` não foi perdida.

```js
mocHtml.includes("mermaid.esm.min.mjs")
```

**Blocos mermaid presentes nas páginas de diagrama** (seção 7): para cada página conhecida por conter diagramas, verifica que `data-language="mermaid"` existe no HTML estático. Isso confirma que os blocos sobreviveram ao pipeline remark/Expressive Code e estarão disponíveis para o renderizador cliente.

```js
pageHtml.includes('data-language="mermaid"')
```

Páginas verificadas: `recursos/mermaid`, `meta-e-anexos/diagramas/exemplos`, `meta-e-anexos/visualizacao-do-fluxo-do-vault`.

Essa verificação é estática — não requer navegador. Ela detecta regressões no pipeline de build (bloco perdido antes do JS rodar), mas **não verifica a renderização SVG em si**, que só é possível com um navegador headless (ex: Playwright), ainda não adicionado ao projeto.

---

## Arquivos relevantes

| Arquivo | Papel |
|:--------|:------|
| `astro.config.mjs` | Constante `mermaidScript` com a lógica de render, botões e injeção no `<head>` |
| `.site/styles/custom.css` | Estilos de `.mermaid-diagram`, `.mermaid-btn-group` e `.mermaid-copy-btn` |
| `scripts/check_mermaid.js` | Validador de sintaxe pré-build (sem navegador) |
| `scripts/smoke_site.js` | Verificação pós-build: CDN script e blocos mermaid por página |
| `99 - Meta e Anexos/Diagramas/.templates/` | Templates de diagrama do vault |
| `docs/diagrams/.templates/` | Templates de diagrama da documentação técnica |
