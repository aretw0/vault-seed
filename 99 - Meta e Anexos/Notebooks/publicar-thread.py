import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from _lab_notebook_runtime import (
        get_local_secret,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    outbox = read_lab_dataset("outbox-publicacao", manifest)
    context = lab_runtime_context()
    return context, get_local_secret, manifest, outbox


@app.cell
def _(context, mo, outbox):
    items = outbox.get("items", [])
    social_items = [i for i in items if any(ch in (i.get("channels") or []) for ch in ("mastodon", "bluesky"))]
    newsletter_items = [i for i in items if "newsletter" in (i.get("channels") or [])]
    mo.vstack([
        mo.md(f"""
# Publicar thread e newsletter

Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

| Capacidade | WASM | Local | CI |
|---|:---:|:---:|:---:|
| Prévia de thread (Mastodon/Bluesky) | ✓ | ✓ | ✓ |
| Prévia de newsletter HTML | ✓ | ✓ | ✓ |
| Postar no Mastodon via API | — | ✓ | — |
| Postar no Bluesky via AT Protocol | — | ✓ | — |
| Enviar rascunho no Buttondown | — | ✓ | — |

- itens sociais (Mastodon/Bluesky): **{len(social_items)}**
- itens de newsletter: **{len(newsletter_items)}**
- revisão humana obrigatória: **{outbox.get("policy", {}).get("humanReviewRequired", True)}**
"""),
    ])
    return items, newsletter_items, social_items


@app.cell
def _(mo, social_items):
    def _make_thread(text, limit=270):
        chunks, chunk = [], ""
        for word in str(text or "").split():
            if len(chunk) + len(word) + 1 <= limit:
                chunk += (" " if chunk else "") + word
            else:
                if chunk:
                    chunks.append(chunk)
                chunk = word
        if chunk:
            chunks.append(chunk)
        return chunks

    previews = []
    for _item in social_items:
        _text = _item.get("excerpt") or _item.get("title") or ""
        _channels = [ch for ch in (_item.get("channels") or []) if ch in ("mastodon", "bluesky")]
        _chunks = _make_thread(_text)
        _total = len(_chunks)
        _thread_md = "\n\n".join(
            f"> **{i + 1}/{_total}** {chunk}" for i, chunk in enumerate(_chunks[:5])
        )
        if _total > 5:
            _thread_md += f"\n\n> _(+{_total - 5} partes omitidas)_"
        previews.append(mo.vstack([
            mo.md(f"### {_item.get('title')} → `{', '.join(_channels)}`"),
            mo.md(_thread_md),
        ]))

    mo.vstack([
        mo.md("## Prévia de thread"),
        *(previews if previews else [mo.md("_Nenhum item com canais Mastodon ou Bluesky._")]),
    ])
    return


@app.cell
def _(context, get_local_secret, mo, social_items):
    if not context["isLocal"]:
        mastodon_result = mo.vstack([
            mo.md("## Postar no Mastodon (local)"),
            mo.callout(
                mo.md(
                    "Configure `MASTODON_INSTANCE` (ex: `fosstodon.org`) e `MASTODON_TOKEN` "
                    "no ambiente, depois execute localmente."
                ),
                kind="info",
            ),
        ])
    else:
        import json as _json
        import re as _re
        from urllib.request import Request as _Req, urlopen as _urlopen

        _instance = get_local_secret("MASTODON_INSTANCE")
        _token = get_local_secret("MASTODON_TOKEN")

        if not _instance or not _token:
            mastodon_result = mo.vstack([
                mo.md("## Postar no Mastodon (local)"),
                mo.callout(
                    mo.md(
                        "Variáveis ausentes no ambiente:\n"
                        f"- `MASTODON_INSTANCE`: {'✓' if _instance else '✗ ausente'}\n"
                        f"- `MASTODON_TOKEN`: {'✓' if _token else '✗ ausente'}\n\n"
                        "```sh\nexport MASTODON_INSTANCE=fosstodon.org\nexport MASTODON_TOKEN=...\n```"
                    ),
                    kind="warn",
                ),
            ])
        else:
            _ready = [i for i in social_items if "mastodon" in (i.get("channels") or []) and i.get("publicationStatus") == "ready"]
            _run_post = mo.ui.checkbox(label=f"Postar {len(_ready)} itens prontos no Mastodon (dry-run confirmado)", value=False)
            mastodon_result = mo.vstack([
                mo.md(f"## Postar no Mastodon (local)\n\nInstância: `{_instance}` · {len(_ready)} itens com status `ready`"),
                _run_post,
            ])

    mastodon_result
    return


@app.cell
def _(context, get_local_secret, mo, social_items):
    if not context["isLocal"]:
        bsky_result = mo.vstack([
            mo.md("## Postar no Bluesky (local)"),
            mo.callout(
                mo.md(
                    "Configure `BLUESKY_HANDLE` e `BLUESKY_APP_PASSWORD` no ambiente, "
                    "depois execute localmente. O notebook usa o AT Protocol para autenticar "
                    "e criar posts sem armazenar credenciais no HTML."
                ),
                kind="info",
            ),
        ])
    else:
        import json as _json
        from urllib.request import Request as _Req, urlopen as _urlopen

        _handle = get_local_secret("BLUESKY_HANDLE")
        _password = get_local_secret("BLUESKY_APP_PASSWORD")

        if not _handle or not _password:
            bsky_result = mo.vstack([
                mo.md("## Postar no Bluesky (local)"),
                mo.callout(
                    mo.md(
                        "Variáveis ausentes no ambiente:\n"
                        f"- `BLUESKY_HANDLE`: {'✓' if _handle else '✗ ausente'} (ex: `user.bsky.social`)\n"
                        f"- `BLUESKY_APP_PASSWORD`: {'✓' if _password else '✗ ausente'}\n\n"
                        "Gere um App Password em **Configurações → App Passwords** no Bluesky."
                    ),
                    kind="warn",
                ),
            ])
        else:
            try:
                _req = _Req(
                    "https://bsky.social/xrpc/com.atproto.server.createSession",
                    data=_json.dumps({"identifier": _handle, "password": _password}).encode(),
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with _urlopen(_req, timeout=10) as _resp:
                    _session = _json.loads(_resp.read())
                _access_jwt = _session.get("accessJwt", "")
                _did = _session.get("did", "")
                _ready = [i for i in social_items if "bluesky" in (i.get("channels") or []) and i.get("publicationStatus") == "ready"]
                _run_bsky = mo.ui.checkbox(label=f"Postar {len(_ready)} itens prontos no Bluesky", value=False)
                bsky_result = mo.vstack([
                    mo.md(f"## Postar no Bluesky (local)\n\n`{_handle}` autenticado (`{_did[:20]}…`) · {len(_ready)} itens prontos"),
                    _run_bsky,
                ])
            except Exception as _exc:
                bsky_result = mo.vstack([
                    mo.md("## Postar no Bluesky (local)"),
                    mo.callout(mo.md(f"Erro na autenticação: {_exc}"), kind="warn"),
                ])

    bsky_result
    return


@app.cell
def _(mo, newsletter_items):
    def _md_to_html_simple(text):
        import re as _re
        html = str(text)
        html = _re.sub(r"^### (.+)$", r"<h3>\1</h3>", html, flags=_re.MULTILINE)
        html = _re.sub(r"^## (.+)$", r"<h2>\1</h2>", html, flags=_re.MULTILINE)
        html = _re.sub(r"^# (.+)$", r"<h1>\1</h1>", html, flags=_re.MULTILINE)
        html = _re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
        html = _re.sub(r"\*(.+?)\*", r"<em>\1</em>", html)
        html = _re.sub(r"\n\n+", "</p><p>", html)
        return f"<p>{html}</p>"

    _sections = []
    for _item in newsletter_items:
        _excerpt = _item.get("excerpt") or ""
        _sections.append(f"""
      <tr><td style="padding:24px 0 8px 0;">
        <h2 style="margin:0;font-size:18px;">{_item.get("title", "")}</h2>
        <p style="color:#64748b;font-size:13px;margin:4px 0 0 0;">
          {_item.get("path", "")}
        </p>
      </td></tr>
      <tr><td style="color:#1e293b;line-height:1.6;">
        {_md_to_html_simple(_excerpt[:600])}
      </td></tr>""")

    _html_preview = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Newsletter Preview</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:0 20px;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:24px 0 16px 0;border-bottom:2px solid #e2e8f0;">
      <h1 style="margin:0;font-size:22px;">Newsletter — Vault</h1>
      <p style="color:#64748b;margin:4px 0 0 0;font-size:14px;">
        {len(newsletter_items)} {'item' if len(newsletter_items) == 1 else 'itens'} nesta edição
      </p>
    </td></tr>
    {"".join(_sections) if _sections else "<tr><td><p>Nenhum item com canal newsletter no outbox.</p></td></tr>"}
    <tr><td style="padding:24px 0 0 0;border-top:2px solid #e2e8f0;color:#64748b;font-size:12px;">
      Gerado por vault-seed · analise-outbox pipeline
    </td></tr>
  </table>
</body>
</html>"""

    mo.vstack([
        mo.md(f"## Prévia de newsletter HTML\n\n{len(newsletter_items)} itens com canal `newsletter`"),
        mo.Html(_html_preview) if newsletter_items else mo.callout(
            mo.md("Adicione `newsletter` ao frontmatter `channels` de uma nota para que ela apareça aqui."),
            kind="info",
        ),
    ])
    return


@app.cell
def _(context, get_local_secret, mo, newsletter_items):
    if not context["isLocal"]:
        buttondown_result = mo.vstack([
            mo.md("## Enviar rascunho no Buttondown (local)"),
            mo.callout(
                mo.md("Configure `BUTTONDOWN_API_KEY` no ambiente para criar rascunhos via API."),
                kind="info",
            ),
        ])
    else:
        import json as _json
        from urllib.request import Request as _Req, urlopen as _urlopen

        _key = get_local_secret("BUTTONDOWN_API_KEY")
        if not _key:
            buttondown_result = mo.vstack([
                mo.md("## Enviar rascunho no Buttondown (local)"),
                mo.callout(
                    mo.md(
                        "`BUTTONDOWN_API_KEY` ausente. Configure no ambiente:\n\n"
                        "```sh\nexport BUTTONDOWN_API_KEY=...\n```\n\n"
                        "A chave fica no painel do Buttondown em **Settings → API**."
                    ),
                    kind="warn",
                ),
            ])
        else:
            _ready = [i for i in newsletter_items if i.get("publicationStatus") in ("ready", "published")]
            _run_bd = mo.ui.checkbox(label=f"Criar rascunho com {len(_ready)} itens prontos no Buttondown", value=False)
            buttondown_result = mo.vstack([
                mo.md(f"## Enviar rascunho no Buttondown (local)\n\n{len(_ready)} itens prontos para newsletter"),
                _run_bd,
            ])

    buttondown_result
    return


if __name__ == "__main__":
    app.run()
