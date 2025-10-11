# Como Criar Apresentações com o Plugin Slides do Obsidian

O Obsidian possui um plugin nativo de Slides que permite transformar suas notas Markdown em apresentações de forma simples e rápida. Ele é ideal para compartilhar seu conhecimento diretamente do seu "Jardim Digital".

## Princípios Básicos

O plugin de Slides interpreta a sintaxe Markdown padrão para criar os slides. A chave para a separação dos slides é o uso de `---` (três hífens) em uma linha separada.

## Sintaxe Essencial

### 1. Separar Slides

Cada slide é delimitado por uma linha contendo apenas `---`.

```markdown
# Título do Slide 1

Conteúdo do primeiro slide.

---

# Título do Slide 2

Conteúdo do segundo slide.
```

### 2. Separar Conteúdo Dentro de um Slide (Regra Horizontal)

Você pode usar `---` para criar uma linha horizontal dentro de um slide, mas para que funcione como separador de slide, ele deve estar em uma linha *sozinho*. Se você quiser uma linha horizontal dentro de um slide, certifique-se de que haja conteúdo antes e depois dela na mesma "seção" do slide.

### 3. Títulos e Formatação

Use os cabeçalhos Markdown (`#`, `##`, etc.) para os títulos dos seus slides e subtítulos. A formatação padrão (negrito, itálico, listas, links, imagens) funciona como esperado.

```markdown
# Meu Primeiro Slide

## Subtítulo Importante

- Item 1
- Item 2

**Texto em negrito** e *texto em itálico*.

![Imagem do Jardim](attachments/minha-imagem.png)
```

### 4. Blocos de Código

Blocos de código são suportados e renderizados de forma limpa.

```markdown
```python
def regar_planta(planta):
    print(f"Regando {planta}...")
```
```

### 5. Notas do Apresentador (Speaker Notes)

Para adicionar notas que só você verá durante a apresentação, use `???` (três pontos de interrogação) em uma linha separada após o conteúdo do slide.

```markdown
# Slide com Notas

Este é o conteúdo visível do slide.

???
Esta é uma nota para mim, o apresentador.
Posso adicionar pontos de discussão aqui.
```

### 6. Fragmentos (Conteúdo que Aparece Gradualmente)

Para fazer com que partes do seu slide apareçam uma de cada vez, use `---` (três hífens) *dentro* do conteúdo do slide, mas com um espaço antes e depois, ou em uma linha separada, dependendo do efeito desejado. O mais comum é usar `---` para separar blocos de conteúdo que você quer que apareçam sequencialmente.

```markdown
# Slide com Fragmentos

Primeiro ponto a aparecer.

---

Segundo ponto, aparece depois de um clique.

---

Terceiro ponto, aparece no próximo clique.
```

## Como Iniciar a Apresentação

1.  Abra a nota Markdown que você deseja apresentar.
2.  No canto superior direito da janela do Obsidian, clique no ícone de "Mais opções" (três pontos).
3.  Selecione "Start presentation" (Iniciar apresentação).

Seu "Jardim Digital" está pronto para ser compartilhado!
