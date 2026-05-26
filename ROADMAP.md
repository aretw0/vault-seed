# ROADMAP — Vault Seed

> Documento interno do template. Não deve ser entregue aos vaults gerados.

## Norte do produto

O Vault Seed deve ser uma base flexível para curadoria, exploração e publicação de conhecimento. A experiência principal publicada pertence ao Astro; o Lab/Marimo é a bancada computacional; scripts e CLI local sustentam o que é pesado, privado ou dependente de ambiente.

## Divisão de responsabilidades

### Astro — superfície pública principal

Astro deve cuidar do que é leitura, descoberta e navegação:

- arquitetura de informação do site;
- hubs por intenção;
- busca, filtros e cards;
- visualizações leves baseadas em dados estáticos;
- graph/timeline publicados;
- primitives visuais responsivas e acessíveis;
- experiência rápida que não exige runtime Python.

### Marimo — bancada de exploração

Marimo deve cuidar do que é análise e computação interativa:

- exploração de datasets;
- transformações com Python/pandas quando fizer sentido;
- notebooks reproduzíveis;
- comparação entre modo local e modo empacotado;
- exemplos de tarefas que não valem a pena mover para Astro.

Marimo deve compartilhar linguagem visual com Astro, mas não tentar substituir o site.

### CLI/scripts locais — infraestrutura e Extract pesado

Scripts locais devem cuidar do que envolve:

- filesystem;
- segredos;
- Playwright/navegador headless;
- OCR/binários externos;
- APIs autenticadas;
- formatos pesados ou opcionais, como Parquet;
- geração determinística de snapshots e manifests.

## Fronteira local vs publicado

Publicado pode:

- ler snapshots declarados em manifesto;
- transformar dados leves;
- filtrar, buscar e visualizar;
- receber upload manual no navegador quando for útil;
- buscar URL pública somente quando for opt-in e compatível com CORS.

Local pode:

- acessar arquivos privados;
- ler variáveis de ambiente;
- usar navegador headless;
- executar OCR;
- chamar APIs com tokens;
- gerar snapshots versionáveis.

## Lane atual — Curadoria editorial operacional

A frente com maior alavancagem agora é fechar o ciclo entre conteúdo,
auditoria, site, Lab e decisão editorial:

```text
notas → auditoria IA → relatório JSON → Astro/Lab → decisões editoriais → validação
```

Essa lane acumula poder porque reaproveita os contratos compartilhados já
criados, melhora a qualidade do vault-seed como exemplo de si mesmo e evita que
Astro, Marimo, scripts e CI voltem a divergir.

- [x] Expor relatório JSON da auditoria de arquitetura de informação.
- [x] Mover runtime da auditoria para `.site/lib/` para consumo compartilhado.
- [x] Publicar `curadoria-ia.json` como dataset do Lab.
- [x] Mostrar sinais editoriais em `/explorar/` usando o mesmo contrato.
- [ ] Transformar candidatas a promoção e recursos curtos em decisões editoriais pequenas.
- [x] Documentar a rotina de curadoria como prática recorrente do template.

## Roadmap de evolução

### 1. Fundação Astro-first

- [x] Definir taxonomia central para navegação por intenção.
- [x] Criar página de exploração pública do vault em Astro.
- [x] Conectar exploração Astro à taxonomia compartilhada de intenções.
- [x] Gerar JSON estático para exploração do site.
- [x] Adicionar filtros por pasta, tag, categoria e público.
- [x] Exibir métricas de acervo no site.
- [x] Verificar responsividade e acessibilidade básica da nova superfície.

### 2. Primitives visuais do site

- [x] Consolidar `vault-section-header`.
- [x] Consolidar `vault-filter`.
- [x] Consolidar `vault-metric`.
- [x] Consolidar `vault-resource-list`.
- [x] Consolidar `vault-empty-state`.
- [ ] Documentar primitives em uma nota publicada enxuta.
- [ ] Cobrir primitives estruturais com smoke/contrato.

### 3. Graph e timeline em Astro

- [x] Gerar dataset estático inicial de links internos e tags.
- [x] Criar graph view leve e explicável.
- [ ] Adicionar filtros de graph por pasta/tag/status.
- [x] Destacar hubs e notas órfãs.
- [x] Criar timeline simples de publicação/alteração quando houver metadados.
- [ ] Garantir fallback sem JavaScript avançado quando possível.

### 4. Arquitetura de informação

- [x] Auditar notas de `99 - Meta e Anexos` com taxonomia compartilhada.
- [ ] Classificar notas como `guide`, `concept`, `reference`, `workflow` ou `technical`.
- [x] Sugerir promoções de notas conceituais para `40 - Recursos`.
- [ ] Reduzir repetição entre onboarding, recursos e docs técnicas.
- [x] Reorganizar sidebar por intenção sem depender somente da pasta física.
- [x] Expor relatório de curadoria editorial em JSON para Astro, Lab e scripts.

### 5. Lab/Marimo como bancada exemplar

- [x] Centralizar helpers de runtime local/publicado.
- [x] Demonstrar snapshots locais consumidos no publicado.
- [x] Bloquear filesystem, segredos, OCR e Playwright no HTML empacotado.
- [ ] Criar notebook Explorador Universal de datasets.
- [ ] Replicar no Lab apenas primitives visuais que ajudem a coesão.
- [x] Consumir no Lab o relatório editorial produzido pela auditoria compartilhada.
- [ ] Mostrar no notebook quando uma tarefa pertence ao Astro, ao Lab ou à CLI.
- [ ] Criar contrato para evitar dependências locais obrigatórias no notebook publicado.

### 6. CLI local para Extract

- [x] Manter pipeline determinístico de snapshots do Lab.
- [x] Expor `notebooks:extract:local` como alias do fluxo local atual.
- [ ] Separar conectores locais opcionais por capacidade.
- [ ] Documentar Playwright/OCR/APIs como extras locais, não dependências padrão.
- [ ] Garantir que tokens e artefatos privados nunca entrem no export publicado.

## Critério de pronto

Cada evolução relevante deve ter:

- implementação alinhada à divisão Astro/Marimo/CLI;
- teste ou smoke determinístico;
- documentação curta no lugar correto;
- validação de responsividade quando afetar UI;
- confirmação de que não polui vaults gerados.
