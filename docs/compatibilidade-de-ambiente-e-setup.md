# Compatibilidade de Ambiente e Setup

Este documento explica as considerações de compatibilidade de ambiente ao configurar seu repositório, especialmente para usuários de Windows que utilizam o Windows Subsystem for Linux (WSL).

## Introdução

Ao trabalhar com projetos que envolvem scripts Bash e ferramentas de desenvolvimento (como Node.js e Python), é comum encontrar desafios de compatibilidade entre diferentes sistemas operacionais. No contexto deste repositório, o principal ponto de atenção é a interação entre o ambiente Windows e o ambiente Linux fornecido pelo WSL.

## O Problema: Windows, WSL e PATH

Quando você executa um script Bash no Windows (por exemplo, usando `bash scripts/setup.sh` a partir do PowerShell ou CMD), o executável `bash.exe` do Windows é invocado. Este `bash.exe` é, na maioria dos casos, a interface para a sua distribuição Linux instalada no WSL.

O desafio surge porque o ambiente Linux dentro do WSL tem seu próprio sistema de arquivos e variáveis de ambiente (`PATH`). Executáveis instalados diretamente no Windows (como um Node.js instalado via MSI no Windows) não são automaticamente visíveis ou acessíveis no `PATH` do ambiente Linux do WSL. Isso pode levar a erros como "Node.js não encontrado" ou "comando não reconhecido", mesmo que a ferramenta esteja instalada no seu sistema Windows.

## A Solução: Setup Robusto com `setup.sh`

Nosso script principal de setup, `scripts/setup.sh`, foi projetado para ser robusto e lidar com essas particularidades. Ele agora garante que as ferramentas necessárias (Node.js e Python, com suas respectivas dependências) sejam configuradas corretamente *dentro do ambiente WSL* onde os scripts Bash serão executados.

O `setup.sh` orquestra as seguintes verificações e configurações:

1.  **Configuração do Git**: Garante que os filtros do Git e hooks de pre-commit estejam configurados.
2.  **Ambiente Python**: (Gerenciado por `scripts/setup_python.sh`)
    *   Verifica a presença do Python 3.
    *   Instala `pipx` (um instalador de pacotes Python isolado) se não estiver presente.
    *   Instala `git-filter-repo` via `pipx`, uma ferramenta essencial para manipulação avançada do histórico do Git.
3.  **Ambiente Node.js**: (Gerenciado por `scripts/setup_node.sh`)
    *   Carrega o `nvm` (Node Version Manager).
    *   Lê o arquivo `.nvmrc` na raiz do projeto para identificar a versão do Node.js desejada.
    *   Se a versão especificada não estiver instalada no WSL, o `nvm` a instala automaticamente.
    *   Ativa a versão correta do Node.js para o ambiente do script.
    *   Verifica a presença do `npm` (gerenciador de pacotes do Node.js).
    *   Instala as dependências do projeto (`npm install`) se o diretório `node_modules` não existir.
4.  **Configuração do Copilot**: Executa scripts adicionais para configurar o Copilot, se o ambiente Node.js estiver pronto.

## Instruções para o Usuário

Para garantir um setup suave e sem problemas, siga estas instruções antes de executar o `setup.sh`:

1.  **Instale o Windows Subsystem for Linux (WSL)**: Certifique-se de ter o WSL habilitado e uma distribuição Linux (como Ubuntu) instalada. Siga a documentação oficial da Microsoft para instalação do WSL.
2.  **Instale o `nvm` (Node Version Manager) DENTRO do seu WSL**: É crucial que o `nvm` seja instalado dentro do ambiente Linux do WSL, e não apenas no Windows. Siga as instruções de instalação do `nvm` para Linux (geralmente via `curl` ou `wget`).
3.  **Instale o Python 3 DENTRO do seu WSL**: Embora o `setup.sh` verifique o Python, é uma boa prática tê-lo instalado previamente no seu ambiente WSL. Você pode usar o gerenciador de pacotes da sua distribuição Linux (ex: `sudo apt install python3` no Ubuntu).
4.  **Verifique o arquivo `.nvmrc`**: Certifique-se de que o arquivo `.nvmrc` (localizado na raiz do seu repositório) contenha a versão correta do Node.js que você deseja usar (ex: `v22.19.0`).


## Como Rodar o Setup

Após seguir as instruções acima, você pode executar o script de setup a partir do PowerShell ou CMD do Windows (o que invocará o `bash.exe` do WSL) ou diretamente do terminal do seu WSL:

```bash
bash scripts/setup.sh
```

O script irá guiá-lo através do processo, instalando dependências e configurando o ambiente automaticamente.

## Configuração do Git Credential Manager (GCM) no WSL

Para garantir uma experiência de uso mais fluida com o Git, especialmente ao interagir com repositórios remotos (como o GitHub) e evitar prompts repetitivos de usuário e senha, é altamente recomendável configurar o Git Credential Manager (GCM).

Se você é um usuário de Windows e utiliza o WSL para executar operações Git, é ideal que o Git configurado dentro do seu ambiente WSL utilize o GCM instalado no Windows. Isso permite que as credenciais sejam gerenciadas de forma centralizada e segura pelo GCM do Windows, sem a necessidade de reconfigurar ou armazenar credenciais separadamente no WSL.

Para configurar o Git no seu ambiente WSL para usar o GCM do Windows, execute o seguinte comando no terminal do seu WSL:

```bash
git config --global credential.helper "/mnt/c/Program\\ Files/Git/mingw64/bin/git-credential-manager.exe"
```

**Explicação do Comando:**

*   `git config --global`: Configura o Git globalmente para o seu usuário no WSL.
*   `credential.helper`: Define o programa auxiliar que o Git deve usar para armazenar e recuperar credenciais.
*   `"/mnt/c/Program\\ Files/Git/mingw64/bin/git-credential-manager.exe"`: Este é o caminho absoluto para o executável do Git Credential Manager no seu sistema Windows, acessado a partir do WSL. Note o uso de `\` para escapar o espaço em `Program Files` e `\` para escapar o próprio `\` já que temos essas nuances no do Windows, isso garante que o WSL interprete corretamente o caminho.

Após executar este comando, o Git no seu WSL estará configurado para usar o GCM do Windows, proporcionando uma autenticação transparente e segura para suas operações Git.

---

**Próximos Passos:**

Com o ambiente configurado, você estará pronto para explorar e colaborar no repositório, utilizando todas as ferramentas e fluxos de trabalho propostos.
