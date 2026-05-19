import { spawn } from 'node:child_process';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        const reason = signal ? `killed by signal ${signal}` : `exited with code ${code}`;
        reject(new Error(`'${cmd} ${args.join(' ')}' ${reason}`));
      } else {
        resolve();
      }
    });
    child.on('error', err => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}
