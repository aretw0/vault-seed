# Convergência: Telegram soberano via TDLib — feedback/direção pro refarm

> Doc de desenvolvimento do vault-seed (removido pelo `initialize.yml`). Direção de bloco pro ecossistema,
> gerada pelo consumo (feedback ao refarm). Genérico — sem detalhes de trabalho/certame.

## A lacuna

O vault-seed hoje fala com Telegram via **bot API** (`telegram:inbox` / `telegram:outbox`). Isso serve pra
publicar/receber num canal, mas **não é soberano**: depende de um bot, e o dado passa por um intermediário.
Para o caso de uso de **identidade/carteira soberana** — o cidadão conectando um serviço com **consentimento
consciente** e o **dado ficando local** — o bot API é insuficiente.

## O bloco que resolve: TDLib

[**TDLib**](https://core.telegram.org/tdlib) (Telegram Database Library) é o **cliente Telegram completo**
oficial: implementa **MTProto**, **criptografia (com chave do usuário)**, um **banco de dados local
persistente no device**, e o estado de conversas — tudo assíncrono, exposto por uma ABI C (bindings em
qualquer linguagem via FFI). O app embute o TDLib como backend e provê a UI.

**Por que é soberano:** a conexão usa as **credenciais do próprio usuário** (não um bot de terceiros), e as
mensagens vivem num **banco local criptografado** (o do TDLib). É o oposto de um bot puxando teu dado pra um
servidor — é o teu cliente, teu dado, tua chave.

## A prova de que "acontece naturalmente": mithka

[`iebb/mithka`](https://github.com/iebb/mithka) é um cliente Telegram completo (Flutter + TDLib via FFI) que
conecta contas reais com as **credenciais do próprio usuário**. Demonstra que, com TDLib assimilado,
ferramentas Telegram soberanas (cliente alternativo, arquivo local, integração consentida) **viram naturais**
— sem forkar o protocolo nem o backend.

## A direção de assimilação (refarm-ward)

Um **adapter Telegram-via-TDLib** no ecossistema, encaixando nos primitivos que já existem:

| Papel | Primitivo | O que o TDLib dá |
|---|---|---|
| **Fonte** | `source:v1` / `source-web`-style | mensagens/chats → `records:v1` (o dado vira record local) |
| **Canal** | `channel-policy` | enviar/receber por policy declarada |
| **Consentimento** | `credentials:v1` (VC) | a conexão lastreada por VC revogável — o cidadão concede e revoga |
| **Soberania** | banco local do TDLib | dado criptografado no device, credenciais do usuário |

**Fronteira:** TDLib é nativo pesado (C++); o adapter o embrulha (FFI/binding nativo, ou um plugin host que
o carrega). É um bloco **refarm-ward** (dono do adapter de fonte/canal), consumido pelo vault-seed e por
qualquer downstream. Genérico: um "Telegram soberano", não um caso específico.

## Ação (quando o refarm liberar)

Feedback pro refarm: **assimilar TDLib como adapter de fonte/canal Telegram** (source→records + channel),
com o consentimento por `credentials:v1`. Não bloqueia nada agora; é a direção pra uma conexão Telegram
**real e soberana** substituir o bot API quando fizer sentido. Liga `docs/convergencia-refarm-status.md`.
