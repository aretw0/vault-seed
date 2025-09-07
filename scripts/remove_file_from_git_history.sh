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
            FILE_TO_REMOVE="$1"
            shift
            ;;
    esac
done

# Verifica se o caminho do arquivo foi fornecido como argumento
if [ -z "$FILE_TO_REMOVE" ]; then
    echo "Uso: $0 <caminho_do_arquivo_a_remover> [--auto-delete-backup]"
    echo "Exemplo: $0 "10 - Fleeting & Daily/Meu Arquivo Secreto.md" --auto-delete-backup"
    exit 1
fi
REPO_PATH="$(pwd)" # Caminho absoluto do repositório atual
REPO_NAME="$(basename "$REPO_PATH")" # Nome do diretório do repositório
PARENT_PATH="$(dirname "$REPO_PATH")" # Caminho do diretório pai do repositório

echo "--- Iniciando o processo de remoção de arquivo do histórico do Git ---"
echo "Arquivo a ser removido: $FILE_TO_REMOVE"
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
echo "--- Executando git-filter-repo para remover o arquivo do histórico ---"
# O --force é necessário para sobrescrever o histórico no repositório atual
# O --preserve-refs default é 'all', o que inclui branches e tags
git filter-repo --path "$FILE_TO_REMOVE" --invert-paths --force

if [ $? -ne 0 ]; then
    echo "Erro: Falha na execução do git-filter-repo. Abortando."
    exit 1
fi
echo "git-filter-repo executado com sucesso. Histórico reescrito localmente."

# --- Verificação Pós-Limpeza ---
echo "--- Verificando se o arquivo foi removido do histórico ---"
# Verifica em todas as branches locais
BRANCHES=$(git branch --format="%(refname:short)")
FILE_FOUND=0
for branch in $BRANCHES; do
    if git log "$branch" -- "$FILE_TO_REMOVE" &> /dev/null;
    then
        echo "Erro: O arquivo '$FILE_TO_REMOVE' ainda foi encontrado no histórico da branch '$branch'."
        FILE_FOUND=1
    fi
done

if [ $FILE_FOUND -eq 1 ]; then
    echo "Erro: O arquivo não foi completamente removido do histórico. Por favor, verifique manualmente."
    exit 1
else
    echo "Verificação concluída: O arquivo '$FILE_TO_REMOVE' foi removido do histórico de todas as branches locais."
fi
# --- Fim da Execução e Verificação ---

# --- Sincronização com o Remoto ---
echo "--- Sincronizando com o repositório remoto ---"

# Adiciona o remote 'origin' novamente (git-filter-repo o remove)
echo "Adicionando o remote 'origin' novamente..."
# Tenta obter o URL do remote original do backup, se existir
ORIGIN_URL=$(git -C "$BACKUP_DIR" remote get-url origin 2>/dev/null)
if [ -z "$ORIGIN_URL" ]; then
    echo "Aviso: Não foi possível obter o URL do remote 'origin' do backup."
    echo "Por favor, insira o URL do seu repositório remoto (ex: https://github.com/seu_usuario/seu_repo.git):"
    read -r ORIGIN_URL
    if [ -z "$ORIGIN_URL" ]; then
        echo "Erro: URL do repositório remoto não fornecido. Abortando."
        exit 1
    fi
fi
git remote add origin "$ORIGIN_URL"

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

# --- Finalização do Ambiente Local ---
echo "--- Finalizando o ambiente local ---"
git reset --hard HEAD

if [ $? -ne 0 ]; then
    echo "Erro: Falha ao resetar o HEAD. Por favor, verifique manualmente."
    exit 1
fi
echo "Ambiente local resetado para o novo histórico."

# --- Fim da Sincronização e Finalização ---

# --- Limpeza (Opcional) ---
echo "--- Processo concluído ---"
echo "O arquivo '$FILE_TO_REMOVE' foi removido do histórico do Git (local e remoto)."
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
