# Trilha: Editores (Obsidian e VS Code)

> **Quando usar:** ao configurar um vault novo, ao validar `dgk obsidian`/`dgk vscode` após
> mudanças no launcher, ou como guia de onboarding para usuários que estão abrindo o vault
> pela primeira vez num editor.
>
> **Tempo estimado:** 10–15 min (ambos os editores).
>
> **Pré-requisito:** `pnpm install` concluído. Ao menos um editor instalado
> (Obsidian e/ou VS Code com extensão Foam).

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `detectObsidian` retorna caminho correto por plataforma (macOS/Win/Linux) | `obsidian.test.js` |
| `openObsidian` usa URI scheme com vault name correto | `obsidian.test.js` |
| `obsidian --help` imprime ajuda sem tentar abrir | `obsidian.test.js` |
| `detectVSCode` detecta `code` no PATH | `vscode.test.js` |
| `openVSCode` invoca `code .` no cwd | `vscode.test.js` |
| `vscode --help` imprime ajuda sem tentar abrir | `vscode.test.js` |
| `vscode` com `code` não encontrado retorna exit 1 | `vscode.test.js` |
| `.vscode/settings.json` presente no template | `smoke_template.js` |

---

## Trilha A — Obsidian

### A1. Abrir o vault pelo CLI

```bash
dgk obsidian
```

| # | O que verificar | Esperado |
|---|---|---|
| O1 | Obsidian não instalado | Mensagem de erro com instrução de download por plataforma |
| O2 | Obsidian instalado, vault nunca aberto antes | Obsidian abre e pede para "Abrir pasta como vault" |
| O3 | Vault já registrado no Obsidian | Vault abre diretamente, sem prompt |
| O4 | `dgk obsidian --help` | Ajuda impressa; Obsidian não abre |

**Nome do vault** — verificar que corresponde ao nome da pasta raiz do projeto:

```bash
node -e "const p=require('./package.json'); console.log(p.name)"
```

---

### A2. Registrar o vault (primeira vez)

Após abrir, o Obsidian pede para registrar a pasta. Verificar:

| # | Ação | Esperado |
|---|---|---|
| R1 | Clicar "Open folder as vault" | Vault abre com estrutura PARA visível na sidebar esquerda |
| R2 | Navegar para `00 - Entrada/` | "Bem-vindo ao seu vault" aparece como nota existente |
| R3 | Navegar para `99 - Meta e Anexos/Notebooks/` | Notebooks `.py` visíveis mas sem preview (sem plugin Python) |
| R4 | Abrir `40 - Recursos/` | Notas aparecem como rascunhos — sem status `published` visível no título |

---

### A3. Criar uma nota (Obsidian CLI)

```bash
dgk note create "Minha Primeira Nota"
```

| # | O que verificar | Esperado |
|---|---|---|
| N1 | Nota criada em `00 - Entrada/` | Arquivo `.md` com frontmatter básico (title, status: draft) |
| N2 | No Obsidian, nota aparece em `00 - Entrada/` | Sem necessidade de reiniciar o app |
| N3 | `dgk note --help` | Subcomandos disponíveis listados |

---

### A4. Wikilinks e backlinks

Criar duas notas e linkar:

| # | Ação | Esperado |
|---|---|---|
| W1 | Digitar `[[` em qualquer nota | Autocomplete de notas existentes aparece |
| W2 | Selecionar uma nota pelo nome | Link `[[Nome da Nota]]` inserido |
| W3 | Abrir a nota linkada | Backlinks panel (`Ctrl+Shift+B`) mostra a nota de origem |

---

## Trilha B — VS Code com Foam

### B1. Abrir pelo CLI

```bash
dgk vscode
```

| # | O que verificar | Esperado |
|---|---|---|
| V1 | `code` não está no PATH | Mensagem de erro com instrução de instalação por plataforma |
| V2 | `code` disponível | VS Code abre na pasta raiz do vault |
| V3 | `dgk vscode --help` | Ajuda impressa; VS Code não abre |

Se `code` não estiver disponível no PATH após instalar o VS Code:
- **macOS:** `Cmd+Shift+P` → "Shell Command: Install 'code' command in PATH"
- **Windows:** reabrir o terminal após instalação (PATH atualizado)
- **Linux:** verificar que o pacote `.deb`/`.rpm` registrou o symlink

---

### B2. Verificar configurações do Foam

O arquivo `.vscode/settings.json` já está no vault com as configurações recomendadas.
VS Code aplica automaticamente ao abrir a pasta.

| # | O que verificar | Esperado |
|---|---|---|
| F1 | Extensão Foam instalada (`Ctrl+Shift+X` → buscar "Foam") | Badge de extensão instalada |
| F2 | Sidebar "Foam" visível no painel esquerdo | Ícone de folha/grafo na barra lateral |
| F3 | Foam Graph (painel lateral) renderiza | Grafo de notas do vault sem nós de `node_modules` |
| F4 | `Ctrl+Shift+P` → "Foam: Create New Note" | Nota criada em `00 - Entrada/` com template |

---

### B3. Verificar que Foam ignora as pastas corretas

Abrir a paleta de comandos e buscar `Foam: Show Graph`:

| # | O que verificar | Esperado |
|---|---|---|
| G1 | Nós no grafo | Apenas notas Markdown do vault (PARA folders) — sem entradas de `node_modules/` |
| G2 | `.obsidian/` não aparece no grafo | Pasta de config do Obsidian ignorada |
| G3 | `public/lab/` não aparece | Exports HTML ignorados |
| G4 | `dados/` não aparece | Datasets JSON ignorados (sem nós órfãos de JSON) |

**Verificação rápida** — confirmar o `.vscode/settings.json` tem `foam.files.ignore`:

```bash
node -e "const s=require('./.vscode/settings.json'); console.log('foam.files.ignore:', JSON.stringify(s['foam.files.ignore']))"
```

---

### B4. Wikilinks no VS Code

| # | Ação | Esperado |
|---|---|---|
| K1 | Digitar `[[` em qualquer `.md` | Autocomplete Foam aparece com títulos das notas |
| K2 | Selecionar nota | Link `[[nome-do-arquivo]]` inserido (sintaxe wikilink) |
| K3 | Hover sobre um wikilink existente | Preview da nota aparece inline |
| K4 | `Ctrl+Click` no wikilink | Navega para a nota destino |

---

### B5. Markdown e lint

| # | Ação | Esperado |
|---|---|---|
| L1 | Abrir qualquer nota de `40 - Recursos/` | Sem erros de markdownlint sublinhados |
| L2 | Adicionar linha sem espaço após `#` (ex: `#titulo`) | Markdownlint sublinha com MD018 |
| L3 | Word wrap ativo em arquivos `.md` | Linhas longas quebram visualmente sem `\n` real |

---

## Smoke check rápido

```bash
# Verificar que o launcher detecta o editor correto na plataforma
node --input-type=module << 'EOF'
import { detectObsidian } from './packages/cli/src/commands/obsidian.js';
import { detectVSCode } from './packages/cli/src/commands/vscode.js';
console.log('obsidian:', detectObsidian() ? 'encontrado' : 'não encontrado');
console.log('vscode:', detectVSCode() ? 'encontrado' : 'não encontrado');
EOF
```

Ou, mais simples — verificar via CLI diretamente:

```bash
dgk obsidian --help   # deve imprimir ajuda sem erro
dgk vscode --help     # deve imprimir ajuda sem erro
```

---

## Como reportar falhas

Criar issue com:
- Sistema operacional e versão (macOS 14.x / Windows 11 / Ubuntu 22.04).
- Versão do Obsidian ou VS Code.
- Saída completa de `dgk obsidian` ou `dgk vscode`.
- Se o editor está instalado em caminho não-padrão, informar o caminho.
- Screenshot do erro se for visual (grafo Foam com `node_modules` aparecendo, por exemplo).
