import { Module } from '@nestjs/common';
import { MbusaDownloadService } from './mbusa-download.service';
@Module({
    providers: [MbusaDownloadService],
    exports: [MbusaDownloadService]
})
export class SourceInventoryModule { }
