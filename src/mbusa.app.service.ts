import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { SplitFileConfig } from './shared/type.config';
import { MbusaDownloadService } from './source-inventory/mbusa-download.service';
import { SplitInventoryService } from './split.inventory/split.inventory.service';
import { MbusaJobLoggerService } from './mbusa-job/mbusa-job-logger.service';
import { ProcessVehicleInventoryService } from './process.inventory/process.inventory.service';
import { RooftopInsertService } from './mbusa-job/rooftop-insert.service';
import { Cron } from '@nestjs/schedule';
import { INVENTORY_CONST } from './shared/vehicle.constants';

@Injectable()
export class MbusaAppService {
  private readonly logger = new Logger(MbusaAppService.name);

  constructor(
    private readonly service: SplitInventoryService,
    private readonly downloader: MbusaDownloadService,
    private readonly jobLogger: MbusaJobLoggerService,
    private readonly processor: ProcessVehicleInventoryService,
    private readonly rooftopService: RooftopInsertService,
  ) { }

  // @Cron('0 0 15 * * *', {
  //   timeZone: 'America/Chicago',
  // })
  async run() {
    this.logger.log('Mbusa Batch Processing started...');

    const PROJECT_ROOT = path.resolve(__dirname, '..');
    const sourceDir = path.join(PROJECT_ROOT, 'downloads');
    const outputDirPath = path.join(PROJECT_ROOT, 'mbusa_split_files');
    let jobId: number | undefined;
    if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true });

    try {
      const downloadResult = await this.measureExecution('MBUSA Download', () =>
        this.downloader.downloadLatestFile(sourceDir),
      );

      if (downloadResult.status === INVENTORY_CONST.ACTIONS.SKIPPED) {
        if (jobId) await this.jobLogger.skipJob(jobId, downloadResult.reason);
        return;
      }
      const { filePath, serverFileName, serverFileSize } = downloadResult;

      const config: SplitFileConfig = {
        inputFile: filePath,
        outputDir: outputDirPath,
        delimiter: ',',
        dealerIdLabel: 'Dealer ID',
      };

      jobId = await this.jobLogger.createJob('MBUSA');
      const result = await this.service.splitFile(config);
      await this.rooftopService.bulkUpsert(result.rooftopIds);
      await this.processor.processFolder(outputDirPath);
      await this.jobLogger.completeJob(
        jobId,
        result.total,
        serverFileName,
        serverFileSize,
      );

      this.logger.log('Mbusa Batch completed successfully.');
    } catch (e: any) {
      if (jobId)
        await this.jobLogger.failJob(jobId, e.message || 'Unknown error');
      throw e;
    }
  }

  async measureExecution<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const startDate = new Date();

    this.logger.log(`${label} started at ${startDate.toISOString()}`);

    const result = await fn();

    const endTime = Date.now();
    const endDate = new Date();

    const durationMs = endTime - startTime;
    const durationSec = durationMs / 1000;

    let extraInfo = '';
    if (result) {
      const sizeBytes = Number((result as any)?.serverFileSize ?? 0);
      const sizeMB = sizeBytes / (1024 * 1024);

      const speedMBps = durationSec > 0 ? sizeMB / durationSec : 0;

      extraInfo = ` | Size=${sizeMB.toFixed(2)}MB | Speed=${
        Number.isFinite(speedMBps) ? speedMBps.toFixed(2) : '0.00'
      }MB/s`;
    }

    this.logger.log(
      `${label} completed at ${endDate.toISOString()} | Duration=${durationSec.toFixed(
        2,
      )}s${extraInfo}`,
    );

    return result;
  }
}
