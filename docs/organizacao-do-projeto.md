# Organização Técnica do Projeto

Este documento descreve a estrutura de pastas e arquivos do repositório sob uma perspectiva técnica, complementando a visão conceitual apresentada em [Entendendo a Estrutura de Pastas](../99%20-%20Meta%20e%20Anexos/99.1%20-%20Onboarding/Entendendo%20a%20Estrutura%20de%20Pastas.md).

## Estrutura de Pastas e Arquivos

```
.
├── .github/                  # Configurações e workflows do GitHub
│   ├── workflows/            # Definições de GitHub Actions (CI/CD, automações)
│   │   └── initialize.yml    # Workflow para inicialização automática de novos vaults
│   └── prompts/              # Prompts para ferramentas de IA (ex: GitHub Copilot)
├── AGENTS.md                 # Instruções canônicas para assistentes de IA
├── CLAUDE.md                 # Ponte do Claude Code para AGENTS.md
├── GEMINI.md                 # Link simbólico de compatibilidade para AGENTS.md
├── .vscode/                  # Configurações específicas para o VS Code
│   └── extensions.json       # Extensões recomendadas para o projeto
├── docs/                     # Documentação técnica e operacional do projeto
│   └── INDEX.md              # Índice da documentação técnica
│   └── organizacao-do-projeto.md # Este documento
├── scripts/                  # Scripts utilitários para automação local
│   └── validate_onboarding.js # Valida arquivos essenciais e wikilinks do vault
│   └── setup.sh              # Script de configuração inicial do ambiente
│   └── check_secrets_staged.sh # Exemplo de hook de pre-commit
├── node_modules/             # Dependências de pacotes Node.js (gerado pelo pnpm)
├── 00 - Entrada/               # Notas temporárias e não processadas
├── 10 - Diário/    # Notas diárias e pensamentos rápidos
├── 20 - Projetos/            # Notas e recursos relacionados a projetos específicos
├── 30 - Áreas/               # Notas e recursos relacionados a áreas de responsabilidade contínua
├── 40 - Recursos/           # Notas atômicas e base de conhecimento
├── 50 - Arquivo/            # Conteúdo arquivado
├── 90 - Modelos/           # Modelos de notas para o Obsidian/Foam
├── 99 - Meta e Anexos/  # Meta-documentação, guias e anexos globais do vault
│   └── Anexos/               # Repositório global configurado para todos os anexos do vault
├── .gitignore                # Arquivos e pastas a serem ignorados pelo Git
├── package.json              # Metadados do projeto e dependências Node.js
├── pnpm-lock.yaml            # Bloqueio de versões de dependências Node.js
├── README.md                 # Visão geral do projeto
└── VERSION                   # Arquivo contendo a versão atual do projeto
```

## Componentes Chave e Propósito Técnico

*   **`.github/`**: Contém todas as configurações relacionadas ao GitHub, incluindo os workflows de automação (`.github/workflows/`) que rodam no ambiente de CI/CD do GitHub Actions. A pasta `prompts/` pode conter prompts específicos para ferramentas de IA integradas.
*   **`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`**: Centralizam as instruções de projeto para assistentes de IA. `AGENTS.md` é o arquivo canônico; `CLAUDE.md` importa esse conteúdo para o Claude Code; `GEMINI.md` existe como link simbólico de compatibilidade.
*   **`.vscode/`**: Armazena configurações que otimizam a experiência de desenvolvimento no VS Code, como extensões recomendadas (`extensions.json`) e configurações de workspace.
*   **`docs/`**: Destinado a documentação técnica e operacional do projeto, como este guia de organização, instruções de setup de ambiente, ou detalhes sobre ferramentas específicas.
*   **`scripts/`**: Contém scripts shell ou Node.js que auxiliam no desenvolvimento local, automação de tarefas, hooks do Git e validações de onboarding.
*   **`node_modules/`**: Diretório gerado pelo `pnpm` que armazena todas as dependências de pacotes JavaScript/Node.js do projeto. Sempre ignorado pelo Git.
*   **`scripts/*.test.js`**: Testes com `node:test` para garantir a funcionalidade e a integridade dos scripts do projeto.
*   **Pastas Numeradas (`00 - Entrada/` a `50 - Arquivo/`)**: Embora seu propósito principal seja a organização do conhecimento pessoal, tecnicamente são diretórios que contêm arquivos Markdown (`.md`). Anexos de mídia inseridos nessas notas são centralizados em `99 - Meta e Anexos/Anexos/`.
*   **`90 - Modelos/`**: Contém arquivos Markdown que servem como modelos para a criação de novas notas, utilizados por plugins como o Templater no Obsidian.
*   **`99 - Meta e Anexos/`**: Além de meta-documentação e guias do vault, a subpasta `Anexos/` é o **repositório global configurado para todos os anexos de mídia do vault** (imagens, PDFs). Qualquer arquivo inserido a partir de qualquer pasta é centralizado aqui — isso evita anexos espalhados pelo repositório.
*   **Arquivos na Raiz**:
    *   `.gitignore`: Define arquivos e diretórios a serem ignorados pelo controle de versão Git.
    *   `package.json` / `pnpm-lock.yaml`: Gerenciamento de dependências e scripts do projeto Node.js.
    *   `README.md`: Ponto de entrada principal para o repositório.
    *   `VERSION`: Arquivo simples que armazena a versão atual do projeto, usado para versionamento automático.

Esta estrutura visa equilibrar a organização do conhecimento pessoal com as necessidades de um repositório de código versionado.
