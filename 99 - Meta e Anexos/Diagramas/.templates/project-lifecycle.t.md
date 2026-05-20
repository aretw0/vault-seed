<!-- mdt template — edite este arquivo e rode `mdt update` para regenerar Exemplos.md -->

<!-- {@project-lifecycle} -->
```mermaid
stateDiagram-v2
    [*] --> Ideia : nova ideia capturada
    Ideia --> Planejando : decidir avançar
    Planejando --> Ativo : começar
    Ativo --> Pausado : bloquear / deprioritizar
    Pausado --> Ativo : retomar
    Ativo --> Concluído : objetivo atingido
    Concluído --> Arquivo : mover para 50 - Arquivo
    Arquivo --> [*]
    Planejando --> Cancelado : desistir
    Cancelado --> [*]
```
<!-- {/project-lifecycle} -->
