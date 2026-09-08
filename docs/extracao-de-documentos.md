# Extração de documentos financeiros

Quatro extratores em Python que leem PDFs de documentos financeiros comuns
(extrato de benefício, extrato bancário, fatura de cartão, contracheque) e
devolvem uma **prévia determinística**, sem aplicar nem gravar nada. Nenhum
deles decide o que fazer com o dado extraído — essa decisão é de quem chama.

Vieram do [coop-vault](https://github.com/aretw0/coop-vault) (ou o fork que
você estiver usando como vault pessoal), onde amadureceram contra documentos
reais: cada heurística de layout documentada aqui foi encontrada lendo um PDF
de verdade, não inventada a partir do enunciado de uma especificação.

## O que cada extrator lê

| Script | Lê | Classe do envelope |
| --- | --- | --- |
| `scripts/finance/parse_pluxee_statement.py` | Extrato de benefício Pluxee (carteira Alimentação ou Refeição) | `extrato-pluxee` |
| `scripts/finance/parse_sicoob_statement.py` | Extrato de conta corrente Sicoob | `extrato-sicoob` |
| `scripts/finance/parse_card_invoice.py` | Fatura de cartão Santander (layout de duas colunas) | `fatura-cartao` |
| `scripts/income/parse_payslip.py` | Contracheque (layout com tabelas Proventos/Descontos) | `contracheque` |

Cada um é específico ao layout de um emissor real — como o Sicoob lê o nome
da cooperativa da própria linha `COOP.:` do documento (não de uma tabela
fixa no código), um extrato de outra cooperativa no mesmo layout Sicoob deve
funcionar sem alteração. Já `parse_payslip.py` não presume QUEM é o
empregador: o texto do empregador é um argumento obrigatório (`--empregador`
na CLI, `empregador=` em `parse_text`/`parse`) — o layout (rótulos, tabelas,
bloco de totais) é genérico, o nome do empregador não é.

Todos os quatro dependem de `scripts/documents/pdf_text.py` para a leitura
seletiva do PDF: `pdftotext`/`pdfinfo` do poppler, rodados com timeout,
`setrlimit` no processo filho, limite de tamanho e de páginas, e recusa de
symlink. Nenhum dos quatro lê um PDF sem passar por essa camada.

## Uso

```bash
pnpm run pluxee:preview -- caminho/para/extrato.pdf --json
pnpm run sicoob:preview -- caminho/para/extrato.pdf --json
pnpm run fatura:preview -- caminho/para/fatura.pdf --json
pnpm run payslip:preview -- caminho/para/contracheque.pdf --empregador "NOME DO EMPREGADOR" --json
```

Sem `--json`, cada CLI imprime um relatório humano de uma tela. Com
`--json`, imprime o envelope completo. Em nenhum dos dois casos qualquer
arquivo é escrito ou modificado — "preview" é literal.

## O contrato que todos emitem, e de onde ele vem

Os quatro emitem o mesmo envelope, `documento-extraido/v1`: um objeto com
`schemaVersion`, `classe`, `fonte` (hash, tamanho, páginas, quando foi
extraído), `lancamentos` e `avisos`, e campos específicos por classe
(`totais`, `emissor`, `competencia`, `sinais_privacidade`) conforme o schema
exigir.

Esse contrato **não vive neste repositório**. A autoridade é o pacote
`@refarm.dev/document-extraction-contract-v1`, vendorizado em `vendor/` como
os demais pacotes `@refarm.dev/*` que o vault-seed já consome — um tarball
`.tgz`, referenciado em `package.json` como `file:vendor/...tgz`. Depois de
`pnpm install`, o pacote fica disponível em
`node_modules/@refarm.dev/document-extraction-contract-v1/`, com três
subpastas:

- `schema/documento-extraido-v1.json` — o JSON Schema, a autoridade real;
- `fixtures/conformance.json` — fixtures de conformidade compartilhadas
  entre o validador TypeScript (no refarm) e o validador Python (aqui);
- `python/validador.py` — o validador Python em si, que os quatro
  extratores importam.

Cada extrator resolve esse caminho e importa o módulo assim (o mesmo bloco
nos quatro arquivos):

```python
_PACOTE_CONTRATO = (
    Path(__file__).resolve().parents[2]
    / "node_modules" / "@refarm.dev" / "document-extraction-contract-v1" / "python"
)
sys.path.insert(0, str(_PACOTE_CONTRATO))
import validador as contrato  # noqa: E402
```

Não existe (e não deve voltar a existir) uma cópia local de `contrato.py`
ou do schema neste repositório. Duas cópias do mesmo contrato divergem em
silêncio — foi exatamente para eliminar essa duplicação que o contrato foi
colhido do coop-vault e publicado como pacote no refarm. Se o pacote não
estiver instalado, o import falha alto (`ModuleNotFoundError`), citando o
comando (`pnpm install`) que resolve — nunca cai de volta para uma cópia
improvisada.

## A fronteira contraparte/titular, como regra de projeto

Todo lançamento extraído carrega, quando o documento traz essa informação,
um campo `contraparte`: para quem o dinheiro foi, ou de quem veio. Isso é
dado que o titular do documento já conhece — está impresso no próprio
extrato — e por isso é preservado sem opt-in: descrição de compra, nome de
estabelecimento, CNPJ ou nome de terceiro num Pix.

O que nunca entra no envelope é o que identifica o **titular do documento**:
nome, CPF, matrícula, número de conta, agência, código da cooperativa,
últimos dígitos do cartão, linha digitável, código de barras. Essa fronteira
não é um detalhe de implementação — é a regra central de projeto dos quatro
extratores, e cada um a aplica de um jeito específico ao seu layout:

- **Pluxee**: a descrição do lançamento (nome do estabelecimento) é sempre
  contraparte; nada do titular aparece no extrato de benefício.
- **Sicoob**: a contraparte de um Pix ou TED é preservada como impressa —
  inclusive um CPF mascarado de terceiro. Mas um TED de crédito salarial
  mostra, no mesmo bloco, o nome e o CPF **do próprio titular** (o Sicoob
  usa esse bloco para confirmar o beneficiário, não para identificar quem
  pagou). Descobrir isso exigiu duas passadas sobre o documento: a primeira
  aprende qual CPF pleno co-ocorre com o nome do titular (conhecido do
  cabeçalho `CONTA:`) em algum bloco de detalhe; só esse CPF, aprendido e
  não assumido, é descartado onde reaparecer. Um CPF pleno que nunca
  co-ocorre com o nome do titular é preservado como contraparte de
  terceiro, e a ferramenta registra em avisos que não sabe atribuí-lo — ela
  admite que não sabe, em vez de adivinhar.
- **Fatura de cartão**: a descrição do lançamento é preservada mesmo quando
  cita nome de terceiro (ex.: uso compartilhado de um benefício) — são
  gastos reais, e apagá-los destruiria a conciliação. Não copiado: nome do
  titular no cabeçalho, últimos 4 dígitos do cartão, linha digitável,
  código de barras.
- **Contracheque**: o empregador é contraparte de todo lançamento (Proventos
  e Descontos); nada do titular (nome, CPF, matrícula, banco, agência, conta
  salário) entra no envelope.

Hoje essa fronteira vive como regra implementada em cada extrator e como
teste — não como dado declarativo. Um arquivo `politica-pii-v1.json`
separado, que tornaria essa fronteira configurável sem editar código, é
trabalho futuro, não coberto aqui.

## O princípio: levantar é aceitável, inventar nunca

Os quatro extratores compartilham uma postura diante de ambiguidade ou
divergência: quando o documento não bate com o que o código espera —
invariante de soma quebrado, marcador não encontrado, competência ambígua,
carteira desconhecida — o extrator **levanta `ValueError`** citando o que
falhou. Nenhum deles escolhe um valor plausível para preencher a lacuna.
Levantar é aceitável; inventar não é.

Essa postura também aparece em avisos: quando uma ambiguidade existiu mas
foi resolvida por uma regra explícita (ex.: um desempate por proximidade de
data, ou uma coluna que decide entre dois candidatos), o extrator não
esconde que a ambiguidade existiu — ela vai para `avisos`, mesmo já
resolvida. Um desempate silencioso é indistinguível, de fora, de um
documento sem ambiguidade nenhuma — e essa distinção importa para quem revê
o resultado.

## Lição cara: heurísticas posicionais

`parse_payslip.py` lê a competência (mês/ano de pagamento) do rótulo
`Mês/Ano Pagamento`. A primeira versão, ingênua, aceitava o primeiro
`MM/AAAA` numa janela de 400 caracteres depois do rótulo — e caía para um
código de lote com a mesma forma (`Cod.Lote 12/3456`) bem antes do valor
real. A segunda versão ancorava em **linha** (o valor precisa estar na
linha do rótulo ou na linha seguinte) — mais estreita, mas ainda vulnerável
a três ataques: dois tokens `MM/AAAA` adjacentes na mesma linha, um intruso
plausível ocupando o lugar da "linha seguinte", e um segundo rótulo
`Mês/Ano Pagamento` antes do verdadeiro.

Só a terceira versão, ancorada em **coluna**, sobreviveu: o candidato a
valor só é aceito se a coluna onde ele começa (medida na linha bruta do
`pdftotext -layout`, sem colapsar espaços) estiver a poucos caracteres da
coluna onde o rótulo começa. O `pdftotext -layout` alinha cabeçalho e valor
pela borda esquerda da mesma coluna do formulário — um intruso solto ou um
segundo token na mesma linha cai em outra coluna e é descartado antes mesmo
de checar se o ano é plausível. Três tentativas para uma função de ~15
linhas: janela larga, linha, coluna. Só a terceira resistiu a um documento
real adversarial.

A segunda lição, menor mas igualmente cara: uma regex de captura que
delimita o casamento com `(?:^|\s)ALVO(?:\s|$)` **consome** o espaço que
delimita o casamento — incluindo o espaço do lado direito, que também seria
o delimitador esquerdo de um próximo casamento adjacente. Contra um texto
como `"07/2050 08/2026"` (dois tokens `MM/AAAA` separados por um único
espaço), essa regex encontra o primeiro token, consome o espaço entre eles,
e o segundo token perde o delimitador de que precisava para casar — vira
invisível para `findall`, que devolve só um resultado onde deveria devolver
dois. A correção é usar *lookaround* não consumidor
(`(?<!\d)(\d{2})/(\d{4})(?!\d)`) em vez de `\s`/`^`/`$` para marcar a
fronteira: um lookaround verifica o que está ao redor sem consumi-lo, então
o mesmo caractere pode servir de delimitador para dois casamentos vizinhos
ao mesmo tempo.
