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
      jobId = await this.jobLogger.createJob('MBUSA');
      const downloadResult =
        await this.downloader.downloadLatestFile(sourceDir);

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
}
