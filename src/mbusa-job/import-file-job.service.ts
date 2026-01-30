import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TABLE_NAMES } from 'src/shared/vehicle.constants';

export interface FileJobCreateDto {
  fileName: string;
  fileSize: number;
}

@Injectable()
export class ImportFileJobService {
  constructor(@Inject('PG_CONNECTION') private readonly db: Knex) { }

  async createJob(dto: FileJobCreateDto) {
    const [job] = await this.db(TABLE_NAMES.IMPORT_FILE_JOBS)
      .insert({
        ifj_local_file_name: dto.fileName,
        ifj_file_size: dto.fileSize.toString(),
        ifj_status: 'RUNNING',
        ifj_start_time: new Date(),
      })
      .returning('*');

    return job;
  }

  async completeJob(jobId: number, total: number, skipped: number, added: number, updated: number, noChange: number, deleted: number,) {
    await this.db(TABLE_NAMES.IMPORT_FILE_JOBS)
      .where({ ifj_id: jobId })
      .update({
        ifj_status: 'COMPLETED',
        ifj_total_records: total,
        ifj_skipped_records: skipped,
        ifj_added_records: added,
        ifj_updated_records: updated,
        ifj_no_change_records: noChange,
        ifj_deleted_records: deleted,
        ifj_end_time: new Date(),
      });
  }

  async failJob(jobId: number, error: string) {
    await this.db(TABLE_NAMES.IMPORT_FILE_JOBS)
      .where({ ifj_id: jobId })
      .update({
        ifj_status: 'FAILED',
        ifj_error_message: error,
        ifj_end_time: new Date(),
      });
  }
}
