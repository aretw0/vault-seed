# obsidian-vault-template

Base sólida para um vault Obsidian, pensando em crescimento orgânico e potencial para automação com CI/CD. A filosofia principal será: **começar simples, focar em conexões e deixar a estrutura emergir conforme a necessidade.**

**Filosofia Central: Link > Folder (Inicialmente)**

A força do Obsidian (e de um Second Brain eficaz) reside nas conexões (`[[wikilinks]]`). Uma estrutura de pastas rígida no início pode limitar o pensamento associativo. Portanto, a arquitetura inicial prioriza uma organização mínima, confiando mais em links, tags e MOCs (Maps of Content) para navegação e descoberta.

---

## Estrutura Inicial Recomendada (Template Vault)

Esta estrutura é minimalista e projetada para escalar.

```
MeuVault/          
├── .github/
│   └── workflows/
│       └── ci.yml        # Exemplo de workflow básico do GitHub Actions
├── .obsidian/            # Pasta de configuração do Obsidian (gerenciada pelo app)
├── .gitignore            # Arquivo para instruir o Git sobre o que ignorar
├── 00 - Meta/            # Notas sobre o vault, templates, dashboards
│   ├── Templates/        # Localização padrão para templates (configurável)
│   └── README_Vault.md   # Nota explicando a estrutura e convenções do vault
├── 10 - Inbox/           # Ponto de entrada rápido para notas não processadas
├── 20 - Resources/       # Anexos: Imagens, PDFs, etc. (configurável no Obsidian)
├── 30 - Notes/           # O coração do seu Second Brain: notas atômicas, evergreen, etc.
└── README.md             # README principal para o repositório Git
```

**Explicação dos Componentes:**

1.  **`.github/workflows/`**: Pasta para automações com GitHub Actions.
    *   `ci.yml`: Um workflow inicial pode simplesmente garantir que o push funcione ou, futuramente, rodar um linter de Markdown, ou até publicar o vault (veremos adiante).
2.  **`.obsidian/`**: Contém todas as configurações do seu vault: temas, snippets CSS, plugins instalados e suas configurações. **É crucial versionar esta pasta** (com exceções, veja `.gitignore`) para manter a consistência entre dispositivos.
3.  **`.gitignore`**: Fundamental para manter o repositório limpo.
4.  **`00 - Meta/`**: Um local para tudo *sobre* o vault, não *dentro* dele.
    *   `Templates/`: Onde ficam seus modelos de nota (ex: Nota Diária, Nota de Livro). Configure no plugin "Templates" ou "Templater".
    *   `README_Vault.md`: Uma nota interna explicando suas próprias convenções, estrutura, como usar tags, etc. É o seu manual pessoal do vault.
5.  **`10 - Inbox/`**: Para capturas rápidas. A ideia é processar essas notas regularmente, movendo-as para `30 - Notes` e conectando-as. Pode ser uma pasta física ou apenas uma tag `#inbox` ou um link `[[Inbox MOC]]`. A pasta física é mais explícita para iniciantes.
6.  **`20 - Resources/` (ou `Assets/`)**: Configure o Obsidian (Opções > Anexos de Arquivo) para salvar anexos aqui. Mantém a raiz do vault limpa.
7.  **`30 - Notes/`**: Onde a maior parte do seu conhecimento residirá. Inicialmente, pode ser "plano" (sem subpastas), confiando em links e MOCs. Com o tempo, você pode criar subpastas para *grandes* categorias ou projetos muito específicos, se sentir necessidade.
8.  **`README.md`**: Arquivo padrão do Git, útil se você hospedar no GitHub/GitLab. Explica o propósito do repositório.

---

## Evolução Orgânica do Vault

Seu vault crescerá. Veja como gerenciar isso sem over-engineering:

1.  **Comece com Notas Atômicas:** Em `30 - Notes/`, crie notas focadas em um único conceito ou ideia. Use títulos descritivos (ex: `[[Princípios do Atomic Design]]`, `[[Como fazer café coado V60]]`).
2.  **Link Abundantemente:** Ao escrever uma nota, crie links para conceitos relacionados (`[[Link Interno]]`). Se a nota linkada não existir, o Obsidian facilita sua criação. *Esta é a principal forma de organização.*
3.  **Use Tags Estrategicamente:** Tags (`#tag`) são ótimas para *status*, *tipos* ou *contextos amplos*:
    *   Status: `#status/processando`, `#status/concluido`, `#status/ideia`
    *   Tipo: `#tipo/livro`, `#tipo/artigo`, `#tipo/pessoa`, `#tipo/conceito`
    *   Contexto: `#contexto/trabalho`, `#contexto/pessoal`, `#contexto/saude`
    *   Evite usar tags para tudo; prefira links para conexões conceituais.
4.  **Crie MOCs (Maps of Content):** Quando um tópico começa a ter muitas notas relacionadas, crie uma nota "índice" chamada MOC. Ex: `[[MOC Produtividade]]`. Esta nota conterá links para as notas principais sobre produtividade, talvez com uma breve descrição. MOCs são como índices curados e emergentes. Eles podem viver em `30 - Notes/` ou em `00 - Meta/` se preferir.
5.  **Introduza Pastas (Com Cautela):** *Só* crie subpastas em `30 - Notes/` quando uma categoria se tornar *muito grande e distinta*, e a navegação por links/MOCs começar a parecer insuficiente. Exemplos:
    *   `30 - Notes/Projetos/Nome do Projeto Grande/`
    *   `30 - Notes/Areas/Saúde e Fitness/`
    *   Muitas vezes, um MOC (`[[MOC Projeto X]]`, `[[MOC Saúde]]`) é suficiente. Pergunte-se: "Essa pasta realmente me ajuda a encontrar ou organizar melhor do que um MOC ou tag faria?".
6.  **Refine Templates:** À medida que seus processos de anotação se solidificam, melhore seus templates em `00 - Meta/Templates/` usando plugins como "Templater" para automações mais poderosas.

---

## Plugins Recomendados para Esta Abordagem

**Essenciais (Core ou Quase):**

*   **Core Plugins:** Habilite `Templates`, `Daily Notes`, `Quick Switcher`, `Backlinks`, `Outgoing Links`.
*   **Dataview:** *Fundamental* para criar visões dinâmicas e MOCs automáticos. Permite fazer queries sobre suas notas baseado em metadados (tags, links, campos YAML).
    *   *Exemplo em um MOC:*
        ````markdown
        ```dataview
        LIST
        FROM #tipo/livro AND #status/lendo
        SORT file.ctime DESC
        ```
        ````
*   **Periodic Notes:** Expande as Daily Notes para Weekly, Monthly, Quarterly, Yearly. Ótimo para planejamento e revisão.
*   **Templater:** Versão muito mais poderosa do plugin "Templates". Permite scripts e lógica complexa nos seus templates.

**Altamente Recomendados:**

*   **Commander:** Permite adicionar comandos (de plugins ou core) à interface do Obsidian (fita, barra de status, menus). Ótimo para otimizar o fluxo de trabalho.
*   **Style Settings:** Permite customizar opções visuais de temas e plugins que o suportam, sem precisar escrever CSS.
*   **Obsidian Git:** Permite fazer `pull`, `push`, `commit` diretamente da interface do Obsidian. Complementa, mas não substitui, o uso do Git no terminal ou cliente Git dedicado para operações mais complexas.

**Opcionais (Dependendo do Uso):**

*   **Calendar:** Integração visual com suas Daily Notes.
*   **Excalidraw:** Para desenhos e diagramas baseados em vetor dentro do Obsidian.
*   **Kanban:** Para criar quadros Kanban a partir de notas Markdown.

---

**Conclusão:**

Esta arquitetura fornece um ponto de partida robusto e flexível. Ela prioriza a conexão de ideias, utiliza Git para segurança e colaboração (mesmo que só consigo mesmo), e está pronta para automação com CI/CD. Lembre-se que o "melhor" sistema é aquele que funciona *para você* e evolui com suas necessidades. Comece com esta base, use-a e ajuste organicamente. Feliz anotação!
