---
title: Licença e Uso do Vault
tags: [licença, software, conteúdo, creative-commons, gpl]
sidebar:
  order: 95
---

# Licença e Uso do Vault

Este vault tem duas camadas de licença — uma para o **software** (os scripts,
workflows e componentes que fazem o vault funcionar) e outra para o
**conteúdo** (suas anotações, projetos e diário).

---

## Software — GPL-3.0

O código-fonte deste template está sob a **GNU General Public License v3.0**
(GPL-3.0-only). Isso cobre:

- Workflows do GitHub Actions (`.github/`)
- Scripts de automação (`scripts/`)
- Componentes Astro (`.site/components/`, `.site/styles/`)
- Pacotes publicados (`packages/`)
- Arquivos de configuração (`astro.config.mjs`, `package.json`, etc.)

Se você redistribuir versões modificadas do template (não apenas do seu
conteúdo), o GPL exige que você disponibilize o código-fonte e mantenha o aviso
de licença. Veja [LICENSE.md](/LICENSE.md) para o texto completo.

---

## Conteúdo — Seus Termos

Suas anotações, entradas de diário e documentos Markdown são **seus**. O GPL
não se aplica ao conteúdo que você cria — ele só governa o software.

Você pode licenciar seu conteúdo como preferir. Algumas opções comuns:

| Licença | Quando usar |
|---------|------------|
| [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Compartilhamento aberto com atribuição |
| [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Compartilhamento com copyleft |
| [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) | Compartilhamento não-comercial |
| Todos os direitos reservados | Sem redistribuição |

Para declarar uma licença de conteúdo, adicione uma nota no seu `README.md` ou
no rodapé do site. Exemplo:

```markdown
O conteúdo deste vault está licenciado sob
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
exceto onde indicado de outra forma.
```

---

## Dependências de Terceiros

As dependências principais e suas licenças estão documentadas em
[NOTICE.md](/NOTICE.md). Todas as dependências de tempo de execução utilizam
licenças de código aberto permissivas (MIT, Apache-2.0).
