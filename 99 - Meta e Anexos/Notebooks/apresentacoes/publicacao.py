import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium", layout_file="layouts/publicacao.slides.json")


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

    Do Markdown no vault ao site, ao feed e, quando fizer sentido, a canais
    externos com revisão antes do envio.

    **{note_count} notas** · **{published} publicadas** · *{tier}*
    """)
    return


@app.cell
def _(mo):
    mo.md("""
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
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Ciclo de vida das notas

    O frontmatter `status:` é o semáforo de publicação:

    | Status | Onde aparece | Quando usar |
    | --- | --- | --- |
    | `draft` | Só no vault local | esboço, em construção, privado |
    | `published` | Site + vault local | pronto para o mundo |
    | *(ausente)* | Só no vault local | nota de trabalho sem status explícito |

    O CI valida que nenhuma nota `published` quebra lint ou links.
    Promover de `draft` para `published` é um ato consciente no frontmatter.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## A Outbox: revisão humana antes de publicar

    Depois que a nota está pronta para o site, a mesma fonte pode alimentar
    canais externos sem virar cópia solta.

    A nota no vault é a fonte de verdade. A outbox lê frontmatter
    para saber o que foi aprovado para cada canal.

    ```yaml
    # frontmatter da nota
    channels:
      - telegram
    publicationStatus: review
    ```

    ```bash
    dgk etl             # atualiza .dgk/outbox-publicacao.json
    dgk outbox telegram # publica notas com channel=telegram
    ```

    Cada publicação é rastreável no histórico Git da nota.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Canais disponíveis

    | Canal | dgk sow (credencial) | dgk outbox (publicar) |
    | --- | --- | --- |
    | Telegram | ✓ bot token + chat ID | ✓ disponível |
    | Mastodon | ✓ access token | — em desenvolvimento |
    | Bluesky | ✓ app password | — em desenvolvimento |
    | Buttondown | ✓ API key | — em desenvolvimento |
    | RSS | — | gerado pelo `astro build` |

    `dgk sow <canal>` configura credenciais e as guarda no silo local.
    `dgk outbox telegram` publica o que está aprovado na fila.
    Os demais canais aceitam credenciais mas ainda não têm publicação automática.
    Credenciais ficam em `~/.dgk/silo.json`, nunca no repositório.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## RSS como infraestrutura bidirecional

    **Publicar**: o site gera um feed RSS a partir das notas `published`,
    compatível com qualquer leitor. Leitores assinam sem depender de algoritmos.

    **Consumir**: `feeds-assinados.json` é a lista de fontes que você segue.
    O ETL local coleta e normaliza os itens. O Lab analisa e classifica
    com IA. A curadoria decide o que entra na outbox.

    ```
    Fontes externas → ETL → curadoria-feeds.json → Lab → outbox → publicação
    ```

    RSS entra como contrato simples: quem assina recebe atualizações sem
    depender do ranking de uma plataforma.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## CI como gatekeeper de qualidade

    O GitHub Actions executa antes de qualquer publicação:

    - Lint de Markdown (markdownlint, prettier)
    - Auditoria de arquitetura da informação
    - Validação de frontmatter e status
    - Build do site com Astro
    - Testes de contratos (notebooks, scripts, estrutura)

    Só chega ao site o que passou nos gates configurados. O deploy pode ser
    automatizado, mas continua dependente do processo que o repositório define.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Governança: publicação é ato explícito

    - Criar uma nota não a publica
    - Criar um notebook não o publica
    - Adicionar um canal não dispara envio automático

    Cada publicação requer uma decisão no frontmatter.
    O CI valida. O Git registra. A outbox executa.

    O ponto é manter a decisão visível no arquivo e revisável no histórico.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Para seguir

    O fio da apresentação é este: publicar no vault é uma decisão registrada,
    não um efeito colateral.

    - `status: published` coloca a nota no site e no RSS
    - `channels` prepara envio para canais externos
    - A outbox separa revisar de publicar
    - O CI impede que o site avance com quebra conhecida

    Fim da apresentação. O próximo passo é escolher uma nota pequena, promover
    para `published`, rodar o build e verificar o resultado antes de conectar
    qualquer canal externo.
    """)
    return


if __name__ == "__main__":
    app.run()
