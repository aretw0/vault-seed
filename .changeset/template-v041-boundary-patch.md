---
"digital-gardening-kit": patch
---

v0.4.1: footer author configurável, fronteira template/usuário e documentação dos pacotes.

**Footer — author/holder configurável** — o nome do titular no rodapé agora vira
link quando há `license.holderUrl` em `vault.config.json` (Footer renderiza
`activeHolderUrl`; uma nota pode sobrescrever via frontmatter `authorUrl`). O
`initialize.yml` deriva o owner de `GITHUB_REPOSITORY` e define
`license.holder`/`license.holderUrl` para o perfil do novo dono — antes o vault
gerado herdava silenciosamente a identidade do mantenedor (só o `kudos` era
limpo). Para o vault-seed, o holder aponta para `github.com/aretw0`.

**Inicialização** — `initialize.yml` agora também remove `publish-lab-runtime.yml`
(publish PyPI, exclusivo do trusted publisher do mantenedor) e
`scripts/lab_runtime_version_contract.test.mjs`, que o glob de testes do vault
gerado executaria. O `smoke_template.js` ganhou um contrato que calcula do disco
que todo `publish-*.yml` e os contratos de versão de mantenedor estejam na lista
de remoção — um futuro workflow de publish ou guard de versão não vaza
silenciosamente para vaults de usuário.

**Documentação dos pacotes** — READMEs adicionados aos pacotes publicáveis que
não tinham (`@aretw0/dgk-astro-plugins`, `@aretw0/dgk-channels`,
`@aretw0/dgk-runner`, `@aretw0/dgk-skills`); `dgk-lab-runtime` promovido a
`Development Status :: 4 - Beta`; o ROADMAP do CLI foi realocado de um diretório
órfão para `packages/cli/`.
