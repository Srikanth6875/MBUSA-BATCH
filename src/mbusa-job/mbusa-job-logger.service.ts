import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class MbusaJobLoggerService {
  constructor(@Inject('PG_CONNECTION') private readonly db: Knex) { }

  async createJob(source: string): Promise<number> {
    const [job] = await this.db('import_jobs')
      .insert({
        ij_source: source,
        ij_status: 'RUNNING',
        ij_start_time: this.db.fn.now()
      })
      .returning('ij_id');

    return job.ij_id ?? job;
  }

  async completeJob(jobId: number, totalRecords: number, fileName: string, fileSize: number) {
    return this.db('import_jobs')
      .where({ ij_id: jobId })
      .update({
        ij_status: 'COMPLETED',
        ij_total_records: totalRecords,
        ij_file_name: fileName,
        ij_file_size: fileSize,
        ij_end_time: this.db.fn.now(),
        ij_duration_time: this.db.raw(
          "date_trunc('milliseconds', age(now(), ij_start_time))"
        ),
        ij_duration_hours: this.db.raw(
          'ROUND(EXTRACT(EPOCH FROM age(now(), ij_start_time)) / 3600, 4)'
        )
      });
  }

  async failJob(jobId: number, error: string) {
    return this.db('import_jobs')
      .where({ ij_id: jobId })
      .update({
        ij_status: 'FAILED',
        ij_error_message: error,
        ij_end_time: this.db.fn.now(),
        ij_duration_time: this.db.raw(
          "date_trunc('milliseconds', age(now(), ij_start_time))"
        ),
        ij_duration_hours: this.db.raw(
          'ROUND(EXTRACT(EPOCH FROM age(now(), ij_start_time)) / 3600, 4)'
        )
      });
  }

}