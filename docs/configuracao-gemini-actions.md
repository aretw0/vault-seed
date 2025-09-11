# Configuração dos GitHub Actions do Gemini

Este documento detalha os pré-requisitos e as configurações necessárias para que os workflows do GitHub Actions que utilizam o Gemini funcionem corretamente.

## 1. Visão Geral dos Workflows do Gemini

*   **`gemini-dispatch.yml`**: Despacha eventos para outros workflows do Gemini.
*   **`gemini-invoke.yml`**: O workflow principal para interação com o Gemini CLI, executando tarefas de engenharia de software.
*   **`gemini-review.yml`**: Especializado em revisão de Pull Requests, fornecendo feedback detalhado.
*   **`gemini-scheduled-triage.yml`**: Realiza a triagem agendada de issues, aplicando labels automaticamente.
*   **`gemini-triage.yml`**: Realiza a triagem de issues sob demanda, aplicando labels.

## 2. Pré-requisitos Essenciais

### 2.1. GitHub App

Para que os workflows do Gemini possam interagir com o seu repositório (ler conteúdo, criar comentários, aplicar labels, etc.), é necessário configurar um GitHub App.

*   **Criação do GitHub App:** [Instruções para criar um GitHub App - pode ser um link para a documentação do GitHub]
*   **Permissões Necessárias:**
    *   `contents`: Leitura (para acessar o código do repositório).
    *   `issues`: Leitura e Escrita (para triagem de issues e comentários).
    *   `pull-requests`: Leitura e Escrita (para revisão de Pull Requests e comentários).
    *   `id-token`: Escrita (para gerar tokens de identidade para autenticação).

### 2.2. Credenciais Google Cloud / Gemini API

Os workflows do Gemini precisam de acesso à API do Gemini e, opcionalmente, a serviços do Google Cloud.

*   **Chave da API Gemini:** Obtenha sua chave da API Gemini. [Link para a documentação da API Gemini]
*   **Chave da API do Google (Opcional):** Se você estiver utilizando Vertex AI ou outros serviços do Google, uma chave da API do Google pode ser necessária.
*   **Configuração do Google Cloud (para Workload Identity Federation):**
    *   **Workload Identity Federation (WIF):** [Explicação breve do WIF e por que é usado para segurança]
    *   **Provedor WIF:** Configure um provedor de identidade para o GitHub no seu projeto Google Cloud. [Link para a documentação do GCP sobre WIF]
    *   **Conta de Serviço:** Crie uma conta de serviço com as permissões necessárias para acessar os serviços do Gemini/Vertex AI.

## 3. Configuração das Variáveis e Segredos do GitHub Actions

As seguintes variáveis e segredos devem ser configurados no seu repositório GitHub (em `Settings > Secrets and variables > Actions`):

### 3.1. Segredos (Secrets)

*   `APP_PRIVATE_KEY`: A chave privada do seu GitHub App (conteúdo do arquivo `.pem`).
*   `GEMINI_API_KEY`: Sua chave da API Gemini.
*   `GOOGLE_API_KEY`: Sua chave da API do Google (se aplicável).

### 3.2. Variáveis (Variables)

*   `APP_ID`: O ID do seu GitHub App.
*   `GEMINI_CLI_VERSION`: A versão do `google-github-actions/run-gemini-cli` a ser utilizada (ex: `v0`).
*   `GEMINI_MODEL`: O nome do modelo Gemini a ser utilizado (ex: `gemini-pro`).
*   `GCP_WIF_PROVIDER`: O nome completo do recurso do provedor de identidade da federação de workload do GCP (ex: `projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/YOUR_POOL_ID/providers/YOUR_PROVIDER_ID`).
*   `GOOGLE_CLOUD_PROJECT`: O ID do seu projeto Google Cloud.
*   `GOOGLE_CLOUD_LOCATION`: A região do Google Cloud onde seus recursos estão localizados (ex: `us-central1`).
*   `SERVICE_ACCOUNT_EMAIL`: O endereço de e-mail da conta de serviço do GCP que será usada.
*   `GOOGLE_GENAI_USE_VERTEXAI`: Defina como `true` se você estiver usando a API Gemini via Vertex AI, `false` caso contrário.
*   `GOOGLE_GENAI_USE_GCA`: Defina como `true` se você estiver usando o Gemini Code Assist, `false` caso contrário.
*   `DEBUG` ou `ACTIONS_STEP_DEBUG`: Opcional. Defina como `true` para habilitar logs de depuração detalhados nos workflows.

## 4. Labels do GitHub (para Triagem de Issues)

Para que os workflows de triagem (`gemini-scheduled-triage.yml` e `gemini-triage.yml`) funcionem corretamente, as labels que o Gemini irá aplicar nas issues devem existir previamente no seu repositório. O Gemini só pode usar labels que ele consegue listar.

*   **Exemplo de Labels Comuns:**
    *   `kind/bug`
    *   `kind/feature`
    *   `status/needs-triage`
    *   `priority/p1`

## 5. Considerações de Segurança

*   **Tokens de Autenticação:** Observe que os workflows de triagem não passam o `GITHUB_TOKEN` diretamente para o Gemini CLI durante a análise da issue. Isso é uma medida de segurança para evitar que o Gemini, ao processar inputs não confiáveis, tenha acesso direto a permissões de escrita. A aplicação das labels é feita em um passo separado, após a análise, usando um token gerado pelo GitHub App.
*   **Workload Identity Federation:** A utilização do Workload Identity Federation é uma prática recomendada para autenticação segura com o Google Cloud, evitando o uso de chaves de API diretamente nos workflows.
