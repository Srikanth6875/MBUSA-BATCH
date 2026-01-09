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
        ij_start_time: new Date(),
      })
      .returning('ij_id');

    return job.ij_id ?? job;
  }

  async completeJob(jobId: number, totalRecords: number, fileName: string, fileSize: number,) {
    const result = await this.db('import_jobs')
      .where({ ij_id: jobId })
      .update({
        ij_status: 'COMPLETED',
        ij_total_records: totalRecords,
        ij_file_name: fileName,
        ij_file_size: fileSize,
        ij_end_time: new Date(),
      });

    return result;
  }

  async failJob(jobId: number, error: string) {
    await this.db('import_jobs')
      .where({ ij_id: jobId })
      .update({
        ij_status: 'FAILED',
        ij_error_message: error,
        ij_end_time: new Date(),
      });
  }

  async updateDuration(jobId: number) {
    await this.db.raw(`
    UPDATE import_jobs
    SET
      ij_end_time = COALESCE(ij_end_time, NOW()),
      ij_duration_time = 
        to_char(
          COALESCE(ij_end_time, NOW()) - ij_start_time,
          'HH24:MI:SS'
        )::TIME,
      ij_duration_hours =
        ROUND(EXTRACT(EPOCH FROM (COALESCE(ij_end_time, NOW()) - ij_start_time)) / 3600, 2)

    WHERE ij_id = ?
  `, [jobId]);
  }
}
