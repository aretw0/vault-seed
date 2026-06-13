# Trilha: ETL e dados do Lab

> **Quando usar:** ao rodar `dgk etl` pela primeira vez, ao validar o pipeline após
> mudanças nos scripts ETL, ou como guia para entender o fluxo
> fontes → `dados/lab/` → notebooks → site.
>
> **Tempo estimado:** 10–15 min (trilha completa). Só smoke check: 2 min.
>
> **Pré-requisito:** `pnpm install` concluído. Para etapas que escrevem dados
> (`dgk etl`): `dados/fontes/feeds.opml` e `dados/fontes/lista-leitura.json` presentes.

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `buildPublicationOutbox` gera `items` com `id`, `title`, `channels` | `publication_outbox.test.mjs` |
| `isOutboxCandidate` filtra notas sem `outbox`, `publicationStatus` ou `channels` | `publication_outbox.test.mjs` |
| `collectedAt` do outbox usa `new Date(0)` quando `now` não é fornecido | `publication_outbox.test.mjs` |
| `sha256` do payload muda ao mudar qualquer item | `publication_outbox.test.mjs` |
| `stableTimestamp` preserva `collectedAt` quando dados não mudaram | `lab_etl_demo.test.mjs` (verificar se existe) |
| Nota sem `status: published` não entra no outbox | `publication_outbox.test.mjs` |

---

## Trilha A — Primeira execução

### A1. Rodar o ETL completo

```bash
dgk etl
```

O pipeline executa em sequência:

1. `lab_etl_demo.mjs` — indexa notas, gera perfil, grafo, lista de leitura
2. `prepare_feed_sources.mjs` — processa fontes de feed (OPML)
3. `prepare_publication_outbox.mjs` — monta a fila de publicação
4. `prepare_lab_datasets.mjs` — prepara datasets adicionais para notebooks

| # | O que verificar | Esperado |
|---|---|---|
| A1 | Saída no terminal sem `Error:` ou stack trace | Cada script imprime `✓` ou contagem de itens |
| A2 | `dados/lab/perfil-do-vault.json` criado | JSON com `noteCount`, `totalWords`, `folders` |
| A3 | `dados/lab/outbox-publicacao.json` criado | JSON com `items` (pode ser vazio se sem notas prontas) |
| A4 | `dados/lab/lista-leitura.json` criado | JSON com `itemCount` e `items` da `dados/fontes/lista-leitura.json` |
| A5 | `dados/lab/grafo-do-vault.json` criado | JSON com `noteCount` e `linkCount` |

**Verificação rápida dos arquivos gerados:**

```bash
node -e "
['perfil-do-vault','outbox-publicacao','lista-leitura','grafo-do-vault'].forEach(f=>{
  try {
    const d=require('./dados/lab/'+f+'.json');
    const key=d.noteCount??d.itemCount??d.items?.length??'ok';
    console.log('✓',f,'-',key)
  } catch(e) { console.log('✗',f,e.message) }
})"
```

Esperado: `✓` para todos.

---

### A2. Verificar o perfil do vault

```bash
node -e "const d=require('./dados/lab/perfil-do-vault.json'); console.log('notas:', d.noteCount, '| palavras:', d.totalWords, '| schema:', d.schemaVersion)"
```

| # | O que verificar | Esperado |
|---|---|---|
| P1 | `noteCount` > 0 | Vault não está vazio |
| P2 | `totalWords` razoável para o tamanho do vault | > 1000 para um vault com notas reais |
| P3 | `schemaVersion: 1` | Versão correta do schema |
| P4 | `collectedAt` presente e é ISO 8601 | `"2026-..."` — não é `"1970-..."` na primeira execução |

---

## Trilha B — Idempotência dos timestamps

Esta trilha verifica que rodar `dgk etl` duas vezes sem alterar notas não gera
diff no git — comportamento essencial para evitar ruído em histórico de commits.

### B1. Executar duas vezes e comparar

```bash
dgk etl
# anota o collectedAt do perfil:
node -e "console.log(require('./dados/lab/perfil-do-vault.json').collectedAt)"

# segunda execução imediata:
dgk etl
node -e "console.log(require('./dados/lab/perfil-do-vault.json').collectedAt)"
```

| # | O que verificar | Esperado |
|---|---|---|
| I1 | Os dois timestamps impressos são **iguais** | `stableTimestamp` preservou o valor — dados não mudaram |
| I2 | `git diff dados/lab/` está vazio após a segunda execução | Nenhuma mudança de arquivo |

**Por que manual:** o smoke determinístico não roda em sequência com modificação de notas;
a validade perceptiva da idempotência é mais fácil de verificar num terminal real.

---

### B2. Alterar uma nota e verificar que o timestamp avança

1. Abrir qualquer nota do vault e adicionar uma palavra qualquer.
2. Salvar.
3. Rodar `dgk etl` novamente.
4. Verificar `collectedAt` do `perfil-do-vault.json`.

| # | O que verificar | Esperado |
|---|---|---|
| I3 | `collectedAt` é mais recente do que na B1 | O timestamp avançou porque o conteúdo mudou |
| I4 | `noteCount` ou `totalWords` mudou | Confirma que a nota modificada foi capturada |

---

## Trilha C — Comportamento no vault do usuário (gitignore)

Esta trilha aplica-se a quem está avaliando o template como usuário
(vault criado via `initialize.yml` ou simulando esse estado).

### C1. Verificar que dados/lab/ está ignorado

```bash
git status dados/lab/
```

| # | O que verificar | Esperado |
|---|---|---|
| G1 | `git status` não lista arquivos em `dados/lab/` | Arquivos ignorados — não aparecem como `untracked` |
| G2 | `.gitignore` tem a regra `dados/lab/` | `grep "dados/lab" .gitignore` retorna a linha |

**Por que isso importa:** sem a regra, rodar `dgk etl` diariamente encheria o histórico
de commits com arquivos derivados — cada run seria um commit de build artifact.

---

### C2. Entender o que deve ir para o git no vault do usuário

| Diretório | Deve commitar? | Motivo |
|---|---|---|
| `dados/fontes/feeds.opml` | **Sim** | Fonte curada pelo usuário — é o vault em si |
| `dados/fontes/lista-leitura.json` | **Sim** | Idem |
| `dados/lab/*.json` | **Não** | Artefato regenerável com `dgk etl` |
| `dados/lab/.outbox-state.json` | **Sim** (opcional) | Estado de offset do outbox — perda implica republicação |

---

## Trilha D — Teto e migração

Use esta trilha quando suspeitar que o vault está crescendo além da faixa confortável para git.

### D1. Verificar tamanho atual dos dados

```bash
# Tamanho total de dados/lab/ em KB
du -sk dados/lab/
```

| # | Resultado | Ação recomendada |
|---|---|---|
| < 500 KB | Confortável | Continuar com JSON + git no template |
| 500 KB – 1 MB | Atenção | Monitorar; verificar se ETL roda em CI com frequência |
| > 1 MB | Migrar | Ver seção "Quando migrar além do git" em `docs/ARCHITECTURE.md` |

### D2. Smoke de sanidade dos datasets

```bash
node -e "
const path=require('node:path');
const files=['perfil-do-vault','outbox-publicacao','lista-leitura','grafo-do-vault','feeds-assinados'];
files.forEach(f=>{
  try {
    const d=JSON.parse(require('node:fs').readFileSync('dados/lab/'+f+'.json','utf8'));
    const bytes=JSON.stringify(d).length;
    console.log((bytes>500_000?'⚠':'✓'),f,Math.round(bytes/1024)+'KB');
  } catch(e){ console.log('–',f,'ausente (normal se ETL não rodou)') }
})"
```

Esperado: todos os arquivos presentes e com `✓` (< 500 KB cada).
`⚠` indica um arquivo crescendo além do esperado para o vault de exemplo.

---

## Smoke check rápido

```bash
dgk etl && node -e "
const d=require('./dados/lab/perfil-do-vault.json');
console.log('ETL OK — notas:', d.noteCount, '| palavras:', d.totalWords);
process.exit(d.noteCount > 0 ? 0 : 1)"
```

Esperado: mensagem `ETL OK` e exit code 0.

---

## Como reportar falhas

Criar issue com:
- Versão do Node (`node --version`) e do `dgk` (`dgk --version` ou `dgk --help`).
- Saída completa do `dgk etl` que falhou.
- Conteúdo de `dados/fontes/` (apenas nomes de arquivo, não conteúdo sensível).
- Se a falha é no primeiro script (`lab_etl_demo.mjs`) ou num dos seguintes, especificar qual.
