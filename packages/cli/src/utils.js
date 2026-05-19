import { spawn } from 'node:child_process';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    child.on('close', code => {
      if (code !== 0) reject(new Error(`'${cmd} ${args.join(' ')}' exited with code ${code}`));
      else resolve();
    });
    child.on('error', reject);
  });
}
