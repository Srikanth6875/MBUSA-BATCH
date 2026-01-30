import { spawn } from 'child_process';
import * as fs from 'fs';

export interface CurlDownloadOptions {
  url: string;
  output: string;
  timeoutMs?: number;
  retries?: number;
}

function chunkToString(chunk: Buffer | string): string {
  return typeof chunk === 'string' ? chunk : chunk.toString('utf8');
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

    curl.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunkToString(chunk);
    });

    curl.on('close', (code: number | null) => {
      if (code === 0 && fs.existsSync(output)) {
        resolve();
      } else {
        reject(new Error(`curl failed (code ${code}): ${stderr}`));
      }
    });

    curl.on('error', (err: Error) => reject(err));
  });
}

export function curlGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-sL', url]);
    let data = '';
    let err = '';

    curl.stdout.on('data', (chunk: Buffer | string) => {
      data += chunkToString(chunk);
    });

    curl.stderr.on('data', (chunk: Buffer | string) => {
      err += chunkToString(chunk);
    });

    curl.on('close', (code: number | null) => {
      if (code === 0) resolve(data);
      else reject(new Error(`curlGet failed (code ${code}): ${err}`));
    });

    curl.on('error', (e: Error) => reject(e));
  });
}
