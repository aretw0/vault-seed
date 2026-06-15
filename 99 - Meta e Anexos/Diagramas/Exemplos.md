---
title: Diagramas do Vault
tags:
  - meta/diagramas
status: draft
category: referencia
audience: tecnico
---
# Diagramas do Vault

Para atualizar após editar um template, execute a partir desta pasta:

```bash
cd "99 - Meta e Anexos/Diagramas"
mdt update
```

## Fluxo do Vault

<!-- {=vault-flow} -->
```mermaid
flowchart TD
    %% --- Definições de Estilo de Classe ---
    classDef inbox    fill:#f2f2f2,stroke:#666,stroke-width:2px,color:#333
    classDef projects fill:#e6f7ff,stroke:#0077b3,stroke-width:2px,color:#005c8a
    classDef areas    fill:#e6ffe6,stroke:#008000,stroke-width:2px,color:#005900
    classDef knowledge fill:#fff0e6,stroke:#ff8c1a,stroke-width:2px,color:#b35900
    classDef archives fill:#e0e0e0,stroke:#404040,stroke-width:2px,color:#262626
    classDef meta     fill:#ffe6f2,stroke:#cc0066,stroke-width:2px,color:#800040
    classDef action   fill:#fffde6,stroke:#cccc00,stroke-width:2px,color:#666600
    classDef decision fill:#e6e6ff,stroke:#3333ff,stroke-width:4px,color:#0000b3
    classDef principle fill:#fde0dc,stroke:#980000,stroke-width:2px,stroke-dasharray:5,color:#620000

    %% --- Ponto de Partida ---
    Start("💡 Nova Informação / Ideia / Nota Rápida") --> InboxDir

    %% --- Filosofia Central: Conectividade ---
    subgraph "FILOSOFIA CENTRAL: CONECTIVIDADE"
        direction LR
        P1("Notas Atômicas"):::principle
        P2("Criação de Links"):::principle
        P3("Teia de Conhecimento"):::principle
        P1 -- "wikilinks" --> P2 -- "Cria" --> P3
    end

    %% --- Entrada: Ponto de Captura ---
    subgraph "00 - Entrada"
        direction TB
        InboxDir("Entrada"):::inbox
        ProcessNote[/"Processar Nota na Entrada"/]:::action
        InboxDir --> ProcessNote
    end

    %% --- Hub Principal de Processamento e Decisão ---
    ProcessNote --> MainDecision{"Qual a natureza?"}:::decision

    %% --- Fluxos e Convenções Chave ---
    subgraph "CONVENÇÕES CHAVE"
        direction RL
        KW1("📝 Usar Templates"):::action
        KW2("🔗 Criar Links Atômicos"):::action
        KW3("📄 Nomenclatura Descritiva"):::action
        KW4("📖 Consultar o Guia"):::action
    end

    %% --- Ligando Fluxos ao Processo ---
    MainDecision -.-> KW1 & KW2 & KW3 & KW4

    %% --- Ramificações de Pastas (Método PARA) ---
    MainDecision -- "registro diario?" --> DailyDir
    MainDecision -- "tem prazo?" --> ProjectsDir
    MainDecision -- "responsabilidade?" --> AreasDir
    MainDecision -- "conceito ou recurso?" --> KnowledgeDir
    MainDecision -- "projeto concluido?" --> ArchivesDir

    subgraph "10 - Diário"
        DailyDir("Diário"):::inbox
        Note_Daily["Nota Diária"]
        DailyDir --> Note_Daily
    end

    subgraph "20 - Projetos"
        ProjectsDir("Projetos"):::projects
        Project_A["Ex: Planejar Viagem"]
        ProjectsDir --> Project_A
    end

    subgraph "30 - Áreas"
        AreasDir("Áreas"):::areas
        Area_A["Ex: Saúde e Bem-Estar"]
        AreasDir --> Area_A
    end

    subgraph "40 - Recursos"
        KnowledgeDir("Recursos"):::knowledge
        Concept_A["Ex: Método PARA"]
        KnowledgeDir --> Concept_A
    end

    subgraph "50 - Arquivo"
        ArchivesDir("Arquivo"):::archives
        CompletedProject["Ex: Projeto Viagem 2024"]
        ArchivesDir --> CompletedProject
    end

    %% --- Meta, Modelos e Anexos ---
    subgraph "90-99 - Modelos, Meta e Anexos"
        direction LR
        TemplatesDir("90 - Modelos"):::meta
        MetaDir("99 - Meta e Anexos"):::meta
        Guia(["Guia do Jardineiro"]):::meta
        Diagrama(["Fluxo do Vault"]):::meta
        MetaDir --> Guia & Diagrama
        KW4 -. "Referência" .-> Guia
        TemplatesDir -. "Usado por" .-> KW1
    end

    %% --- Conexões Finais ---
    Project_A --> Area_A
    Note_Daily -- "gera conceito" --> Concept_A
    Area_A -- "referencia" --> Concept_A
    P2 -.-> Concept_A & Note_Daily & Project_A
```
<!-- {/vault-flow} -->

## Estrutura PARA

<!-- {=para-structure} -->
```mermaid
graph LR
    Vault(["🌱 Vault"])
    Vault --> E["00 - Entrada - Captura rápida"]
    Vault --> D["10 - Diário - Notas do dia"]
    Vault --> P["20 - Projetos - Metas com prazo"]
    Vault --> A["30 - Áreas - Responsabilidades"]
    Vault --> R["40 - Recursos - Base de conhecimento"]
    Vault --> Arq["50 - Arquivo - Histórico inativo"]
    Vault --> M["90 - Modelos - Templates"]
    Vault --> Meta["99 - Meta e Anexos - Configuração e guias"]
```
<!-- {/para-structure} -->

## Revisão Diária

<!-- {=daily-review} -->
```mermaid
flowchart TD
    Start(["☀️ Início do dia"]) --> Inbox
    Inbox["🗂️ Processar 00 - Entrada"] --> Decide{"O que é?"}
    Decide -- "Tarefa acionável" --> Projetos["20 - Projetos"]
    Decide -- "Referência futura" --> Recursos["40 - Recursos"]
    Decide -- "Pode arquivar" --> Arquivo["50 - Arquivo"]
    Decide -- "Descartar" --> Lixo["🗑️ Deletar"]
    Projetos & Recursos & Arquivo --> Review["📋 Revisar tarefas ativas"]
    Review --> End(["✅ Entrada zerada"])
```
<!-- {/daily-review} -->

## Ciclo de Vida de Projeto

<!-- {=project-lifecycle} -->
```mermaid
flowchart LR
    S(["▶"]) --> Ideia["💡 Ideia"]
    Ideia --> Planejando["📋 Planejando"]
    Planejando --> Ativo["🚀 Ativo"]
    Ativo <--> Pausado["⏸ Pausado"]
    Ativo --> Concluido["✅ Concluído"]
    Concluido --> E(["⏹ Arquivado"])
    Planejando --> Cancelado["❌ Cancelado"]
    Cancelado --> E
```
<!-- {/project-lifecycle} -->
