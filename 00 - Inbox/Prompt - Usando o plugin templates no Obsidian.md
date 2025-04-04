---
creation date: 2025-04-04
tags:
  - obsidian
  - templates
  - core-plugins
  - workflows
  - prompts
  - ai
ai model: Gemini 2.5 Pro Experimental 03-25
---
# Prompt: Prompt - Usando o plugin templates no Obsidian

**Data de Execução:** 2025-04-04

## 🎯 Objetivo do Prompt

Descrever como usar o plugin templates no Obsidian

## ⚙️ System Instructions / Configuração Inicial

Você é um especialista no conceito de second brain a partir do Obsidian. Gere respostas compatíveis com anotações do Obsidian. Se necessário use snippets de código para ilustrar algum conceito.

## 💬 Conteúdo do Prompt Enviado

como criar templates no obsidian usando o core plugin templates? Me dê um template para documentar os prompts que eu executo onde temos o título do prompt, o conteúdo de System Instructions, o conteúdo do prompt e o resultado da execução do prompt.

## ✅ Resultado da Execução

```
Okay, vamos criar um guia sobre como usar o plugin core de Templates no Obsidian e, em seguida, fornecer o template específico que você solicitou para documentar prompts.

      `--- tags: #obsidian #templates #core-plugins #workflows #prompts #ai date: {{date}} ---`
    

# Como Usar o Plugin Core "Templates" no Obsidian

O plugin core "Templates" permite criar modelos de notas que podem ser inseridos rapidamente, economizando tempo e garantindo consistência.

## 1. Habilitar o Plugin

1. Vá para Settings (Configurações - ícone de engrenagem no canto inferior esquerdo).
    
2. No menu lateral, clique em Core Plugins.
    
3. Procure por Templates na lista.
    
4. Ative o botão ao lado de Templates.
    

## 2. Configurar o Plugin

1. Com o plugin Templates ainda selecionado (ou navegando até Settings > Plugin Options > Templates), você verá as opções de configuração:
    
    - **Template folder location (Localização da pasta de templates):** Especifique a pasta onde você armazenará seus arquivos de template. É uma boa prática criar uma pasta específica para isso, como 90 - Templates (seguindo a arquitetura sugerida anteriormente). Clique no campo e digite o nome da pasta (e.g., 90 - Templates). O Obsidian pode se oferecer para criar a pasta se ela não existir.
        
    - **Date format (Formato da data):** Defina como a variável {{date}} será formatada. O padrão é YYYY-MM-DD. Você pode usar a sintaxe do [Moment.js](https://www.google.com/url?sa=E&q=https%3A%2F%2Fmomentjs.com%2Fdocs%2F%23%2Fdisplaying%2Fformat%2F) para personalizar (e.g., DD/MM/YYYY para o formato brasileiro).
        
    - **Time format (Formato da hora):** Defina como a variável {{time}} será formatada (e.g., HH:mm).
        
    - **Replace template on insertion (Substituir template na inserção):** Geralmente, você deixará isso desativado, a menos que tenha um caso de uso muito específico para substituir o conteúdo existente ao inserir um template.
        

## 3. Criar um Arquivo de Template

1. Navegue até a pasta que você designou como Template folder location (e.g., 90 - Templates) no explorador de arquivos do Obsidian.
    
2. Crie uma nova nota dentro desta pasta. O nome desta nota será o nome do seu template. Por exemplo, crie a nota Template - Documentação de Prompt.md.
    
3. Edite o conteúdo desta nota para criar seu modelo. Você pode usar texto normal, formatação Markdown e as variáveis de template disponíveis ({{date}}, {{time}}, {{title}} - que insere o título da nota onde o template está sendo inserido).
    

## 4. Usar um Template

1. Crie ou abra a nota onde você deseja inserir o template.
    
2. Abra a Paleta de Comandos (Ctrl+P ou Cmd+P).
    
3. Digite "Template" e selecione Templates: Insert template.
    
4. Uma lista dos seus templates disponíveis (arquivos na pasta de templates) aparecerá. Selecione o template desejado (e.g., Template - Documentação de Prompt).
    
5. O conteúdo do template será inserido na sua nota atual, na posição do cursor, com as variáveis (como {{date}} e {{time}}) substituídas pelos valores atuais.
    

**Dica:** Você também pode definir um hotkey (atalho de teclado) para o comando Templates: Insert template em Settings > Hotkeys para acesso ainda mais rápido.

---

# Template para Documentação de Prompt

Aqui está um template que você pode salvar na sua pasta de templates (e.g., 90 - Templates/Template - Documentação de Prompt.md) para documentar seus prompts:

      `--- tags: #prompt #ai #documentacao #{{date}}  date: {{date}} model: # Adicione o modelo de IA usado (ex: #gpt4, #claude3, #gemini) ---  # Prompt: {{title}}  **Data de Execução:** {{date}} às {{time}}  ## 🎯 Objetivo do Prompt    ## ⚙️ System Instructions / Configuração Inicial  ```text <!-- Cole aqui as instruções de sistema ou configurações prévias usadas, se houver. -->`
    

IGNORE_WHEN_COPYING_START

content_copy download

Use code [with caution](https://support.google.com/legal/answer/13505487).Markdown

IGNORE_WHEN_COPYING_END

## 💬 Conteúdo do Prompt Enviado

      `<!-- Cole aqui o texto exato do prompt que você enviou para a IA. -->`
    

IGNORE_WHEN_COPYING_START

content_copy download

Use code [with caution](https://support.google.com/legal/answer/13505487).Text

IGNORE_WHEN_COPYING_END

## ✅ Resultado da Execução

<!-- Cole ou descreva o resultado/resposta gerado pela IA aqui. -->  

## 🤔 Análise e Observações

- O resultado atendeu ao objetivo? (Sim/Parcialmente/Não)
    
- O que funcionou bem?
    
- O que poderia ser melhorado no prompt ou nas instruções?
    
- Ideias para iterações futuras.
    

---

      ``**Como usar este template específico:**  1.  Salve o código acima como um arquivo `.md` na sua pasta de templates configurada (e.g., `90 - Templates/Template - Documentação de Prompt.md`). 2.  Quando quiser documentar um novo prompt, crie uma nova nota (e.g., `Prompt - Resumo de Artigo Científico.md`). 3.  Use a Paleta de Comandos (`Ctrl+P` ou `Cmd+P`) -> `Templates: Insert template` -> Selecione `Template - Documentação de Prompt`. 4.  O template será inserido na nota. O título da nota (`Prompt - Resumo de Artigo Científico`) substituirá `{{title}}`. A data e hora atuais substituirão `{{date}}` e `{{time}}`. 5.  Preencha as seções: Objetivo, System Instructions (se houver), o Prompt exato, o Resultado obtido e suas observações. Adicione a tag do modelo de IA usado no frontmatter YAML (onde tem `model:`).  Este template fornece uma estrutura clara para registrar e analisar seus experimentos com prompts de IA dentro do seu Second Brain no Obsidian.``
    

IGNORE_WHEN_COPYING_START

content_copy download

Use code [with caution](https://support.google.com/legal/answer/13505487).

IGNORE_WHEN_COPYING_END
```
