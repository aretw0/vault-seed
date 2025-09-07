#!/bin/bash

# --- Configuração Inicial e Verificação de Pré-requisitos ---

# Variável para controlar a exclusão automática do backup.
# 0 = Não exclui automaticamente (requer interação).
# 1 = Exclui automaticamente (usado com --auto-delete-backup).
AUTO_DELETE_BACKUP=0

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --auto-delete-backup)
            AUTO_DELETE_BACKUP=1
            shift
            ;;
        *)
            PATH_TO_REMOVE="$1"
            shift
            ;;
    esac
done

# Verifica se o caminho foi fornecido como argumento
if [ -z "$PATH_TO_REMOVE" ]; then
    echo "Uso: $0 <caminho_a_remover> [--auto-delete-backup]"
    echo "Exemplo: $0 "10 - Fleeting & Daily/Meu Arquivo Secreto.md" --auto-delete-backup"
    exit 1
fi
REPO_PATH="$(pwd)" # Caminho absoluto do repositório atual
REPO_NAME="$(basename "$REPO_PATH")" # Nome do diretório do repositório
PARENT_PATH="$(dirname "$REPO_PATH")" # Caminho do diretório pai do repositório

echo "--- Iniciando o processo de remoção do histórico do Git ---"
echo "Caminho a ser removido: $PATH_TO_REMOVE"
echo "Caminho do repositório: $REPO_PATH"

# Verifica se git-filter-repo está instalado
echo "Verificando a instalação do git-filter-repo no WSL..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "Erro: git-filter-repo não encontrado. Por favor, instale-o antes de continuar."
    echo "Você pode instalá-lo com 'pip install git-filter-repo' ou 'pipx install git-filter-repo'."
    exit 1
fi
echo "git-filter-repo está instalado."

# Verifica se é um repositório Git válido
echo "Verificando se o diretório atual é um repositório Git válido..."
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Erro: O diretório atual não é um repositório Git válido."
    exit 1
fi
echo "Diretório atual é um repositório Git válido."

# Captura o URL remoto original antes que o git-filter-repo modifique o repositório
ORIGINAL_REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$ORIGINAL_REMOTE_URL" ]; then
    echo "Erro: Não foi possível obter o URL do remote 'origin' do repositório atual. Por favor, verifique a configuração do seu remote."
    exit 1
fi
echo "URL do remote 'origin' original capturado: $ORIGINAL_REMOTE_URL"

# --- Fim da Configuração Inicial e Verificação de Pré-requisitos ---

# --- Backup Espelho ---
echo "--- Criando backup espelho do repositório ---"
BACKUP_DIR="${PARENT_PATH}/${REPO_NAME}.bak"

if [ -d "$BACKUP_DIR" ]; then
    if [ "$AUTO_DELETE_BACKUP" -eq 0 ]; then
        read -p "Aviso: Diretório de backup '${BACKUP_DIR}' já existe. Deseja removê-lo para criar um novo? (y/N): " -n 1 -r
        echo # (optional) move to a new line
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Operação cancelada pelo usuário. Diretório de backup existente mantido."
            exit 1
        fi
    else
        echo "Aviso: Diretório de backup '${BACKUP_DIR}' já existe. Removendo para criar um novo backup (auto-delete ativado)."
    fi
    rm -rf "$BACKUP_DIR"
fi

# Navega para o diretório pai, clona o repositório como espelho e volta
(cd "$PARENT_PATH" && git clone --mirror "$REPO_NAME" "$REPO_NAME.bak")

if [ $? -ne 0 ]; then
    echo "Erro: Falha ao criar o backup espelho. Abortando."
    exit 1
fi
echo "Backup espelho criado em: ${BACKUP_DIR}"
# --- Fim do Backup Espelho ---

# --- Execução do git-filter-repo ---
echo "--- Executando git-filter-repo para remover o caminho do histórico ---"
# O --force é necessário para sobrescrever o histórico no repositório atual
# O --preserve-refs default é 'all', o que inclui branches e tags
git filter-repo --path "$PATH_TO_REMOVE" --invert-paths --force

if [ $? -ne 0 ]; then
    echo "Erro: Falha na execução do git-filter-repo. Abortando."
    exit 1
fi
echo "git-filter-repo executado com sucesso. Histórico reescrito localmente."

# --- Finalização do Ambiente Local ---
echo "--- Finalizando o ambiente local ---"
# git reset --hard HEAD # Removido: git-filter-repo já atualiza o working directory
echo "Ambiente local atualizado pelo git-filter-repo."

# --- Fim da Sincronização e Finalização ---

# --- Verificação Pós-Limpeza ---
echo "--- Verificando se o caminho foi removido do histórico ---"
# Verifica em todas as branches locais
BRANCHES=$(git branch --format="%(refname:short)")
FILE_FOUND=0
for branch in $BRANCHES; do
    if [ -n "$(git log "$branch" -- "$PATH_TO_REMOVE")" ];
    then
        echo "Erro: O caminho '$PATH_TO_REMOVE' ainda foi encontrado no histórico da branch '$branch'."
        FILE_FOUND=1
    fi
done

if [ $FILE_FOUND -eq 1 ]; then
    echo "Erro: O caminho não foi completamente removido do histórico. Por favor, verifique manualmente."
    exit 1
else
    echo "Verificação concluída: O arquivo '$PATH_TO_REMOVE' foi removido do histórico de todas as branches locais."
fi
# --- Fim da Execução e Verificação ---

# --- Sincronização com o Remoto ---
echo "--- Sincronizando com o repositório remoto ---"

# Remove o remote 'origin' se ele existir para garantir uma adição limpa
git remote remove origin 2>/dev/null

# Adiciona o remote 'origin' novamente (git-filter-repo o remove)
echo "Adicionando o remote 'origin' novamente..."
echo "Debug (antes de adicionar): ORIGINAL_REMOTE_URL é: $ORIGINAL_REMOTE_URL"

# Tenta adicionar o remote. Se falhar, tenta setar a URL.
git remote add origin "$ORIGINAL_REMOTE_URL"
if [ $? -ne 0 ]; then
    echo "Aviso: 'git remote add' falhou. Tentando 'git remote set-url'..."
    git remote set-url origin "$ORIGINAL_REMOTE_URL"
    if [ $? -ne 0 ]; then
        echo "Erro: Falha ao adicionar/setar o remote 'origin' com 'git remote set-url'. Abortando."
        exit 1
    fi
fi

# Verifica se o remote foi adicionado corretamente
VERIFIED_REMOTE_URL=$(git remote get-url origin 2>/dev/null)
echo "Debug (depois de adicionar): Remote 'origin' verificado: $VERIFIED_REMOTE_URL"

if [ "$VERIFIED_REMOTE_URL" != "$ORIGINAL_REMOTE_URL" ]; then
    echo "Erro: O URL do remote 'origin' não corresponde ao URL original. Abortando."
    exit 1
fi

echo "Remote 'origin' adicionado e verificado: $VERIFIED_REMOTE_URL"

if [ $? -ne 0 ]; then
    echo "Erro: Falha ao adicionar o remote 'origin'. Abortando."
    exit 1
fi
echo "Remote 'origin' adicionado: $ORIGIN_URL"

# Força o push de todas as branches
echo "Forçando o push de todas as branches para o repositório remoto..."
git push origin --force --all

if [ $? -ne 0 ]; then
    echo "Erro: Falha ao forçar o push das branches. Abortando."
    exit 1
fi
echo "Push forçado das branches concluído."

# Força o push de todas as tags
echo "Forçando o push de todas as tags para o repositório remoto..."
git push origin --force --tags

if [ $? -ne 0 ]; then
    echo "Erro: Falha ao forçar o push das tags. Abortando."
    exit 1
fi
echo "Push forçado das tags concluído."

# Configura o upstream para todas as branches locais
echo "Configurando o upstream para as branches locais..."
for branch in $(git branch --format="%(refname:short)"); do
    git branch --set-upstream-to=origin/"$branch" "$branch"
    if [ $? -ne 0 ]; then
        echo "Aviso: Falha ao configurar o upstream para a branch '$branch'. Pode ser necessário configurá-lo manualmente."
    else
        echo "Upstream configurado para a branch '$branch'."
    fi
done

# --- Limpeza (Opcional) ---
echo "--- Processo concluído ---"
echo "O caminho '$PATH_TO_REMOVE' foi removido do histórico do Git (local e remoto)."
echo "Um backup espelho do seu repositório foi criado em: $BACKUP_DIR"

if [ "$AUTO_DELETE_BACKUP" -eq 1 ]; then
    echo "Opção --auto-delete-backup detectada. Removendo diretório de backup automaticamente."
    REPLY="y"
else
    read -p "Deseja remover o diretório de backup espelho '$BACKUP_DIR'? (y/N): " -n 1 -r
fi
echo # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removendo diretório de backup..."
    rm -rf "$BACKUP_DIR"
    if [ $? -ne 0 ]; then
        echo "Erro: Falha ao remover o diretório de backup. Por favor, remova-o manualmente."
    else
        echo "Diretório de backup removido."
    fi
else
    echo "Diretório de backup mantido."
fi

echo "Lembre-se de informar a outros colaboradores sobre esta reescrita de histórico."
echo "Eles precisarão re-clonar o repositório ou redefinir suas branches locais."
