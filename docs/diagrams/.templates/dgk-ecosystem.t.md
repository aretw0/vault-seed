<!-- mdt template — run `mdt update` from repo root to sync, `mdt check` in CI -->

<!-- {@dgk-ecosystem} -->
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
        RC5["instância corporativa\n(ex: rcdc5)"]
        UVLT["vault do usuário\n(initialize.yml)"]
    end

    VS --> CLI
    VS --> SKILLS
    VS --> CHAN
    VS -->|initialize.yml| UVLT
    VS -->|initialize.yml| RC5
    SKILLS --->|skills agnósticas| PI
    CHAN -.->|migra para| TRACT
    PI --> TRACT
    PI --> NOSTR
```
<!-- {/dgk-ecosystem} -->
