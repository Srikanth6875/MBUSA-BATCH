import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class RooftopInsertService {
  constructor(@Inject('PG_CONNECTION') private readonly db: Knex) { }

  async updateFromCsv(row: Record<string, any>): Promise<number | null> {
    if (!row?.rt_dealer_id) return null;

    const existing = await this.db('rooftop')
      .select('rt_id')
      .where({ rt_dealer_id: row.rt_dealer_id })
      .first();

    if (!existing) return null;

    await this.db('rooftop')
      .where({ rt_dealer_id: row.rt_dealer_id })
      .update({
        ...row,
        rt_inactive: false,
        rt_mdate: this.db.fn.now(),
      });

    return existing.rt_id;
  }

  async bulkUpsert(dealerIds: string[]) {
    if (!dealerIds.length) return;

    const rows = dealerIds.map(id => ({
      rt_dealer_id: id,
      rt_inactive: false,
      rt_mdate: this.db.fn.now(),
    }));

    await this.db('rooftop')
      .insert(rows)
      .onConflict('rt_dealer_id')
      .merge({
        rt_inactive: false,
        rt_mdate: this.db.fn.now(),
      });
  }
}
