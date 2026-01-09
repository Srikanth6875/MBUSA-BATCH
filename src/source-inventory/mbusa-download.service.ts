import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { curlDownload, curlGet } from '../utils/curl.helper';

@Injectable()
export class MbusaDownloadService {
    private BASE_URL = 'https://vendordownloads.homenetinc.com/MBUSA/';

    async downloadLatestFile(targetDir: string): Promise<string> {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const html = await curlGet(this.BASE_URL);
        const $ = cheerio.load(html);

        const serverFiles: string[] = [];
        $('a').each((_, el) => {
            const file = $(el).attr('href');
            if (file?.endsWith('.csv')) serverFiles.push(file);
        });

        if (!serverFiles.length) throw new Error('No MBUSA CSV files found on server');

        let latestServerFile = '';
        let latestTs = 0;

        for (const f of serverFiles) {
            const ts = this.parseTimestamp(f);
            if (ts > latestTs) {
                latestTs = ts;
                latestServerFile = f;
            }
        }

        if (!latestServerFile) throw new Error('Unable to detect latest MBUSA file');

        const serverFileName = path.basename(latestServerFile);
        const localLatest = this.getLocalLatestCsv(targetDir);

        // SAME FILE → return, do nothing
        if (localLatest === serverFileName) {
            const localPath = path.join(targetDir, localLatest);
            console.log('Latest file already exists locally:', localPath);
            return localPath;
        }

        // DIFFERENT FILE → delete all locals
        if (localLatest && localLatest !== serverFileName) {
            console.log('New MBUSA file detected. Deleting old local files...');
            for (const f of fs.readdirSync(targetDir)) {
                if (f.endsWith('.csv')) fs.unlinkSync(path.join(targetDir, f));
            }
        }

        // DOWNLOAD NEW FILE
        const filePath = path.join(targetDir, serverFileName);
        const fileUrl = new URL(latestServerFile, this.BASE_URL).toString();

        console.log('Downloading latest MBUSA file:', fileUrl);
        await curlDownload({
            url: fileUrl,
            output: filePath,
            timeoutMs: 600_000,
            retries: 3,
        });

        console.log('Download completed:', filePath);
        return filePath;
    }

    private getLocalLatestCsv(dir: string): string | null {
        if (!fs.existsSync(dir)) return null;

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv'));
        if (!files.length) return null;

        let latest = '';
        let latestTs = 0;

        for (const f of files) {
            const ts = this.parseTimestamp(f);
            if (ts > latestTs) {
                latestTs = ts;
                latest = f;
            }
        }
        return latest || null;
    }

    private parseTimestamp(filename: string): number {
        const m = filename.match(/MBUSA[_-]?(\d{14})\.csv$/i);
        if (!m) return 0;

        const s = m[1];
        return new Date(
            +s.slice(4, 8),       // year
            +s.slice(0, 2) - 1,   // month (0-indexed)
            +s.slice(2, 4),       // day
            +s.slice(8, 10),      // hour
            +s.slice(10, 12),     // min
            +s.slice(12, 14)      // sec
        ).getTime();
    }

}
