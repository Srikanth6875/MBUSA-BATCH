import { Injectable } from '@nestjs/common';
import { createReadStream, createWriteStream, promises as fs, WriteStream } from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SplitFileConfig, SplitResult } from '../shared/type.config';

@Injectable()
export class SplitInventoryService {
  async splitFile(config: SplitFileConfig): Promise<SplitResult> {
    const { inputFile, outputDir, delimiter, dealerIdLabel } = config;
    await this.ensureOutputDirectoryExists(outputDir);

    const dealerStreams = new Map<string, WriteStream>();
    const rooftopIds = new Set<string>();
    let dealerIndex = -1;
    let headerLine = '';
    let total = 0, skipped = 0;
    const lineReader = this.createLineReader(inputFile);

    for await (const line of lineReader) {
      if (!headerLine) {
        headerLine = line;
        dealerIndex = this.findDealerColumnIndex(line, delimiter, dealerIdLabel);
        continue;
      }

      const dealerId = this.extractDealerId(line, delimiter, dealerIndex);
      if (!dealerId) {
        skipped++;
        continue;
      }
      rooftopIds.add(dealerId);
      const stream = this.getOrCreateDealerStream(dealerId, outputDir, headerLine, dealerStreams);
      stream.write(line + '\n');
      total++;
    }

    await this.closeAllStreams(dealerStreams);
    console.log(`Split complete: total=${total}, skipped=${skipped}`);
    return { total, skipped, rooftopIds: Array.from(rooftopIds), };
  }

  private async ensureOutputDirectoryExists(outputDir: string): Promise<void> {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
      // ignore – directory may not exist
    }
    await fs.mkdir(outputDir, { recursive: true });
  }


  private createLineReader(inputFile: string) {
    return readline.createInterface({ input: createReadStream(inputFile), crlfDelay: Infinity, });
  }

  private findDealerColumnIndex(headerLine: string, delimiter: string, dealerIdLabel: string): number {
    const columns = headerLine.split(delimiter);
    for (let i = 0; i < columns.length; i++) {
      const cleanedColumn = columns[i].replace(/"/g, '').trim().toLowerCase();
      if (cleanedColumn === dealerIdLabel.toLowerCase()) {
        return i;
      }
    }
    throw new Error(`Dealer column "${dealerIdLabel}" not found in header`);
  }

  private extractDealerId(line: string, delimiter: string, dealerColumnIndex: number,): string | null {
    const columns = line.split(delimiter);
    const dealerIdRaw = columns[dealerColumnIndex];
    if (!dealerIdRaw) return null;

    return dealerIdRaw.replace(/"/g, '').trim();
  }

  private getOrCreateDealerStream(dealerId: string, outputDir: string, headerLine: string, streamsMap: Map<string, WriteStream>,): WriteStream {
    let stream = streamsMap.get(dealerId);

    if (!stream) {
      const outputFilePath = path.join(outputDir, `${dealerId}.csv`);
      stream = createWriteStream(outputFilePath, { flags: 'w' });
      stream.write(headerLine + '\n');
      streamsMap.set(dealerId, stream);
    }
    return stream;
  }

  private async closeAllStreams(streamsMap: Map<string, WriteStream>): Promise<void> {
    const closePromises = Array.from(streamsMap.values()).map((stream) =>
      new Promise<void>((resolve) => {
        stream.end(() => resolve());
      }),
    );
    await Promise.all(closePromises);
  }
}