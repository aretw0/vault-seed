<!-- mdt template — edite este arquivo e rode `mdt update` para regenerar Exemplos.md -->

<!-- {@project-lifecycle} -->
```mermaid
stateDiagram-v2
    state "Concluído" as Concluido
    [*] --> Ideia : nova ideia capturada
    Ideia --> Planejando : decidir avançar
    Planejando --> Ativo : começar
    Ativo --> Pausado : bloquear ou deprioritizar
    Pausado --> Ativo : retomar
    Ativo --> Concluido : objetivo atingido
    Concluido --> Arquivo : mover para 50 - Arquivo
    Arquivo --> [*]
    Planejando --> Cancelado : desistir
    Cancelado --> [*]
```
<!-- {/project-lifecycle} -->
