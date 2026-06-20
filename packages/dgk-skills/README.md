# @aretw0/dgk-skills

Skills declarativas no formato [Pi](https://github.com/possibilities/pi) para
agentes operarem um vault dgk através da CLI do Obsidian. São Markdown puro e
agnósticas de engine — ensinam o agente a buscar, ler, criar e revisar notas
seguindo a estrutura PARA, sem acoplar a nenhum runtime específico.

## Skills inclusas

| Skill            | Para que serve                                                   |
| ---------------- | ---------------------------------------------------------------- |
| `vault-context`  | Carrega o contexto do vault (estrutura PARA, convenções, status) |
| `vault-search`   | Busca notas por termo, tag ou caminho                            |
| `vault-read`     | Lê o conteúdo de uma nota                                        |
| `vault-create`   | Cria uma nota nova no lugar certo da taxonomia                   |
| `vault-daily`    | Abre/atualiza a nota diária                                      |
| `vault-evaluate` | Avalia a qualidade de escrita de uma nota                        |
| `vault-admin`    | Operações administrativas do vault                               |

## Instalação

```bash
pi install npm:@aretw0/dgk-skills
```

## Uso

Depois de instaladas, o agente passa a reconhecer as skills `vault-*` e as
aciona conforme o pedido (buscar, ler, criar, avaliar). Cada skill é um
diretório em `skills/` com um `SKILL.md` declarativo; nenhuma exige código
além da CLI do Obsidian já presente no vault.
