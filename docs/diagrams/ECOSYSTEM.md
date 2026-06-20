---
title: Ecossistema DGK — Camadas e Convergência
updated: 2026-06-12
---

# Ecossistema DGK

Mapa das camadas do ecossistema e como cada projeto se relaciona. Para contexto
estratégico completo, veja [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

Para atualizar após editar o template, execute a partir da raiz do projeto:

```bash
mdt update
```

## Camadas do Ecossistema

<!-- {=dgk-ecosystem} -->
```mermaid
graph TD
    subgraph dist["Distribuição — vault-seed"]
        VS["vault-seed\nTemplate DGK"]
        CLI["dgk-cli\nOrquestrador"]
        SKILLS["dgk-skills\nSkills Pi"]
        CHAN["dgk-channels\nBridge de canais"]
    end

    subgraph agents["Runtime de Agentes — agents-lab"]
        PI["Pi Runtime\nExecução de skills"]
    end

    subgraph protocol["Protocolo Soberano — refarm"]
        TRACT["Tractor WASM"]
        NOSTR["Nostr Identity"]
    end

    subgraph instances["Instâncias (distribuições personalizadas)"]
        CORP["instância corporativa\n(downstream privado)"]
        UVLT["vault do usuário\n(initialize.yml)"]
    end

    VS --> CLI
    VS --> SKILLS
    VS --> CHAN
    VS -->|initialize.yml| UVLT
    VS -->|initialize.yml| CORP
    SKILLS --->|skills agnósticas| PI
    CHAN -.->|migra para| TRACT
    PI --> TRACT
    PI --> NOSTR
```
<!-- {/dgk-ecosystem} -->
