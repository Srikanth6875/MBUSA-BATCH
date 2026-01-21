import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TABLE_NAMES } from 'src/shared/vehicle.constants';
@Injectable()
export class RooftopInsertService {
  constructor(@Inject('PG_CONNECTION') private readonly db: Knex) { }

  async updateFromCsv(row: Record<string, any>): Promise<{ rt_id: number }> {
    if (!row?.rt_dealer_id) {
      throw new Error('Missing rt_dealer_id in rooftop CSV row');
    }

    const existing = await this.db(TABLE_NAMES.ROOFTOP)
      .select('rt_id')
      .where({ rt_dealer_id: row.rt_dealer_id })
      .first();

    if (!existing?.rt_id) {
      throw new Error(`Rooftop not found for Dealer ID: ${row.rt_dealer_id}`);
    }

    await this.db(TABLE_NAMES.ROOFTOP)
      .where({ rt_dealer_id: row.rt_dealer_id })
      .update({
        ...row,
        rt_inactive: false,
        rt_mdate: this.db.fn.now(),
      });

    return { rt_id: existing.rt_id };
  }


  async bulkUpsert(dealerIds: string[]) {
    if (!dealerIds.length) return;

    const rows = dealerIds.map(id => ({
      rt_dealer_id: id,
      rt_inactive: false,
      rt_mdate: this.db.fn.now(),
    }));

    await this.db(TABLE_NAMES.ROOFTOP)
      .insert(rows)
      .onConflict('rt_dealer_id')
      .merge({
        rt_inactive: false,
        rt_mdate: this.db.fn.now(),
      });
  }
}
