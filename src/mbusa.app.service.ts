import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { SplitFileConfig } from './split.inventory/type.config';
import { MbusaDownloadService } from './source-inventory/mbusa-download.service';
import { SplitInventoryService } from './split.inventory/split.inventory.service';
import { ProcessVehicleInventoryService } from './process.inventory/process.inventory.service';
import { RooftopInsertService } from './mbusa-job/rooftop-insert.service';
import { MbusaJobLoggerService } from './mbusa-job/mbusa-job-logger.service';


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

    async run() {
        console.log('Mbusa Batch started...');

        const PROJECT_ROOT = path.resolve(__dirname, '..');
        const sourceDir = path.join(PROJECT_ROOT, 'downloads');
        const outputDirPath = path.join(PROJECT_ROOT, 'mbusa_split_files');

        if (!require('fs').existsSync(sourceDir)) {
            require('fs').mkdirSync(sourceDir);
        }
        let jobId: number | null = null;

        try {
            jobId = await this.jobLogger.createJob('MBUSA');
            const inputFilePath = await this.downloader.downloadLatestFile(sourceDir);
            //const inputFilePath = path.join(PROJECT_ROOT, 'downloads', 'MBUSA01072026064230.csv');
            const stats = fs.statSync(inputFilePath);
            const fileName = path.basename(inputFilePath);
            const fileSize = stats.size;

            const config: SplitFileConfig = {
                inputFile: inputFilePath,
                outputDir: outputDirPath,
                delimiter: ',',
                dealerIdLabel: 'Dealer ID',
            };

            console.time('Inventory Split ExecutionTime');
            const result = await this.service.splitFile(config);
            console.timeEnd('Inventory Split ExecutionTime');
            this.logger.log(`Split complete: ${result.total} rows`);

            console.time('dealer rooftop upsert ExecutionTime');
            await this.rooftopService.bulkUpsert(result.rooftopIds);
            console.timeEnd('dealer rooftop upsert ExecutionTime');

            console.time('Inventory Processing ExecutionTime');
            await this.processor.processFolder(outputDirPath);
            console.timeEnd(`Inventory Processing ExecutionTime`);

            await this.jobLogger.updateDuration(jobId);
            await this.jobLogger.completeJob(jobId, result.total, fileName, fileSize);
        } catch (e: any) {
            if (jobId) {
                await this.jobLogger.failJob(jobId, e.message || 'Unknown error');
                await this.jobLogger.updateDuration(jobId);
            }
            throw e;
        }
    }
}
