<%*
// ⚠️ Este template requer o plugin "Templater" para funcionar corretamente.
// Certifique-se de que ele está instalado e o "Trigger Templater on new file creation" está ativado (se desejar automação).
let now = new Date();
let hour = now.getHours();
let greeting = "";
if (hour < 12) greeting = "Bom dia";
else if (hour < 18) greeting = "Boa tarde";
else greeting = "Boa noite";
-%>
# <% greeting %>, Jardineiro! 🌿

> [!quote] Foco do Dia
> Escreva sua prioridade nº 1 aqui.

## 🚀 Ações Rápidas
- 📅 **Criar Nova Nota Diária** (Use o comando "Daily Notes: Open today's daily note" ou configure no menu lateral)
- [[99 - Meta & Attachments/Guia do Jardineiro Digital|📖 Consultar Guia]]

---

## 🏗️ Projetos em Andamento
> [!info]
> Esta seção busca notas em `20 - Projects` com a tag `#status/em-progresso`.

```dataview
TABLE deadline as "Prazo", priority as "Prioridade"
FROM "20 - Projects"
WHERE contains(file.tags, "#status/em-progresso")
SORT deadline ASC
LIMIT 5
```

## 🌾 Sementes Recentes (Últimos 3 dias)
```dataview
LIST
FROM ""
WHERE file.mtime >= date(today) - dur(3 days) AND file.path != this.file.path
SORT file.mtime DESC
LIMIT 10
```

---
> [!example]- ⚡ Dashboard Acionável (Avançado)
> Se você instalar os plugins **QuickAdd** e **Meta Bind**, pode desbloquear botões interativos como este.
> *Remova as aspas simples do bloco abaixo para ativar.*
>
> ```meta-bind-button
> label: + Nova Tarefa
> icon: plus
> style: primary
> action:
>   type: command
>   command: quickadd:choice:capture-task
> ```
