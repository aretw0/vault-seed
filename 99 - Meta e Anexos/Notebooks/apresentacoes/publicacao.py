import marimo

__generated_with = "0.23.9"
app = marimo.App(
    width="medium",
    layout_file="layouts/publicacao.slides.json",
)


@app.cell
def _():
    import sys
    from pathlib import Path
    _this_dir = Path(__file__).resolve().parent
    _runtime_dir = (
        _this_dir.parent
        if (_this_dir.parent / "_lab_notebook_runtime.py").exists()
        else _this_dir
    )
    if str(_runtime_dir) not in sys.path:
        sys.path.insert(0, str(_runtime_dir))
    import marimo as mo
    from _lab_notebook_runtime import lab_runtime_context, load_lab_manifest, read_lab_dataset
    return lab_runtime_context, load_lab_manifest, mo, read_lab_dataset


@app.cell
def _(lab_runtime_context, load_lab_manifest, read_lab_dataset):
    _ctx = lab_runtime_context()
    _manifest = load_lab_manifest()
    profile = read_lab_dataset("perfil-do-vault", _manifest)
    tier = "WASM (navegador)" if not _ctx["isLocal"] else "Local (desenvolvimento)"
    return profile, tier


@app.cell
def _(mo, profile, tier):
    note_count = profile["noteCount"]
    published = sum(1 for s in profile.get("statuses", []) if s.get("status") == "published")
    mo.md(f"""
    # Publicando com soberania

    Do Markdown no vault ao site, ao canal e ao feed — sem intermediários
    que controlem sua voz ou seus dados.

    **{note_count} notas** · **{published} publicadas** · *{tier}*
    """)
    return (note_count,)


@app.cell
def _(mo):
    mo.md(
        """
        ## O site: Astro + Starlight sobre Markdown

        O site é gerado diretamente das notas. Não há CMS, não há banco de dados,
        não há painel de administração online.

        ```
        Notas Markdown  →  astro build  →  HTML/CSS/JS estático
                                        →  GitHub Pages (ou qualquer host)
        ```

        - Permalinks estáveis baseados no caminho do arquivo
        - Busca client-side sem servidor de busca externo
        - Grafo de links em JSON-LD exportado junto com o site
        - Dark mode, responsivo, acessível por padrão
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Ciclo de vida das notas

        O frontmatter `status:` é o semáforo de publicação:

        | Status | Onde aparece | Quando usar |
        | --- | --- | --- |
        | `draft` | Só no vault local | esboço, em construção, privado |
        | `published` | Site + vault local | pronto para o mundo |
        | *(ausente)* | Só no vault local | nota de trabalho sem status explícito |

        O CI valida que nenhuma nota `published` quebra lint ou links.
        Promover de `draft` para `published` é um ato consciente no frontmatter.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## A Outbox: escreva uma vez, publique em vários canais

        A nota no vault é a fonte de verdade. A outbox converte frontmatter
        em publicação sem reescrever conteúdo ou duplicar arquivos.

        ```yaml
        # frontmatter da nota
        outbox:
          - platform: telegram
            status: approved
          - platform: mastodon
            status: draft
        ```

        ```bash
        dgk outbox publish  # publica os aprovados, atualiza status
        ```

        Cada publicação é rastreável no histórico Git da nota.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Canais disponíveis

        | Canal | Tipo | Autenticação |
        | --- | --- | --- |
        | Telegram | mensagem / canal | bot token + chat ID |
        | Mastodon | toot | access token da instância |
        | Bluesky | post | app password |
        | Buttondown | newsletter | API key |
        | RSS | feed gerado | nenhuma — você controla o endpoint |

        Os quatro primeiros requerem o pacote `dgk-channels` instalado.
        O RSS é gerado automaticamente pelo build do site.
        Credenciais ficam no silo local (`~/.dgk/silo.json`), nunca no repositório.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## RSS como infraestrutura bidirecional

        **Publicar**: o site gera um feed RSS a partir das notas `published`,
        compatível com qualquer leitor. Leitores assinam sem depender de algoritmos.

        **Consumir**: `feeds-assinados.json` é a lista de fontes que você segue.
        O ETL local coleta e normaliza os itens. O Lab analisa e classifica
        com IA. A curation decide o que entra na outbox.

        ```
        Fontes externas → ETL → curadoria-feeds.json → Lab → outbox → publicação
        ```

        RSS como protocolo de soberania: sem plataforma no meio do caminho.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## CI como gatekeeper de qualidade

        O GitHub Actions executa antes de qualquer publicação:

        - Lint de Markdown (markdownlint, prettier)
        - Auditoria de arquitetura da informação
        - Validação de frontmatter e status
        - Build do site com Astro
        - Testes de contratos (notebooks, scripts, estrutura)

        Só chega ao site o que passou em todos os gates.
        O deploy para GitHub Pages é acionado automaticamente após o CI verde.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Governança: publicação é ato explícito

        - Criar uma nota não a publica
        - Criar um notebook não o publica
        - Adicionar um canal não dispara envio automático

        Cada publicação requer uma decisão no frontmatter.
        O CI valida. O Git registra. A outbox executa.

        **Você controla o que sai, quando sai e para onde vai.**
        Nenhuma plataforma decide por você.
        """
    )
    return


if __name__ == "__main__":
    app.run()
