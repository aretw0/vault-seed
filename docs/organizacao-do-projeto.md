# Organização Técnica do Projeto

Este documento descreve a estrutura de pastas e arquivos do repositório sob uma perspectiva técnica, complementando a visão conceitual apresentada em [[Entendendo a Estrutura de Pastas]].

## Estrutura de Pastas e Arquivos

```
.
├── .github/                  # Configurações e workflows do GitHub
│   ├── workflows/            # Definições de GitHub Actions (CI/CD, automações)
│   │   └── initialize.yml    # Workflow para inicialização automática de novos vaults
│   └── prompts/              # Prompts para ferramentas de IA (ex: GitHub Copilot)
├── .vscode/                  # Configurações específicas para o VS Code
│   └── extensions.json       # Extensões recomendadas para o projeto
├── docs/                     # Documentação técnica e operacional do projeto
│   └── organizacao-do-projeto.md # Este documento
├── scripts/                  # Scripts utilitários para automação local
│   └── setup.sh              # Script de configuração inicial do ambiente
│   └── check_secrets_staged.sh # Exemplo de hook de pre-commit
├── node_modules/             # Dependências de pacotes Node.js (gerado pelo npm)
├── tests/                    # Testes unitários e de integração
├── 00 - Inbox/               # Notas temporárias e não processadas
├── 10 - Fleeting & Daily/    # Notas diárias e pensamentos rápidos
├── 20 - Projects/            # Notas e recursos relacionados a projetos específicos
├── 30 - Areas/               # Notas e recursos relacionados a áreas de responsabilidade contínua
├── 40 - Resources/           # Notas atômicas e base de conhecimento
├── 50 - Archives/            # Conteúdo arquivado
├── 90 - Templates/           # Modelos de notas para o Obsidian/Foam
├── 99 - Meta & Attachments/  # Meta-documentação do vault e anexos
│   └── Attachments/          # Pasta padrão para anexos de notas
├── .env.example              # Exemplo de arquivo de variáveis de ambiente
├── .gitignore                # Arquivos e pastas a serem ignorados pelo Git
├── package.json              # Metadados do projeto e dependências Node.js
├── package-lock.json         # Bloqueio de versões de dependências Node.js
├── README.md                 # Visão geral do projeto
└── VERSION                   # Arquivo contendo a versão atual do projeto
```

## Componentes Chave e Propósito Técnico

*   **`.github/`**: Contém todas as configurações relacionadas ao GitHub, incluindo os workflows de automação (`.github/workflows/`) que rodam no ambiente de CI/CD do GitHub Actions. A pasta `prompts/` pode conter prompts específicos para ferramentas de IA integradas.
*   **`.vscode/`**: Armazena configurações que otimizam a experiência de desenvolvimento no VS Code, como extensões recomendadas (`extensions.json`) e configurações de workspace.
*   **`docs/`**: Destinado a documentação técnica e operacional do projeto, como este guia de organização, instruções de setup de ambiente, ou detalhes sobre ferramentas específicas.
*   **`scripts/`**: Contém scripts shell ou Node.js que auxiliam no desenvolvimento local, automação de tarefas ou hooks do Git.
*   **`node_modules/`**: Diretório gerado pelo `npm` que armazena todas as dependências de pacotes JavaScript/Node.js do projeto. Geralmente ignorado pelo Git.
*   **`tests/`**: Contém os arquivos de teste para garantir a funcionalidade e a integridade do código ou scripts do projeto.
*   **Pastas Numeradas (`00 - Inbox/` a `50 - Archives/`)**: Embora seu propósito principal seja a organização do conhecimento pessoal, tecnicamente são diretórios que contêm arquivos Markdown (`.md`) e outros formatos de mídia (via `Attachments/`).
*   **`90 - Templates/`**: Contém arquivos Markdown que servem como modelos para a criação de novas notas, utilizados por plugins como o Templater no Obsidian.
*   **`99 - Meta & Attachments/`**: Além de meta-documentação sobre o vault, a subpasta `Attachments/` é o local padrão para anexos de mídia (imagens, PDFs) referenciados nas notas.
*   **Arquivos na Raiz**:
    *   `.env.example`: Modelo para variáveis de ambiente sensíveis.
    *   `.gitignore`: Define arquivos e diretórios a serem ignorados pelo controle de versão Git.
    *   `package.json` / `package-lock.json`: Gerenciamento de dependências e scripts do projeto Node.js.
    *   `README.md`: Ponto de entrada principal para o repositório.
    *   `VERSION`: Arquivo simples que armazena a versão atual do projeto, usado para versionamento automático.

Esta estrutura visa equilibrar a organização do conhecimento pessoal com as necessidades de um repositório de código versionado.
