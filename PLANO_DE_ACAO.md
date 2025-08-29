# Plano de Ação - Coesão do Repositório

**Prompt para próxima sessão:**
> Olá! Estamos trabalhando na coesão da comunicação e documentação do repositório `obsidian-vault-template`. O plano de ação está detalhado na checklist abaixo. Por favor, analise os itens que ainda não foram marcados como concluídos ([ ]) e continue o trabalho a partir do próximo item pendente.

---

## Checklist

- [x] **Decisão: Oficializar o Português como Idioma Principal.**
  - **Nota:** Arquivos de "saúde da comunidade" (`README.md`, `CONTRIBUTING.md`, `LICENSE`, etc.) devem manter seus nomes em inglês. Mudar esses nomes é contraproducente, pois desabilita integrações automáticas com plataformas como o GitHub. A regra é: o **nome do arquivo** segue a convenção da plataforma, mas o **conteúdo** é em português.
- [x] **Padronizar Nomes de Arquivos e Pastas:**
  - [x] Renomear `99 - Meta & Attachments/README_Vault.md` para `99 - Meta & Attachments/Manual do Vault.md`.
- [x] **Criar um Guia de Contribuição (`CONTRIBUTING.md`).**
- [x] **Adicionar uma Seção sobre Traduções no `README.md`.**
- [x] **Revisão e Refatoração da Documentação (Estratégia "Dogfooding")**
  - **Estratégia:** Mover a documentação conceitual de arquivos monolíticos (como o `README.md`) para dentro do próprio vault, como uma base de conhecimento interligada. O `README.md` se tornará um "portal" de entrada enxuto.
    - **Critérios de Armazenamento:**
      - **`40 - Resources`**: Para conceitos gerais e atemporais (o "conhecimento teórico"). Ex: Notas sobre PKM, Zettelkasten, MOCs.
      - **`99 - Meta & Attachments`**: Para documentação operacional específica do template (o "manual do usuário"). Ex: Guia de pastas, lista de plugins.
  - ---
  - [x] **1. Refatoração do `README.md`**
    - [x] **Passo 1: Criar o "Guia do Jardineiro Digital"** (anteriormente "Guia do Mochileiro do Vault")
      - [x] Criar a nota principal e renomeá-la.
    - [x] **Passo 2: Migrar Conteúdo (Dogfooding)**
      - [x] Mover a seção "Filosofia Central" para uma nota interna.
      - [x] Mover as seções "Estrutura de Pastas" e "Explicação dos Componentes" para notas internas.
      - [x] Mover a seção "Evolução Orgânica do Vault" para uma ou mais notas internas.
      - [x] Mover a seção "Plugins" para notas internas.
      - [x] Interligar todas as novas notas a partir do "Guia".
    - [x] **Passo 3: Enxugar o `README.md`**
      - [x] Reescrever o `README.md` para ser um "Quick Start Guide", mantendo apenas as seções essenciais e um link destacado para o `[[Guia do Jardineiro Digital]]`.
    - [x] **Passo 4: Revisão e Polimento Final**
      - [x] **Insight 1: Adicionar Navegação de Retorno.**
        - [x] Adicionar um link `Voltar para o [[Guia do Jardineiro Digital]]` no final das notas de documentação para facilitar a navegação.
      - [x] **Insight 2: Criar Notas "Stub" para Links Vermelhos.**
        - [x] Criar arquivos vazios (stubs) para os links de documentação que ainda não existem, convidando à expansão.
      - [x] **Revisão Final de Coesão e Idioma:**
        - [x] Revisar o `README.md` enxuto e todas as novas notas internas para garantir a coesão da comunicação e do idioma.

  - [x] **2. Revisão dos Demais Arquivos (Pós-Refatoração)**
    - [x] **Arquivo: `CONTRIBUTING.md`**
      - [x] Revisar Coesão de Idioma (clareza, termos em português).
      - [x] Revisar Coesão de Comunicação (propósito claro para iniciantes).
      - [x] Revisar Aderência ao Dogfooding (usa os princípios do vault?).
    - [x] **Arquivo: `99 - Meta & Attachments/Manual do Vault.md`**
      - [x] **Estratégia de Refatoração:** Este arquivo tornou-se redundante. A estratégia é salvar seu conteúdo único em notas atômicas e depois deletá-lo.
      - [x] **Passo 1: Criar a nota `[[Convenções e Boas Práticas]]`** em `99 - Meta & Attachments` e mover as seções "Convenções de Nomeação" e "Uso de Tags" para ela.
      - [x] **Passo 2: Criar a nota `[[Visualização do Fluxo do Vault]]`** em `99 - Meta & Attachments` e mover o diagrama Mermaid para ela.
      - [x] **Passo 3: Atualizar o `[[Guia do Jardineiro Digital]]`** com links para as duas novas notas.
      - [x] **Passo 4: Deletar o arquivo `Manual do Vault.md`**.
    - [x] **Arquivo: `00 - Inbox/Prompt - Usando o plugin templates no Obsidian.md`**
      - [x] **Decisão:** O arquivo era um guia e foi movido para `99 - Meta & Attachments/Usando o Plugin Templates.md`.
      - [x] Revisar Coesão de Idioma.
      - [x] Revisar Coesão de Comunicação.
      - [x] Revisar Aderência ao Dogfooding.
    - [x] **Arquivo: `90 - Templates/Template - Documentação de Prompt.md`**
      - [x] **Decisão:** A composição de templates é um recurso de plugins avançados (como o Templater) e não é suportada pelo plugin nativo. Para manter a simplicidade, o template foi mantido como um arquivo único.
      - [x] Revisar Coesão de Idioma (frontmatter corrigido).
      - [x] Revisar Coesão de Comunicação (template claro e funcional).
      - [x] Revisar Aderência ao Dogfooding (consistente com o vault).
