---
title: Usando o Vault no Celular vs. Desktop
aliases:
  - Sincronização Mobile
  - Vault Multiplataforma
tags:
  - meta/sincronizacao
  - meta/mobile
  - meta/desktop
status: published
created: 2023-10-27
updated: 2023-10-27
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
---
# Usando o Vault no Celular vs. Desktop

Utilizar seu vault em múltiplos dispositivos é um dos grandes benefícios desta abordagem. Para garantir a melhor performance e controle, recomendamos separar a edição das notas da sincronização. A filosofia é: use o Obsidian para o que ele faz de melhor (escrever e conectar ideias) e use uma ferramenta dedicada para sincronização com Git.

**Analogia:** Pense no Obsidian como sua mesa de trabalho e no aplicativo de Git como o serviço de correio. Você organiza suas ideias na mesa e, quando estiver pronto, usa o correio para enviar e receber as atualizações do seu arquivo central (o repositório no GitHub).

### Lidando com Conflitos de Sincronização

Independentemente da ferramenta, a regra de ouro para evitar conflitos é: **sincronize (pull) antes de começar a escrever e sincronize (push) quando terminar**.

Um conflito acontece quando a mesma nota é alterada em dois lugares diferentes sem sincronização. A ferramenta de Git irá alertá-lo, e você precisará escolher qual versão manter.

## Ferramentas de Sincronização Recomendadas

### Desktop (Windows, macOS, Linux)

A recomendação principal para o desktop é o **[GitHub Desktop](https://desktop.github.com/)**.

*   **Por quê?** É uma ferramenta visual, gratuita e muito intuitiva. Ela simplifica o processo de `commit` e `sync` para um ou dois cliques.
*   **Fluxo de Trabalho:**
    1.  Escreva e edite suas notas no Obsidian.
    2.  Ao final de uma sessão de trabalho, abra o GitHub Desktop.
    3.  Ele mostrará todos os arquivos que você alterou.
    4.  Escreva um breve resumo das suas mudanças (sua mensagem de `commit`).
    5.  Clique em "Commit" e depois em "Push" para enviar suas alterações para o GitHub.
    6.  Antes de começar a trabalhar, clique em "Fetch" ou "Pull" para baixar as últimas alterações.

### Mobile (Android & iOS)

No celular, a abordagem é similar, usando aplicativos que se integram ao sistema de arquivos.

*   **Android:**
    *   **Recomendado:** **[GitSync](https://github.com/GitSync-App/GitSync)**. É um aplicativo de código aberto projetado para sincronizar repositórios Git no seu dispositivo. Configure-o para apontar para a pasta do seu vault.
    *   **Avançado:** **[Termux](https://termux.dev/)**. Oferece um ambiente de linha de comando completo no Android, permitindo usar o Git como no desktop. **Atenção:** Requer familiaridade com comandos de terminal.

*   **iOS:**
    *   **TODO:** Estamos em busca de uma ferramenta para iOS que ofereça uma experiência de sincronização Git tão simples quanto o GitHub Desktop. Opções como o [Working Copy](https://workingcopy.app/) existem, mas podem ter um custo. Se você conhece uma boa alternativa, sinta-se à vontade para adicionar aqui!

---
Voltar para o [[Guia do Jardineiro Digital]]