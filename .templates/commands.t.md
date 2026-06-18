# Templates de Comandos DGK

Blocos canônicos para sincronização via `mdt update`.
Edite aqui; propague com `mdt update` na raiz do projeto.

---

<!-- {=dgk-commands-table} -->
| Comando | Descrição |
|---|---|
| `dgk setup` | Configura o ambiente local (git, deps, Python tools) |
| `dgk check` | Verifica a saúde do vault (onboarding, IA, texto) |
| `dgk evaluate [nota]` | Avalia qualidade de escrita (determinístico, sem API) |
| `dgk lint` | Valida o markdown do vault |
| `dgk sow <canal>` | Configura credenciais de publicação (`~/.dgk/silo.json`) |
| `dgk etl` | Executa o pipeline de dados do vault |
| `dgk outbox <canal>` | Publica notas da fila para o canal (ex: `telegram`) |
| `dgk inbox <canal>` | Importa mensagens do canal para o vault (ex: `telegram`) |
| `dgk serve [--port N]` | Inicia o painel admin local (padrão: porta 4322) |
| `dgk obsidian [nome]` | Abre o vault no Obsidian |
| `dgk vscode` | Abre o vault no VS Code (Foam pré-configurado) |
| `dgk note <cmd>` | Executa um comando no Obsidian CLI |
| `dgk lab <sub>` | Laboratório: notebooks, curate, export |
| `dgk publish <sub>` | Scaffolda skills e extensões Pi no npm |
| `dgk validate` | Pipeline de CI completo (dev) |
<!-- {/dgk-commands-table} -->

---

<!-- {=dgk-lab-subcommands} -->
| Subcomando | Descrição |
|---|---|
| `dgk lab <notebook>` | Abre notebook no Marimo (ex: `analise-feeds`) |
| `dgk lab curate` | Classifica feeds com IA (requer chave de LLM via `dgk sow`) |
| `dgk lab export` | Exporta notebooks para HTML empacotado |
<!-- {/dgk-lab-subcommands} -->

---

<!-- {=dgk-typical-flow} -->
```bash
dgk sow telegram          # configura credenciais (uma vez)
dgk etl                   # processa dados do vault
dgk outbox telegram --dry-run  # revisa o que será publicado
dgk outbox telegram       # publica
```
<!-- {/dgk-typical-flow} -->
