import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function skillPackageJson(name) {
  return (
    JSON.stringify(
      {
        name: `@YOUR_NPM_USERNAME/${name}`,
        version: '0.1.0',
        description: `Pi skill: ${name}`,
        keywords: ['pi-package'],
        pi: {
          skills: [`skills/${name}`],
        },
        repository: {
          type: 'git',
          url: 'https://github.com/aretw0/vault-seed.git',
          directory: `packages/${name}`,
        },
        license: 'GPL-3.0-only',
        publishConfig: { access: 'public' },
      },
      null,
      2,
    ) + '\n'
  );
}

function extensionPackageJson(name) {
  return (
    JSON.stringify(
      {
        name: `@YOUR_NPM_USERNAME/${name}`,
        version: '0.1.0',
        description: `Pi extension: ${name}`,
        keywords: ['pi-package'],
        type: 'module',
        main: 'src/index.ts',
        pi: {
          extensions: ['src/index.ts'],
        },
        dependencies: {
          '@earendil-works/pi-coding-agent': 'latest',
        },
        repository: {
          type: 'git',
          url: 'https://github.com/aretw0/vault-seed.git',
          directory: `packages/${name}`,
        },
        license: 'GPL-3.0-only',
        publishConfig: { access: 'public' },
      },
      null,
      2,
    ) + '\n'
  );
}

function skillMd(name) {
  return `---
name: ${name}
description: Descreva o que esta skill ensina ao agente
version: 0.1.0
---

# ${name}

Descreva aqui o que o agente deve saber.
Inclua exemplos de comandos, convenções e contexto relevante.

## Como usar

\`\`\`bash
# exemplo de comando ou ação que esta skill habilita
\`\`\`
`;
}

function extensionTs(name) {
  const toolName = name.replace(/-/g, '_');
  return `import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: '${toolName}',
    label: '${name}',
    description: 'Descreva o que esta ferramenta faz',
    parameters: {},
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      // implemente a lógica da ferramenta aqui
    },
  });
}
`;
}

function publishWorkflowYml(name, packageName) {
  return `name: Publish ${name}
# Triggered by: git tag ${packageName}@<version> && git push origin ${packageName}@<version>
# Required secret: NPM_TOKEN (Settings → Secrets → Actions → New repository secret)

on:
  push:
    tags:
      - '${packageName}@*'

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    name: Publish ${packageName} to npm
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3

      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - name: Preflight — verify configuration
        working-directory: packages/${name}
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: |
          set -euo pipefail
          pkg_name=$(node -p "require('./package.json').name")
          if echo "$pkg_name" | grep -q "YOUR_NPM_USERNAME"; then
            echo "::error::O nome do pacote ainda contém o placeholder YOUR_NPM_USERNAME."
            echo "::error::Edite packages/${name}/package.json e substitua @YOUR_NPM_USERNAME pelo seu usuário npm."
            echo "::error::Depois atualize o padrão de tag neste workflow para refletir o novo nome."
            exit 1
          fi
          if [ -z "\${NODE_AUTH_TOKEN:-}" ]; then
            echo "::error::O secret NPM_TOKEN não está configurado neste repositório."
            echo "::error::Adicione em: Settings → Secrets and variables → Actions → New repository secret"
            echo "::error::Gere o token em: npmjs.com → seu perfil → Access Tokens → Generate New Token (Automation)"
            exit 1
          fi

      - name: Publish
        run: npm publish --provenance --access public
        working-directory: packages/${name}
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;
}

function writePublishWorkflow(name, packageName, root) {
  const workflowDir = join(root, '.github', 'workflows');
  mkdirSync(workflowDir, { recursive: true });
  writeFileSync(
    join(workflowDir, `publish-${name}.yml`),
    publishWorkflowYml(name, packageName),
    'utf8',
  );
}

/** Creates packages/<name>/ with Pi skill structure. Throws if package already exists. */
export function scaffoldSkill(name, root = process.cwd()) {
  const packageDir = join(root, 'packages', name);
  if (existsSync(packageDir)) {
    throw new Error(`pacote '${name}' já existe em packages/${name}`);
  }
  const packageName = `@YOUR_NPM_USERNAME/${name}`;
  mkdirSync(join(packageDir, 'skills', name), { recursive: true });
  writeFileSync(join(packageDir, 'package.json'), skillPackageJson(name), 'utf8');
  writeFileSync(join(packageDir, 'skills', name, 'SKILL.md'), skillMd(name), 'utf8');
  writePublishWorkflow(name, packageName, root);
}

/** Creates packages/<name>/ with Pi extension boilerplate. Throws if package already exists. */
export function scaffoldExtension(name, root = process.cwd()) {
  const packageDir = join(root, 'packages', name);
  if (existsSync(packageDir)) {
    throw new Error(`pacote '${name}' já existe em packages/${name}`);
  }
  const packageName = `@YOUR_NPM_USERNAME/${name}`;
  mkdirSync(join(packageDir, 'src'), { recursive: true });
  writeFileSync(join(packageDir, 'package.json'), extensionPackageJson(name), 'utf8');
  writeFileSync(join(packageDir, 'src', 'index.ts'), extensionTs(name), 'utf8');
  writePublishWorkflow(name, packageName, root);
}

function printHelp() {
  console.log(`dgk publish <tipo> <nome>

Tipos:
  skill <nome>      Cria pacote Pi de skill em packages/<nome>/ + workflow de publicação
  extension <nome>  Cria pacote Pi de extensão em packages/<nome>/ + workflow de publicação

Exemplos:
  dgk publish skill ocr-leitura
  dgk publish extension ocr-tools

Após criar:
  1. Edite o SKILL.md ou src/index.ts com o conteúdo da sua extensão
  2. Atualize o nome npm em packages/<nome>/package.json (troque @aretw0/ pelo seu namespace)
  3. Atualize o padrão de tag em .github/workflows/publish-<nome>.yml para refletir o nome
  4. Adicione NPM_TOKEN nos secrets do repositório (Settings → Secrets → Actions)
  5. Crie e faça push da tag para publicar: git tag <nome>@0.1.0 && git push origin <tag>`);
}

export async function publish(args) {
  const [type, name] = args;

  if (!type || (type !== 'skill' && type !== 'extension')) {
    printHelp();
    if (type) process.exit(1);
    return;
  }

  if (!name) {
    console.error(`dgk publish ${type}: informe o nome do pacote`);
    process.exit(1);
  }

  const steps = (artifact) => `
Próximos passos obrigatórios antes de publicar:

  1. Edite ${artifact}
  2. Substitua @YOUR_NPM_USERNAME em packages/${name}/package.json pelo seu usuário npm
  3. Atualize o padrão de tag em .github/workflows/publish-${name}.yml para refletir o nome
  4. Adicione NPM_TOKEN nos secrets do repositório:
       github.com → Settings → Secrets and variables → Actions → New repository secret
  5. Faça commit de tudo, depois crie e envie a tag:
       git tag @SEU_USUARIO/${name}@0.1.0
       git push origin @SEU_USUARIO/${name}@0.1.0

O workflow no CI verificará a configuração antes de publicar e mostrará
erros claros se algo estiver faltando.`;

  try {
    if (type === 'skill') {
      scaffoldSkill(name);
      console.log(`✓ Skill criada em packages/${name}/`);
      console.log(steps(`packages/${name}/skills/${name}/SKILL.md`));
    } else {
      scaffoldExtension(name);
      console.log(`✓ Extensão criada em packages/${name}/`);
      console.log(steps(`packages/${name}/src/index.ts`));
    }
  } catch (err) {
    console.error(`dgk publish: ${err.message}`);
    process.exit(1);
  }
}
