import { spawn } from 'child_process';
import * as fs from 'fs';
export interface CurlDownloadOptions {
  url: string;
  output: string;
  timeoutMs?: number;
  retries?: number;
}

export function curlDownload(opts: CurlDownloadOptions): Promise<void> {
  const { url, output, timeoutMs = 300_000, retries = 3 } = opts;
  return new Promise((resolve, reject) => {
    const args = [
      '-L',
      '--fail',
      '--silent',
      '--show-error',
      '--retry',
      String(retries),
      '--connect-timeout',
      '20',
      '--max-time',
      String(Math.floor(timeoutMs / 1000)),
      '-o',
      output,
      url,
    ];

    const curl = spawn('curl', args);
    let stderr = '';
    curl.stderr.on('data', (d) => (stderr += d.toString()));

    curl.on('close', (code) => {
      if (code === 0 && fs.existsSync(output)) {
        resolve();
      } else {
        reject(new Error(`curl failed (code ${code}): ${stderr}`));
      }
    });

    curl.on('error', reject);
  });
}

export function curlGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-sL', url]);
    let data = '';
    let err = '';

    curl.stdout.on('data', (d) => (data += d.toString()));
    curl.stderr.on('data', (d) => (err += d.toString()));

    curl.on('close', (code) => {
      if (code === 0) resolve(data);
      else reject(new Error(`curlGet failed (code ${code}): ${err}`));
    });

    curl.on('error', reject);
  });
}
