---
title: Criando seu Painel de Controle (Dashboard)
aliases:
  - Dashboard
  - Homepage
  - Painel de Controle
tags:
  - meta/organizacao
  - meta/workflow
  - obsidian/dashboard
  - obsidian/canvas
status: published
created: 2024-01-05
updated: 2024-01-05
category: guia
audience: intermediario
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Plugins Essenciais e Recomendados]]"
  - "[[Templater]]"
  - "[[Bases]]"
  - "[[Dataview]]"
  - "[[MOC Vault Seed]]"
---

# Criando seu Painel de Controle (Dashboard)

Um **Dashboard** no Obsidian é mais do que uma página bonita; é o **centro de comando** do seu cofre. Diferente de um MOC (que serve para navegar pelo *conteúdo*), o Dashboard foca no seu *fluxo de trabalho*: o que você precisa fazer agora? Onde você parou? O que é urgente?

## Filosofia: Fluxo > Estética

É tentador gastar horas criando painéis futuristas que parecem interfaces de naves espaciais. Resista a essa tentação inicialmente. Um bom dashboard deve responder a três perguntas em 5 segundos:

1.  **Onde eu anoto uma ideia rápida?** (Inbox)
2.  **No que eu estava trabalhando?** (Projetos ativos)
3.  **O que eu tenho para hoje?** (Tarefas/Eventos)

## Abordagens para Dashboards

Existem duas formas principais de criar dashboards no Obsidian hoje: a visual (com Canvas) e a estruturada (com Notas).

### 1. A Abordagem Visual (Canvas) 🎨

O **Canvas** é uma superfície infinita onde você pode arrastar e soltar notas, imagens e sites. É excelente para quem pensa visualmente.

*   **Vantagens:** Layout flexível, permite ver o conteúdo de várias notas ao mesmo tempo.
*   **Como fazer:** Crie um novo arquivo `.canvas`. Arraste sua nota de "Tarefas", sua nota de "Projetos Ativos" e uma imagem inspiradora. Organize como quiser.
*   **Dica:** Use cores para agrupar áreas (ex: Verde para Pessoal, Azul para Trabalho).

### 2. A Abordagem "Homepage" (Nota Markdown) 📝

Uma nota padrão do Obsidian, formatada com cuidado. É mais leve e carrega instantaneamente.

*   **Vantagens:** Rápido, funciona bem no mobile, compatível com todos os plugins.
*   **Ferramentas:**
    *   **Callouts:** Use callouts (`> [!info]`) para criar caixas visuais e separar seções.
    *   **Links:** Crie uma barra de navegação no topo com links para seus MOCs principais.
    *   **[[Bases]]/[[Dataview]]:** Use blocos de código para listar dinamicamente suas notas recentes ou tarefas pendentes.

## O "Pulo do Gato": Plugin Homepage 🏠

Independentemente da abordagem escolhida, o dashboard só funciona se você **cair nele** assim que abrir o Obsidian.

Para isso, recomendamos o plugin da comunidade **Homepage**.
1.  Instale e ative o plugin **Homepage**.
2.  Nas configurações do plugin, selecione a nota ou Canvas que você criou para ser seu Dashboard.
3.  Defina para abrir na inicialização (`Open at startup`).

Agora, seu cofre sempre abrirá no seu centro de comando.

### 3. A Abordagem "Daily Driver" (Nota Diária) 📅

Para muitos, o verdadeiro dashboard é o **Hoje**. Se você usa o Obsidian para planejar seu dia, faz mais sentido que sua "Home" seja a Nota Diária atual.

*   **Vantagens:** O dashboard "reseta" todo dia, evitando acúmulo de tralha. Foco total na execução.
*   **Como fazer:**
    1.  Ative o plugin core **Daily Notes**.
    2.  Configure o template para usar o `90 - Modelos/Template - Nova Nota Diaria`.
    3.  Ative a opção "Open daily note on startup" nas configurações do plugin.
*   **Dica:** Seu template diário pode incluir links para seu MOC de Projetos ou Inbox, agindo como um mini-dashboard transiente.

## Elementos Sugeridos para seu Dashboard

*   **Barra de Navegação:** Links para `Inbox`, `Projetos`, `Áreas`, `Recursos`.
*   **Caixa de Entrada:** Um link direto para a pasta `00 - Entrada/` ou uma nota manual de processamento.
*   **Foco Atual:** Uma lista simples (pode ser manual) das 3 prioridades da semana.
*   **Jardim Recente:** Uma query do Dataview listando as últimas notas modificadas.

```dataview
LIST 
FROM "" 
WHERE file.mtime >= date(today) - dur(3 days)
SORT file.mtime DESC
LIMIT 5
```

---
Comece simples. Seu dashboard deve evoluir com você. Se você perceber que nunca olha para uma seção dele, apague-a. O melhor dashboard é aquele que você **usa**.

## Nível 2: O Dashboard Acionável (Actionable Dashboard) ⚡

Um dashboard não precisa ser apenas "leitura". Ele pode ser um painel de controle ativo onde você *executa* tarefas.

### A Pilha de Automação (The Stack)

Para criar botões que fazem coisas (ex: "Criar Projeto", "Adicionar Tarefa"), recomendamos a combinação:
1.  **QuickAdd (Motor):** Você cria a ação ("Capture Task") nas configurações do QuickAdd.
2.  **Meta Bind (Interface):** Você cria um botão no seu dashboard que chama essa ação do QuickAdd.

### Exemplo de Botão
Imagine um botão que captura uma tarefa direto para sua Inbox sem sair da tela.

````markdown
```meta-bind-button
label: + Nova Tarefa
icon: plus
style: primary
action:
  type: command
  command: quickadd:choice:capture-task
```
````
*(Nota: Você precisará copiar o ID correto do comando usando a paleta de comandos do Obsidian > "Meta Bind: Select and copy command id").*
