# Usando o Git e o GitHub para Sincronizar seu Vault

Este vault é configurado para ser sincronizado usando o Git e o GitHub, permitindo um controle de versão robusto e um backup seguro na nuvem.

A principal ferramenta para isso dentro do Obsidian é o plugin `Obsidian Git`.

## O Jardim Colaborativo: Como Contribuímos para o Vault

Mesmo que você seja o único jardineiro deste vault, ou se ele for compartilhado com outros, a forma como as mudanças são incorporadas é crucial para a saúde e organização do nosso jardim digital. Pense no processo de contribuição como o cuidado com as plantas antes de transplantá-las para o canteiro principal.

### 🌿 O "Rascunho Seguro" (Branch)

Antes de fazer qualquer alteração significativa, criamos um "rascunho seguro". No Git, isso é chamado de **branch**. É como ter um canteiro de testes separado, onde você pode experimentar, podar e replantar suas ideias sem afetar o jardim principal (`main`).

*   **Praticidade:** Você pode trabalhar em uma nova nota, refatorar uma seção ou corrigir um erro sem se preocupar em quebrar algo no jardim principal.
*   **Controle:** Se algo der errado no seu rascunho, é fácil descartá-lo e começar de novo, sem deixar rastros no `main`.

### 📝 A "Proposta de Melhoria" (Pull Request)

Quando sua nova planta (ideia, nota, correção) está pronta no seu "rascunho seguro", você a apresenta para ser incorporada ao jardim principal. No GitHub, isso é uma **Pull Request (PR)**, ou como chamamos, uma "Proposta de Melhoria".

É o momento em que o jardineiro-chefe (ou outros jardineiros, em um vault colaborativo) revisa sua proposta. Eles podem:

*   **Sugerir Ajustes:** "Que tal mover essa planta para um local com mais sol?" (Feedback para melhorias).
*   **Validar a Saúde:** Verificar se a nova planta está saudável e não trará pragas para o jardim (verificações automatizadas de CI/CD).
*   **Aprovar a Incorporação:** Se tudo estiver certo, sua planta é transplantada para o canteiro principal (`main`).

### O Compromisso do Jardineiro-Chefe

**Mesmo o jardineiro-chefe (o administrador deste vault) segue este processo de "Rascunho Seguro" e "Proposta de Melhoria".** Isso garante que todas as mudanças passem pelo mesmo controle de qualidade, mantendo a integridade e a beleza do jardim para todos.

## Benefícios para o Nosso Jardim Digital

Adotar este fluxo de trabalho traz inúmeros benefícios:

*   **Qualidade e Consistência:** Todas as mudanças são revisadas, garantindo que o conhecimento seja preciso e siga os padrões do vault.
*   **Histórico Limpo:** O branch principal (`main`) permanece sempre estável e reflete apenas as "colheitas" aprovadas.
*   **Colaboração Segura:** Permite que múltiplos jardineiros trabalhem simultaneamente sem conflitos, e que novas ideias sejam incorporadas de forma organizada.
*   **Transparência:** O processo de revisão é visível, e todos podem entender como as decisões são tomadas.

## Próximos Passos

Para detalhes técnicos sobre como executar esses passos (criar branches, fazer commits, abrir Pull Requests), consulte o documento [Diretrizes de Contribuição](CONTRIBUTING.md).

Para entender como o versionamento e as releases funcionam para marcar as "colheitas" do nosso jardim, consulte o documento [Processo de Release e Versionamento](docs/processo-de-release.md).

---
Voltar para o [[Guia do Jardineiro Digital]]
