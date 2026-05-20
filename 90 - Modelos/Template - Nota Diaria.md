<%*
// ⚠️ Este template requer o plugin "Templater" para funcionar corretamente.
// Certifique-se de que ele está instalado e configurado para rodar em novos arquivos.
let now = tp.date.now("YYYY-MM-DD");
let friendlyDate = tp.date.now("dddd, D [de] MMMM [de] YYYY");
-%>
# <% friendlyDate %>

> [!quote] O que faria hoje ser um dia excelente?
> Escreva aqui sua meta principal.

## 📝 Log Rápido
- [ ]

## 🧠 Fleeting Notes
<!-- Anote ideias rápidas aqui para processar depois -->

---
## 🔍 Revisão do Dia
- [ ] Processar Inbox
- [ ] Atualizar status dos projetos

### 🧹 Pendências Anteriores
> [!warning] Tarefas não concluídas de dias anteriores (`10 - Diário`)
```dataview
TASK
FROM "10 - Diário"
WHERE !completed AND file.day < this.file.day
```

## 🔮 Próximos Passos
> [!info]
> O que ficou pendente para amanhã?
