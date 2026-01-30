import { Injectable, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Knex } from 'knex';
import { curlDownload, curlGet } from '../utils/curl.helper';
import { INVENTORY_CONST, TABLE_NAMES } from 'src/shared/vehicle.constants';
import {
  DownloadResult,
  DownloadServerFile,
  ImportJobRow,
} from 'src/shared/type.config';

@Injectable()
export class MbusaDownloadService {
  private BASE_URL = 'https://vendordownloads.homenetinc.com/MBUSA/';
  constructor(@Inject('PG_CONNECTION') private readonly db: Knex) {}

  async downloadLatestFile(targetDir: string): Promise<DownloadResult> {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const html = await curlGet(this.BASE_URL);

    //Extract raw <pre> block to preserve spacing
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch) throw new Error('MBUSA directory listing not found');

    const preText = preMatch[1]
      .replace(/<a[^>]*>/g, '')
      .replace(/<\/a>/g, '')
      .replace(/&nbsp;/g, ' ');
    // Split lines by <br>
    const lines = preText.split(/<br\s*\/?>/i);
    const serverFiles: DownloadServerFile[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.includes('MBUSA')) continue;
      const match = trimmed.match(
        /\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+(\d+)\s+<A HREF="[^"]*">(MBUSA\d{14}\.csv)<\/A>/i,
      );
      if (match)
        serverFiles.push({
          name: `/MBUSA/${match[2]}`,
          size: Number(match[1]),
        });
    }

    console.log('Parsed files:', serverFiles);
    if (!serverFiles.length) throw new Error('No MBUSA CSV files parsed');

    //Pick latest by timestamp in filename
    let latest: DownloadServerFile | null = null;
    let latestTs = 0;

    for (const f of serverFiles) {
      const ts = this.parseTimestamp(f.name);
      if (ts > latestTs) {
        latestTs = ts;
        latest = f;
      }
    }
    if (!latest) throw new Error('Unable to determine latest MBUSA file');

    const serverFileName = path.basename(latest.name);
    const serverFileSize = latest.size;

    // Check DB for previously processed file
    const lastJob = await this.db<ImportJobRow>(TABLE_NAMES.IMPORT_JOBS)
      .where({ ij_source: 'MBUSA', ij_file_name: serverFileName })
      .orderBy('ij_id', 'desc')
      .first();

    if (
      lastJob &&
      lastJob.ij_file_size != null &&
      Number(lastJob.ij_file_size) === serverFileSize
    ) {
      const reason = `File ${serverFileName} already processed with same size (${serverFileSize} bytes)`;
      return { status: INVENTORY_CONST.ACTIONS.SKIPPED, reason };
    }

    for (const f of fs.readdirSync(targetDir)) {
      if (f.endsWith('.csv') && f !== serverFileName) {
        fs.unlinkSync(path.join(targetDir, f));
      }
    }

    const filePath = path.join(targetDir, serverFileName);
    const fileUrl = new URL(latest.name, this.BASE_URL).toString();

    console.log('Downloading new MBUSA file:', fileUrl);
    await curlDownload({
      url: fileUrl,
      output: filePath,
      timeoutMs: 600_000,
      retries: 3,
    });

    return { status: 'downloaded', filePath, serverFileName, serverFileSize };
  }

  private parseTimestamp(filename: string): number {
    const m = filename.match(/MBUSA[-_]?(\d{14})\.csv$/i);
    if (!m) return 0;
    const s = m[1];
    return new Date(
      +s.slice(4, 8), // year
      +s.slice(0, 2) - 1, // month
      +s.slice(2, 4), // day
      +s.slice(8, 10), // hour
      +s.slice(10, 12), // minute
      +s.slice(12, 14), // second
    ).getTime();
  }
}
