# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.1](https://github.com/aretw0/vault-seed/compare/v0.2.0...v0.2.1) (2025-09-11)


### ✨ Novos Recursos

* adiciona feature flag para controlar workflows do Gemini ([#6](https://github.com/aretw0/vault-seed/issues/6)) ([2c776cf](https://github.com/aretw0/vault-seed/commit/2c776cf277c313c93c2e0df27d3701ff936ea9cb))
* **setup:** Feature/initial setup ([#4](https://github.com/aretw0/vault-seed/issues/4)) ([#5](https://github.com/aretw0/vault-seed/issues/5)) ([8baeb95](https://github.com/aretw0/vault-seed/commit/8baeb952082cf732632903cd33bb0e03a4afff07))

## [0.2.0](https://github.com/aretw0/vault-seed/compare/v0.1.4...v0.2.0) (2025-09-11)


### ✨ Novos Recursos

* Implementa guarda de release e inclui refactor no changelog ([24b02a8](https://github.com/aretw0/vault-seed/commit/24b02a8ceac458e2f00b01e99d65e1de13057370))


### 📚 Documentação

* Adiciona documentação sobre limpeza de histórico Git ([0492c9a](https://github.com/aretw0/vault-seed/commit/0492c9a7dc7e334c317f62aae1b1ffeb0b2d3f3c))
* Adiciona documentação sobre o processo de release ([040d982](https://github.com/aretw0/vault-seed/commit/040d982cebde3b9583ab0ab953190c6408ea6c0c))


### ♻️ Refatoração

* Remove debug output from release workflow ([48ea20c](https://github.com/aretw0/vault-seed/commit/48ea20ccab519d8b8dacf14fc2c74f2e28679a4d))
* Remove prefix 'Release' from release name ([67948df](https://github.com/aretw0/vault-seed/commit/67948df2141b0b92c62ab321651d124a2b1c43c7))


### 🐛 Correções

* Ajusta lógica do guarda de release para verificar commits entre tags ([d3966e9](https://github.com/aretw0/vault-seed/commit/d3966e93e38f5e2b08228d9ca6870fbdf4fc4b4e))
* Corrige a lógica para obter a tag anterior limpa no guarda de release ([9267207](https://github.com/aretw0/vault-seed/commit/926720731f2d1e0e243dd562d08262f9de5ee672))
* Refina a lógica do guarda de release para obter a tag anterior corretamente ([7c9318a](https://github.com/aretw0/vault-seed/commit/7c9318a473322ceac3c3badda0aca5d3e8f6e5ee))

### [0.1.4](https://github.com/aretw0/vault-seed/compare/v0.1.3...v0.1.4) (2025-09-11)


### 🐛 Correções

* Melhora o nome da release no workflow ([0cbca4e](https://github.com/aretw0/vault-seed/commit/0cbca4e1574ec3981992d6c15a0a87eeef64d7c8))

### [0.1.3](https://github.com/aretw0/vault-seed/compare/v0.1.2...v0.1.3) (2025-09-11)


### ✨ Novos Recursos

* Adiciona permissão \`contents: write\` ao workflow de release ([f5f589e](https://github.com/aretw0/vault-seed/commit/f5f589e2aefbf35f7731b707f793a339e65a75bb))

### [0.1.2](https://github.com/aretw0/vault-seed/compare/v0.1.1...v0.1.2) (2025-09-10)


### 🐛 Correções

* **release:** Refactor release notes extraction to use Node.js script ([848182d](https://github.com/aretw0/vault-seed/commit/848182dd055aa5a78ad61b89c7a170899168c939))

### [0.1.1](https://github.com/aretw0/vault-seed/compare/v0.1.0...v0.1.1) (2025-09-10)


### 📚 Documentação

* aprimora a documentação do processo de release ([25a7fc1](https://github.com/aretw0/vault-seed/commit/25a7fc1d66a53aaf893667282d9593362d7271c9))


### 🐛 Correções

* **release:** isola o versionamento no arquivo VERSION e robustece o workflow ([756b2c9](https://github.com/aretw0/vault-seed/commit/756b2c991a3f146302648704462e3fc939cb8fe9))

## [0.1.0](https://github.com/aretw0/vault-seed/compare/v0.0.2...v0.1.0) (2025-09-10)


### 📚 Documentação

* Add digital gardener's perspective on versioning ([63071ea](https://github.com/aretw0/vault-seed/commit/63071eaf9bea646862029d582c2c48904d8730d4))
* Document release automation strategy and workflow ([0b67184](https://github.com/aretw0/vault-seed/commit/0b67184aa655976dc90dadb107af6544dd2dc293))
* Document versioning and release strategy ([fa56f4b](https://github.com/aretw0/vault-seed/commit/fa56f4b4ce978ee57ab22b9f5b89bb3d82b5c48b))
* Refine versioning strategy examples for template context ([6a5737d](https://github.com/aretw0/vault-seed/commit/6a5737d26d6579b2806397a5eadb8ebb2383f5d6))


### ✨ Novos Recursos

* Add minor and major release scripts to package.json ([12dc089](https://github.com/aretw0/vault-seed/commit/12dc08994aae1343c40a299f48e39a426b1db86a))
* Enable Markdown linting in CI workflow ([bf645d0](https://github.com/aretw0/vault-seed/commit/bf645d033de493105eebc1674bfcbbd5b4dfb439))
* Flexibiliza regras de lint e documenta o processo ([0fdb69a](https://github.com/aretw0/vault-seed/commit/0fdb69ac54b09616a66aa356af2be8845b2d46eb))
* **lint:** implementa lint gradual e documenta o processo ([e036183](https://github.com/aretw0/vault-seed/commit/e03618361cffa844cde52dc81a1cd4302912f90c))
* **workflow:** Add dormant GitHub Release automation workflow ([a8bb01d](https://github.com/aretw0/vault-seed/commit/a8bb01d02b396517b7b3a4c83976702976d57d48))
* **workflow:** Implement dynamic release workflow activation/deactivation ([696e50b](https://github.com/aretw0/vault-seed/commit/696e50baa206c2cbfba5f37ae6898df47e48800c))

### 0.0.2 (2025-09-09)


### 🐛 Correções

* Ajusta execução do script setup_node.sh ([b7daa18](https://github.com/aretw0/vault-seed/commit/b7daa1805c2887f4dae94ef7a599d29be4b37a10))
* Update project description to include Visual Studio Code (Foam) support ([bc19e97](https://github.com/aretw0/vault-seed/commit/bc19e971eda63567b3a7cc099eb4988d909f60e4))


### ✨ Novos Recursos

* ✨ Automatiza a inicialização do vault para novos usuários ([a870b50](https://github.com/aretw0/vault-seed/commit/a870b50dcc4501f7c87ba8a658ab9de3290b70d9))
* Add initial configuration files for Obsidian vault ([334e0e8](https://github.com/aretw0/vault-seed/commit/334e0e84e8bdc629420834aacff485145a77ac05))
* Adiciona .vscode/extensions.json e ajusta .gitignore ([a2c8faf](https://github.com/aretw0/vault-seed/commit/a2c8faf5af7e3abb36a30cb437931b987a831188))
* Adiciona arquivos de template e inicializa pasta Inbox ([3ac85cc](https://github.com/aretw0/vault-seed/commit/3ac85ccb50343c4b56c60081be315d1b10e8a737))
* adiciona bumpFiles ([b7fbd45](https://github.com/aretw0/vault-seed/commit/b7fbd456b3e757b51aef8ab533829706743a0bf3))
* adiciona estrutura de conventional commits ([9802a7a](https://github.com/aretw0/vault-seed/commit/9802a7a50eb70694dfdcdbd28ba6164b9c5c0537))
* Adiciona script para remover arquivo do histórico do Git ([d74ce64](https://github.com/aretw0/vault-seed/commit/d74ce64cfd2df922ae7b3977a889a4c8f0bcb46c))
* **build:** adiciona VERSION e package-lock.json ([7aa16f5](https://github.com/aretw0/vault-seed/commit/7aa16f53e9577a521c6fadb455c19308b4fe3e92))
* **ci:** Restructure CI/CD for template and user workflows ([4a0179f](https://github.com/aretw0/vault-seed/commit/4a0179fed2e03a530e7d052337c0d435d12b1d75))
* **config:** ignora arquivos de configuração de plugins sensíveis ([2cf9cf8](https://github.com/aretw0/vault-seed/commit/2cf9cf8f1efa0e15d6431f9ee0587a3f2583eec1))
* **copilot:** Refactor Copilot setup and .gitignore ([307738b](https://github.com/aretw0/vault-seed/commit/307738b40ed7d78f386d99268b5851b0c6ec12f8))
* **dev-config:** adiciona configurações de versionamento e commit ([82a6018](https://github.com/aretw0/vault-seed/commit/82a60184c93dcf2031905382a83ea9c425c345df))
* **dev-tools:** adiciona package.json com ferramentas de desenvolvimento ([33453e1](https://github.com/aretw0/vault-seed/commit/33453e1767c274bc3f3803fd7f2c7fc7a3b2cdbf))
* Improve setup scripts and environment compatibility ([1e50cfb](https://github.com/aretw0/vault-seed/commit/1e50cfb716cade7ee7cd4c61fec69dc7ef578181))
* Revamp vault structure and documentation ([03427c5](https://github.com/aretw0/vault-seed/commit/03427c517c143daa8dafc360004d83400e344ff0))
* **security:** implementa sistema de gerenciamento de segredos com Git filter ([6188836](https://github.com/aretw0/vault-seed/commit/618883645c6ea09eac333cd90587034c86bc9c3f))
* **template:** add initialization script and update README ([a86f4b1](https://github.com/aretw0/vault-seed/commit/a86f4b1b44949bda95629d9e17ce49da419bd0af))
* **workflow:** Enhance vault initialization with template files and cleaner docs setup ([5ce4b0e](https://github.com/aretw0/vault-seed/commit/5ce4b0ef1725a6c3ffc544c3b77592f9b30c7aa4))


### 📚 Documentação

* 🏗️ Adiciona documentação técnica da organização do projeto ([38c4778](https://github.com/aretw0/vault-seed/commit/38c4778fd8ea923641a8b2952aa82803bbe3ff34))
* 📚 Esclarece a distinção entre docs/ e 99-Meta & Attachments/ ([6082594](https://github.com/aretw0/vault-seed/commit/6082594f998521ef24579732f03e90ce80c15647))
* 📝 Documenta a automação da inicialização do vault ([fdd9e6a](https://github.com/aretw0/vault-seed/commit/fdd9e6a6d80554ad136f0652561288c3cd2b6ecf))
* Add GCM configuration for WSL users and update script ([0c5f14e](https://github.com/aretw0/vault-seed/commit/0c5f14e94ef19a7025fc19966f542030bb2dfd79))
* Refine original README.md for template clarity ([8665137](https://github.com/aretw0/vault-seed/commit/86651376c7f1f8fc98dc8d48db3ff45dc1044611))
* **security:** adiciona documentação sobre gestão de segredos no Git ([8ce9a42](https://github.com/aretw0/vault-seed/commit/8ce9a42afd3137ee6cebaff27e3d8d486c36c427))

### 0.0.1 (2025-09-09)


### 🐛 Correções

* Ajusta execução do script setup_node.sh ([b7daa18](https://github.com/aretw0/vault-seed/commit/b7daa1805c2887f4dae94ef7a599d29be4b37a10))
* Update project description to include Visual Studio Code (Foam) support ([bc19e97](https://github.com/aretw0/vault-seed/commit/bc19e971eda63567b3a7cc099eb4988d909f60e4))


### 📚 Documentação

* Add GCM configuration for WSL users and update script ([0c5f14e](https://github.com/aretw0/vault-seed/commit/0c5f14e94ef19a7025fc19966f542030bb2dfd79))
* **security:** adiciona documentação sobre gestão de segredos no Git ([8ce9a42](https://github.com/aretw0/vault-seed/commit/8ce9a42afd3137ee6cebaff27e3d8d486c36c427))


### ✨ Novos Recursos

* Add initial configuration files for Obsidian vault ([334e0e8](https://github.com/aretw0/vault-seed/commit/334e0e84e8bdc629420834aacff485145a77ac05))
* Adiciona .vscode/extensions.json e ajusta .gitignore ([a2c8faf](https://github.com/aretw0/vault-seed/commit/a2c8faf5af7e3abb36a30cb437931b987a831188))
* Adiciona arquivos de template e inicializa pasta Inbox ([3ac85cc](https://github.com/aretw0/vault-seed/commit/3ac85ccb50343c4b56c60081be315d1b10e8a737))
* adiciona bumpFiles ([b7fbd45](https://github.com/aretw0/vault-seed/commit/b7fbd456b3e757b51aef8ab533829706743a0bf3))
* adiciona estrutura de conventional commits ([9802a7a](https://github.com/aretw0/vault-seed/commit/9802a7a50eb70694dfdcdbd28ba6164b9c5c0537))
* Adiciona script para remover arquivo do histórico do Git ([d74ce64](https://github.com/aretw0/vault-seed/commit/d74ce64cfd2df922ae7b3977a889a4c8f0bcb46c))
* **build:** adiciona VERSION e package-lock.json ([7aa16f5](https://github.com/aretw0/vault-seed/commit/7aa16f53e9577a521c6fadb455c19308b4fe3e92))
* **config:** ignora arquivos de configuração de plugins sensíveis ([2cf9cf8](https://github.com/aretw0/vault-seed/commit/2cf9cf8f1efa0e15d6431f9ee0587a3f2583eec1))
* **dev-config:** adiciona configurações de versionamento e commit ([82a6018](https://github.com/aretw0/vault-seed/commit/82a60184c93dcf2031905382a83ea9c425c345df))
* **dev-tools:** adiciona package.json com ferramentas de desenvolvimento ([33453e1](https://github.com/aretw0/vault-seed/commit/33453e1767c274bc3f3803fd7f2c7fc7a3b2cdbf))
* Improve setup scripts and environment compatibility ([1e50cfb](https://github.com/aretw0/vault-seed/commit/1e50cfb716cade7ee7cd4c61fec69dc7ef578181))
* Revamp vault structure and documentation ([03427c5](https://github.com/aretw0/vault-seed/commit/03427c517c143daa8dafc360004d83400e344ff0))
* **security:** implementa sistema de gerenciamento de segredos com Git filter ([6188836](https://github.com/aretw0/vault-seed/commit/618883645c6ea09eac333cd90587034c86bc9c3f))