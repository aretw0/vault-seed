# ROADMAP — Vault Seed (próximo minor: 0.3.0)

> Documento interno do template. Não deve ser entregue aos vaults gerados.

## Norte do produto (atualizado)

O Vault Seed é uma máquina de conhecimento **local-first** para quem quer robustez diária e não só publicação. A superfície pública (Astro) mantém discoverability e leitura; o Lab/Marimo e scripts/CLI sustentam a etapa analítica, automatizada e pesada.

Foco permanente:

- **Publicar** com qualidade, clareza e acessibilidade.
- **Operar diariamente** com workflows locais (Obsidian + Marimo + CLI).
- **Ingerir de múltiplas fontes** (social, RSS, arquivos, planilhas, dumps) com validação.
- **Manter interoperabilidade** entre Markdown, JSON, CSV e YAML.
- **Preservar e validar contratos/esquemas** em todo o fluxo, evitando entropia.
- **Nota de versionamento:** este roadmap usa **0.3.0** como **minor do template** (template principal Vault-Seed). Releases de outros domínios (JS/Python/CLI local) devem ser orquestradas nesse ciclo.

## Convenção de versão do ecossistema (template + artefatos locais)

- [ ] Definir o **orquestrador de release** do ciclo 0.3.x (componente: template, pacotes JS, dependências Python, datasets).
- [ ] Separar política de bump para:
  - `template` (root `package.json` e CHANGELOG),
  - `packages/*` (npm: `@aretw0/dgk-cli`, `@aretw0/dgk-astro-plugins`),
  - `requirements*.txt` (Python/local tooling).
- [ ] Criar trilha de evidenciação: changelog consolidado por componente + manifesto de compatibilidade mínima.
- [ ] Definir critérios de acoplamento: quando atualizar dependência Python sem bump do template e vice-versa.

## Princípios orientadores

1. **Offline-first sem desculpa**: tudo o que precisa de segredo/FS/API autenticada vive fora do publicado.
2. **Interoperável por padrão**: dados e metadados em formatos que qualquer ferramenta da órbita consiga consumir.
3. **Observabilidade operacional mínima**: você deve saber o que foi coletado, quando, por qual fonte e com qual nível de confiança.
4. **Acessibilidade contínua**: a experiência final deve reduzir atrito de leitura e decisão, não só “passar no smoke”.
5. **Convergência útil**: templates, notebooks e páginas convergem sem que um sufoque o outro.

## Divisão de responsabilidades (guia estável)

### Astro — superfície pública principal

Astro cuida do que precisa ser estável, navegável e auditável publicamente:

- arquitetura de informação e navegação por intenção;
- busca, filtros e páginas de exploração;
- gráficos/timelines leves (sem runtime pesado);
- páginas editoriais publicadas e docs de uso;
- acessibilidade da superfície pública.

### Marimo (Lab) — bancada de análise

Marimo cuida de:

- normalização e enriquecimento de dados;
- exploração interativa de datasets;
- qualidade de dados (deduplicação, checagens, resumos, outliers);
- notebooks reproduzíveis com foco em decisões humanas.

### CLI/scripts locais — operação e ingestão pesada

CLI/scripts locais cuidam de:

- conectores e crawlers;
- OCR/browsers/headless;
- integrações autenticadas;
- geração de snapshots, manifests e artefatos de validação;
- segurança/segredo por desenho.

## Fronteira local vs publicado (atualizada)

**Publicado** pode:
- consumir snapshots/versionados;
- renderizar dados leves validados;
- oferecer filtros, busca e publicação;
- receber upload manual quando necessário.

**Local** pode:
- ler FS e segredos;
- chamar APIs autenticadas;
- executar OCR/headless/browser;
- manter bancos/caches efêmeros e privados;
- validar schemas antes de qualquer promoção para produção.

## Fronteira de dados e contratos

Toda fonte entra pelo mesmo funil de contrato:

1. `raw` (entrada)
2. `normalized` (normalizado)
3. `derived` (enriquecido)
4. `publish_ready` (opcional, para Astro)

Artefatos esperados por etapa:

- manifesto de origem (`source_manifest.*`)
- schema de validade (JSON Schema)
- checksum/hash de fonte e lote
- relatório de qualidade + alertas de falha
- trilha de proveniência mínima (`coletado_em`, `origem`, `status`, `método`)

## Linha atual — Curadoria + Operação de Dados

A frente atual permanece forte em:

```text
notas → auditoria IA → relatório JSON → Astro/Lab → decisão humana → validação
```

Agora ampliada para incluir ingestão e monitoramento de fontes:

```text
fonte (dump/API/arquivo) → ingestão local → normalização → contrato validado → snapshot → curadoria/Lab → publicação opcional
```

- [x] Expor relatório JSON da auditoria de arquitetura de informação.
- [x] Mover runtime da auditoria para `.site/lib/` para consumo compartilhado.
- [x] Publicar `curadoria-ia.json` como dataset do Lab.
- [x] Mostrar sinais editoriais em `/explorar/` usando o mesmo contrato.
- [x] Transformar candidatas a promoção e recursos curtos em decisões editoriais pequenas.
- [x] Documentar a rotina de curadoria como prática recorrente do template.
- [ ] Unificar `onboarding`, curadoria e visão de operação em trilha única.
- [ ] Adicionar checks de proveniência + validade no contrato de curadoria.

## Roadmap de evolução (revitalizado)

### 1. Fundamentos de acessibilidade, onboarding e primitives

- [x] Verificar responsividade e acessibilidade básica da nova superfície.
- [x] Consolidar `vault-section-header`.
- [x] Consolidar `vault-filter`.
- [x] Consolidar `vault-metric`.
- [x] Consolidar `vault-resource-list`.
- [x] Consolidar `vault-empty-state`.
- [ ] Documentar primitives em nota publicada enxuta (catálogo de uso e exemplos).
- [x] Cobrir primitives estruturais com smoke/contrato.
- [ ] Revisar contraste/estado de foco para keyboard/screen reader em páginas críticas.
- [ ] Criar trilha de onboarding em 3 níveis (leitor, mantenedor, operador).

### 2. Graph e timeline em Astro

- [x] Gerar dataset estático inicial de links internos e tags.
- [x] Criar graph view leve e explicável.
- [ ] Adicionar filtros de graph por pasta/tag/status.
- [x] Destacar hubs e notas órfãs.
- [x] Habilitar movimentação dos nós por arraste (drag) no canvas do graph.
- [x] Oferecer controles de expandir/contrair e zoom com recenter e pan, em linguagem de exploração visual (sem exibir código-fonte).
- [x] Criar timeline simples de publicação/alteração quando houver metadados.
- [x] Garantir fallback sem JavaScript avançado para estados essenciais.
- [x] Exibir contexto de acessibilidade no graph (legenda + alternativa textual semântica).

### 3. Arquitetura de informação e clareza editorial

- [x] Auditar notas de `99 - Meta e Anexos` com taxonomia compartilhada.
- [ ] Classificar notas como `guide`, `concept`, `reference`, `workflow` ou `technical`.
- [x] Sugerir promoções de notas conceituais para `40 - Recursos`.
- [ ] Reduzir repetição entre onboarding, recursos e docs técnicas.
- [x] Reorganizar sidebar por intenção sem depender somente da pasta física.
- [x] Expor relatório de curadoria editorial em JSON para Astro, Lab e scripts.
- [x] Criar mapa público de hubs por intenção usando a taxonomia compartilhada.
- [ ] Criar matriz IAO (intenção-autonomia-observabilidade) para priorizar decisões editoriais.

### 4. Ingestão local-first de fontes (alta prioridade nova)

- [ ] Definir contratos/schemas para ingestão de fontes heterogêneas (dump social, RSS, arquivos locais, APIs).
- [ ] Criar adaptador de normalização para JSON/CSV/YAML para Markdown e vice-versa.
- [ ] Incluir suporte explícito para **dumps de redes sociais** (ex.: Instagram raw dump) com parser robusto.
- [ ] Implementar pipeline `source-dump → normalized` com validação determinística.
- [ ] Incluir relatório de qualidade da ingestão (itens perdidos, duplicados, baixa confiança).
- [ ] Criar pipeline de monitoramento de ingestão (freshness, falhas, cobertura por fonte, alertas).
- [ ] Registrar `source`, `run_id`, `agent`, `dataset_version`, `hash` em manifest e dataset final.
- [ ] Criar notebook de “explorador universal de fontes” com caminho guiado offline (sem APIs secretas).
- [ ] Gerar materiais não publicados (`99 - Meta e Anexos/Notebooks Locais`) para operação diária no Obsidian com Dataview/Bases.
- [ ] Definir protocolo de *handoff* entre raw dump, análise e publicação (sem perda de contexto).

### 5. Ferramentas de monitoramento e utilidade diária

- [ ] Entregar painel (puro Markdown + JSON) de status da vault-machine: ingestão, qualidade de links, notas órfãs, fontes pendentes.
- [ ] Adicionar contratos para “tarefas em andamento” (status, prioridade, dono, data-alvo).
- [ ] Criar guia operacional de manutenção semanal (checklist de 15 min).
- [ ] Criar utilitários reutilizáveis para limpeza de metadados e deduplicação.
- [ ] Criar relatório de risco de publicação (itens com metadados frágeis/ausência de source).

### 6. Laboratório Marimo orientado a dados

- [ ] Criar notebook **Explorador Universal de datasets** (cross-source).
- [x] Centralizar helpers de runtime local/publicado.
- [x] Demonstrar snapshots locais consumidos no publicado.
- [ ] Replicar no Lab apenas primitives visuais que ajudem a coesão.
- [x] Bloquear filesystem, segredos, OCR e Playwright no HTML empacotado.
- [x] Consumir no Lab o relatório editorial produzido pela auditoria compartilhada.
- [x] Adicionar primitivas locais para RSS/Atom como fonte de dados auditável.
- [x] Criar notebook de análise de feeds e candidatas para inbox.
- [x] Criar notebook de outbox para rascunhos por canal e revisão antes de publicar.
- [ ] Mostrar no notebook quando uma tarefa pertence ao Astro, ao Lab ou à CLI.
- [ ] Criar contrato para evitar dependências locais obrigatórias no notebook publicado.

### 7. CLI local para operações (contratos + opcionalidade)

- [x] Manter pipeline determinístico de snapshots do Lab.
- [x] Expor `notebooks:extract:local` como alias do fluxo local atual.
- [x] Documentar Playwright/OCR/APIs como extras locais, não dependências padrão.
- [x] Gerar feed RSS do site publicado.
- [x] Normalizar OPML de assinaturas como dataset do Lab.
- [x] Documentar inbox soberana, proveniência e handoff com agentes.
- [x] Gerar outbox local a partir de frontmatter antes de qualquer integração social.
- [ ] Separar conectores locais opcionais por capacidade (mínimo, padrão, avançado).
- [ ] Garantir que tokens e artefatos privados nunca entrem no export publicado.
- [ ] Criar catálogo de conectores com perfil de custo/risco/requisitos.
- [ ] Expandir comandos para auditoria local de schema e ingestão.

## Convergência com o ecossistema

vault-seed é a **interface** — não a engine. O modelo de responsabilidades é:

| Camada | Onde vive | O que vault-seed faz |
|---|---|---|
| Interface de auditoria | vault-seed (`vault.config.yaml` + CI job) | Declara o contrato e chama a ferramenta |
| Primitivas de avaliação | agents-lab (`@aretw0/pi-stack` → future refarm) | Executa a lógica (a11y, textual, performance) |
| Engine agêntica | refarm (futuro) | Substitui Pi sem mudar a interface do vault |
| Ingestão e scraping | vaults em campo → agents-lab primitive | Motor de raspagem local como adapter reutilizável |
| Avaliação textual | vaults em campo → agents-lab primitive | Estratégias de avaliação textual validadas em uso real |

**Regra de adição**: antes de implementar lógica de avaliação/auditoria em `dgk-cli`, perguntar se ela pertence a agents-lab como primitive. vault-seed owna o ponto de entrada e a experiência do usuário do template; agents-lab e refarm ownam a inteligência.

**Ponto de encontro atual**: o `publishing` flag no `initialize.yml` (a ser implementado em 0.3.x) é a superfície onde a jornada do usuário (privado vs. publicador) define quais gates de auditoria são ativados no CI.

## Critério de pronto (refinado)

Cada evolução relevante deve ter:

- implementação alinhada à divisão Astro/Marimo/CLI;
- teste ou smoke determinístico;
- documentação curta no lugar correto;
- validação de acessibilidade quando afetar UI;
- validação de contrato/schema antes de promoção de artefatos;
- confirmação de que não polui vaults gerados.
- trilha de reversão documentada (como desfazer mudanças de ingestão/contrato).

## Sobrevivência do roadmap

Este roadmap deve ser tratado como política de produto do template:

- qualquer tarefa nova deve nascer com vínculo claro a pelo menos um pilar;
- itens de alto impacto de operação local têm prioridade quando há risco de perda de fonte/qualidade;
- qualquer avanço técnico deve tornar a cadeia Obsidian ↔ Marimo ↔ Astro mais simples, mais auditável e mais independente de serviço.
- manter convergência com experiências como `refarm` e `agents-lab` quando fizer sentido, sem quebrar compatibilidade com uso offline.