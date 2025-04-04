# obsidian-vault-template

Este vault template visa equilibrar estrutura e flexibilidade, permitindo que seu vault cresça organicamente enquanto mantém a organização e facilita a automação com Git e CI/CD. A inspiração vem de métodos como PARA (Projects, Areas, Resources, Archives) e Zettelkasten, adaptados para o Obsidian.

**Filosofia Central**

A força do Obsidian (e de um Second Brain eficaz) reside nas conexões (`[[wikilinks]]`). Não foque muito na estrutura de pastas no começo pois pode limitar o pensamento associativo. Priorize uma organização mínima, confiando mais em links, tags e MOCs (Maps of Content) para navegação e descoberta.

## Pré-requisitos

- Git instalado no seu sistema ([https://git-scm.com/downloads](https://git-scm.com/downloads)).
- Conta no GitHub ([https://github.com/](https://github.com/)).
- Obsidian instalado ([https://obsidian.md/](https://obsidian.md/)).

## Começando

1. Crie um repositório a partir deste template: <a id="copy" href="https://github.com/new?template_name=obsidian-vault-template&template_owner=aretw0">
   <img src="https://img.shields.io/badge/📠_Criar-008000" height="25pt"/>
   </a>
2. Clone o repositório na sua máquina
3. No Obsidian abra a pasta do repositório como um cofre.
4. [Instale o plugin Obsidian Git](https://publish.obsidian.md/git-doc/Installation)
5. Faça edições nas suas notas
6. Publique suas notas executando o comando “Git: Commit-and-sync” abrindo a paleta de comandos (CMD/Ctrl + P)

> Veja [https://publish.obsidian.md/git-doc/Authentication](https://publish.obsidian.md/git-doc/Authentication) caso tenha problemas de autenticação. 


## Usando o `Obsidian Git`:

- Abra a paleta de comandos (Ctrl+P ou Cmd+P).
- Digite "Git" para ver os comandos disponíveis:
  - `Git: Commit all changes`
  - `Git: Push`
  - `Git: Pull`
  - `Git: Commit-and-sync` (Útil para sync manual rápido)
- O plugin também adiciona um ícone na barra lateral esquerda que indica se há alterações não commitadas.

### Configurações Chave

- **Vault backup interval (minutes):** Defina um valor (e.g., `15` ou `30`) para backups automáticos (commit + push). `0` desativa o backup automático por tempo.
- **Auto push on backup:** **Ative** esta opção se você definiu um intervalo de backup.
- **Commit message:** Use um template como `chore: backup vault - {{date}} {{time}}` ou `feat: update notes - {{numFiles}} files changed`. O `{{date}}`, `{{time}}` e `{{numFiles}}` são placeholders do plugin.
- **Push after commit:** Ative se quiser que cada commit manual (via paleta de comandos) seja seguido por um push.
- **Pull updates on startup:** **Ative** para garantir que você puxe as últimas alterações ao abrir o Obsidian (essencial se usar em múltiplos dispositivos).

## Estrutura de Pastas Base (Template Inicial)

A ideia é começar com poucas pastas de alto nível, numeradas para manter a ordem visual no explorador de arquivos. A maior parte da organização virá de [[Links]], #tags e Mapas de Conteúdo (MOCs).

```
├── 00 - Inbox/             # Captura rápida, notas não processadas
│   └── Prompt - Usando o plugin templates no Obsidian.md   # Exemplo de uso do template
├── 10 - Fleeting & Daily/  # Notas diárias, ideias rápidas, journaling
├── 20 - Projects/          # Esforços com começo e fim definidos
│   └── Exemplo Projeto Alpha/ # Exemplo
├── 30 - Areas/             # Áreas de responsabilidade contínua (Saúde, Finanças, Carreira)
│   └── Saúde e Bem-estar/  # Exemplo
│   └── Aprendizado Contínuo/ # Exemplo
├── 40 - Resources/         # Base de conhecimento, tópicos de interesse (Notas permanentes/Zettels)
│   └── Conceitos de Programação/ # Exemplo
│   └── Receitas Culinárias/ # Exemplo
├── 50 - Archives/          # Projetos concluídos, Recursos inativos
├── 90 - Templates/         # Modelos para notas (plugin Templater/Core Templates)
│   └── Template - Documentação de Prompt.md   # Exemplo de template
├── 99 - Meta & Attachments/ # Notas sobre o vault, CSS snippets, e arquivos anexados (opcional)
│   └── Attachments/        # Configurar Obsidian para usar esta pasta para anexos
│   └── README_Vault.md   # Nota explicando a estrutura e convenções do vault
├── .gitignore              # Arquivo para instruir o Git sobre o que ignorar
└── README.md               # Descrição do vault (opcional)
```

**Explicação dos Componentes:**

1.  **`.github/workflows/`**: Pasta para automações com GitHub Actions.
    - `ci.yml`: Um workflow inicial pode simplesmente garantir que o push funcione ou, futuramente, rodar um linter de Markdown, ou até publicar o vault (veremos adiante).
2.  **`.obsidian/`**: Contém todas as configurações do seu vault: temas, snippets CSS, plugins instalados e suas configurações. **É crucial versionar esta pasta** (com exceções, veja `.gitignore`) para manter a consistência entre dispositivos.
3.  **`00 - Inbox/`**: Essencial para capturar ideias rapidamente sem se preocupar onde colocá-las. Processe regularmente.
4.  **`10 - Fleeting & Daily/`**: Ideal para o [[Daily Note]] e pensamentos passageiros. Ótimo lugar para usar templates com o [[Templater]].
5.  **`20 - Projects/`**: Foco em coisas acionáveis. Cada projeto pode ter sua própria subpasta se necessário, mas muitas vezes apenas uma nota principal (`[[Projeto Alpha MOC]]`) linkando para outras notas relacionadas é suficiente.
6.  **`30 - Areas/`**: Mantém o controle de padrões e responsabilidades contínuas. Menos volátil que projetos.
7.  **`40 - Resources/`**: O coração do seu Second Brain. Aqui as notas devem ser atômicas e densamente interligadas (`[[Links]]`). A organização pode começar plana e evoluir com subpastas ou [[Mapa de Conteúdo (MOC)]].
8.  **`50 - Archives/`**: Mantém o vault principal focado no que é ativo ou relevante, sem perder o histórico.
9.  **`90 - Templates/`**: Centraliza os modelos de notas.
10. **`99 - Meta & Attachments/`**: Separa arquivos de configuração/suporte e anexos das notas de conteúdo.
    - `README_Vault.md`: Uma nota interna explicando suas próprias convenções, estrutura, como usar tags, etc. É o seu manual pessoal do vault.
    - Configure o Obsidian em `Settings > Files & Links > Default location for new attachments` para usar `99 - Meta & Attachments/Attachments/`.
11. **`.gitignore`**: Fundamental para manter o repositório limpo.

## Evolução Orgânica do Vault

A estrutura inicial é só um ponto de partida. A verdadeira organização emerge com o uso. Uma coisa é certa: seu vault crescerá! Veja como gerenciar isso sem over-engineering:

1.  **Comece com Notas Atômicas:** Em `40 - Resources/`, crie notas focadas em um único conceito ou ideia. Use títulos descritivos (ex: `[[Princípios do Atomic Design]]`, `[[Como fazer café coado V60]]`).
2.  **Link Abundantemente:** Ao escrever uma nota, crie links para conceitos relacionados (`[[Link Interno]]`). Conecte notas livremente. Use `[[Nova Nota]]` para criar stubs e preenchê-los depois. A estrutura emerge das conexões. Se a nota linkada não existir, o Obsidian facilita sua criação. _Esta é a principal forma de organização._
3.  **Use Tags Estrategicamente:** Tags (`#tag`) são ótimas para _status_, _tipos_ ou _contextos amplos_:
    - Status: `#status/processando`, `#status/concluido`, `#status/ideia`
    - Tipo: `#tipo/livro`, `#tipo/artigo`, `#tipo/pessoa`, `#tipo/conceito`
    - Contexto: `#contexto/trabalho`, `#contexto/pessoal`, `#contexto/saude`
    - Evite usar tags para tudo; prefira links para conexões conceituais.
4.  **Crie MOCs (Maps of Content):** Quando um tópico começa a ter muitas notas relacionadas, crie uma nota "índice" chamada MOC. Ex: `[[MOC Produtividade]]`. Esta nota conterá links para as notas principais sobre produtividade, talvez com uma breve descrição. MOCs são como índices curados e emergentes. MOCs são cruciais para a navegação e o "stewardship" (cuidado) do seu vault à medida que ele cresce. Eles podem viver em `40 - Resources/` ou em `99 - Meta & Attachments/` se preferir.
5.  \***\*Reavalie Pastas:** _Só_ use pastas quando um conjunto de notas _realmente_ pertence a um contexto isolado (como um grande projeto com muitos arquivos específicos ou aulas de um curso), e a navegação por links/MOCs começar a parecer insuficiente. Não tenha medo de mover arquivos ou refatorar pastas se a estrutura atual não fizer mais sentido. Exemplos:
    - `20 - Projects/Nome do Projeto Grande/`
    - `30 - Areas/Saúde e Fitness/`
    - Muitas vezes, um MOC (`[[MOC Projeto X]]`, `[[MOC Saúde]]`) é suficiente. Pergunte-se: "Essa pasta realmente me ajuda a encontrar ou organizar melhor do que um MOC ou tag faria?".
6.  **Refine Templates:** À medida que seus processos de anotação se solidificam, melhore seus templates em `00 - Meta/Templates/` usando plugins como "Templater" para automações mais poderosas.
7.  **`Dataview` para Vistas Dinâmicas:** Este plugin é um divisor de águas. Permite criar listas e tabelas dinâmicas baseadas em metadados (tags, links, campos YAML). Ótimo para criar dashboards de projetos, listas de leitura, etc.
    - Exemplo de Bloco Dataview (em uma nota `[[Dashboard Projetos]]`):
      ````markdown
      ```dataview
      TABLE status, deadline
      FROM "20 - Projects"
      WHERE contains(file.tags, "#status/em-progresso")
      SORT deadline ASC
      ```
      ````

## Plugins

Os plugins do Obsidian expandem significativamente suas funcionalidades, permitindo personalizar o fluxo de trabalho, automatizar tarefas e criar visualizações dinâmicas. Eles transformam o Obsidian em uma ferramenta poderosa e adaptável às suas necessidades específicas, seja para organização pessoal, estudos ou projetos complexos. Explore os plugins para desbloquear todo o potencial do seu vault!

### Core (Ativar nas Configurações)

- `Daily Notes`: Essencial para o fluxo de trabalho diário. Configure para usar a pasta `10 - Fleeting & Daily` e um template.
- `Templates`: Para criar modelos de notas.
- `Backlinks` & `Outgoing Links`: Visualizar conexões.
- `Graph View`: Visualizar a rede de notas.
- `Quick Switcher`: Navegação rápida entre notas.

### Community (Instalar)

#### Essenciais

- **`Obsidian Git`**: **Fundamental** para automatizar `git push/pull`. Configure para fazer commits e pushes automáticos em intervalos regulares ou ao fechar o Obsidian. Não substitui, o uso do Git no terminal ou cliente Git dedicado para operações mais complexas.
- **`Dataview`**: _Fundamental_ para criar visões dinâmicas do seu vault (listas, tabelas) baseadas em metadados (tags, links, campos YAML). **Indispensável** para escalar.
  - _Exemplo em um MOC:_
  ````markdown
  ```dataview
  LIST
  FROM #tipo/livro AND #status/lendo
  SORT file.ctime DESC
  ```
  ````
- **`Periodic Notes`**: Expande as Daily Notes para Semanal, Mensal, Anual, etc. (ótimo para revisões). Ótimo para planejamento e revisão.

#### Recomendados

- **`Commander`**: Permite adicionar comandos (de plugins ou core) à interface do Obsidian (fita, barra de status, menus). Ótimo para otimizar o fluxo de trabalho.
- **`Style Settings`**: Permite customizar opções visuais de temas e plugins que o suportam, sem precisar escrever CSS.

#### Opcionais (depende do uso)

- **`Templater`**: Versão mais poderosa do plugin de Templates, com funções dinâmicas. Essencial para automatizar a criação de notas.
- **`Calendar`**: Interface de calendário para navegar pelas Daily Notes.
- **`Kanban`**: Criar quadros Kanban dentro do Obsidian (útil para `20 - Projects`).
- **`Excalidraw`:** Para desenhos e diagramas baseados em vetor dentro do Obsidian.

## Configurando Obsidian com Git e GitHub

> Dúvidas de como configurar o git no Obsidian? Veja https://forum.obsidian.md/t/the-easiest-way-to-setup-obsidian-git-to-backup-notes/51429

**Pré-requisitos:**

- Git instalado no seu sistema ([https://git-scm.com/downloads](https://git-scm.com/downloads)).
- Conta no GitHub ([https://github.com/](https://github.com/)).
- Obsidian instalado ([https://obsidian.md/](https://obsidian.md/)).

**Passos:**

1.  **Instalar e Configurar o Plugin `Obsidian Git`:**
    - No Obsidian: `Settings > Community Plugins > Browse`.
    - Procure por `Obsidian Git` e clique em `Install`, depois `Enable`.
    - Vá para as opções do plugin `Obsidian Git` (`Settings > Community Plugins > Obsidian Git`).
    - **Configurações Chave:**
      - **Vault backup interval (minutes):** Defina um valor (e.g., `15` ou `30`) para backups automáticos (commit + push). `0` desativa o backup automático por tempo.
      - **Auto push on backup:** **Ative** esta opção se você definiu um intervalo de backup.
      - **Commit message:** Use um template como `chore: backup vault - {{date}} {{time}}` ou `feat: update notes - {{numFiles}} files changed`. O `{{date}}`, `{{time}}` e `{{numFiles}}` são placeholders do plugin.
      - **Push after commit:** Ative se quiser que cada commit manual (via paleta de comandos) seja seguido por um push.
      - **Pull updates on startup:** **Ative** para garantir que você puxe as últimas alterações ao abrir o Obsidian (essencial se usar em múltiplos dispositivos).
2.  **Usando o `Obsidian Git`:**
    - Abra a paleta de comandos (Ctrl+P ou Cmd+P).
    - Digite "Git" para ver os comandos disponíveis:
      - `Obsidian Git: Commit all changes`
      - `Obsidian Git: Push`
      - `Obsidian Git: Pull`
      - `Obsidian Git: Commit and push all changes` (Útil para sync manual rápido)
    - O plugin também adiciona um ícone na barra lateral esquerda que indica se há alterações não commitadas.

## Ideias para CI/CD

- **Backup Automático:** Agendar um `git pull` e `git push` (embora o plugin Obsidian Git geralmente cuide disso).
- **Validação:** Verificar links quebrados (internos/externos), rodar linters de Markdown.
- **Publicação:** Usar ferramentas como [Quartz](https://quartz.jzhao.xyz/), [Hugo](https://gohugo.io/), ou [Jekyll](https://jekyllrb.com/) para gerar um site estático a partir das suas notas.
- **Relatórios:** Gerar relatórios sobre a saúde do vault (notas órfãs, contagem de tags, etc.).

## Conclusão

Esta arquitetura fornece um ponto de partida robusto e flexível. Ela prioriza a conexão de ideias, utiliza Git para segurança e colaboração (mesmo que só consigo mesmo), e está pronta para automação com CI/CD. Lembre-se que o "melhor" sistema é aquele que funciona _para você_ e evolui com suas necessidades. Comece com esta base, use o Obsidian intensivamente, e ajuste a estrutura e os plugins conforme suas necessidades evoluem. O mais importante é a consistência na captura, processamento e conexão das suas notas. Boa jornada com seu Second Brain!
