// vehicle-import.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

type IdCache = {
  make: Record<string, number>;
  model: Record<number, Record<string, number>>;
  trim: Record<number, Record<number, Record<string, number>>>;
};

@Injectable()
export class VehicleImportService {
  protected cache: IdCache = { make: {}, model: {}, trim: {} };

  constructor(@Inject('PG_CONNECTION') protected readonly db: Knex) {}

  // -------------------- MAKE --------------------
  async getOrCreateMake(makeName?: string): Promise<number | null> {
    if (!makeName?.trim()) return null;
    makeName = makeName.trim();

    if (this.cache.make[makeName]) return this.cache.make[makeName];

    // Insert if not exists
    await this.db('make')
      .insert({ make: makeName })
      .onConflict('make')
      .ignore();

    // Always select to ensure we get the id
    const row = await this.db('make').select('id').where({ make: makeName }).first();
    if (!row?.id) return null;

    this.cache.make[makeName] = row.id;
    return row.id;
  }

  // -------------------- MODEL --------------------
  async getOrCreateModel(makeId: number | null, modelName?: string): Promise<number | null> {
    if (!makeId || !modelName?.trim()) return null;
    modelName = modelName.trim();

    this.cache.model[makeId] ??= {};
    if (this.cache.model[makeId][modelName]) return this.cache.model[makeId][modelName];

    await this.db('model')
      .insert({ make_id: makeId, model: modelName })
      .onConflict(['make_id', 'model'])
      .ignore();

    const row = await this.db('model')
      .select('id')
      .where({ make_id: makeId, model: modelName })
      .first();
    if (!row?.id) return null;

    this.cache.model[makeId][modelName] = row.id;
    return row.id;
  }

  // -------------------- TRIM --------------------
  async getOrCreateTrim(
    makeId: number | null,
    modelId: number | null,
    trimName?: string,
  ): Promise<number | null> {
    if (!makeId || !modelId || !trimName?.trim()) return null;
    trimName = trimName.trim();

    this.cache.trim[makeId] ??= {};
    this.cache.trim[makeId][modelId] ??= {};
    if (this.cache.trim[makeId][modelId][trimName])
      return this.cache.trim[makeId][modelId][trimName];

    await this.db('trim')
      .insert({ make_id: makeId, model_id: modelId, trim: trimName })
      .onConflict(['make_id', 'model_id', 'trim'])
      .ignore();

    const row = await this.db('trim')
      .select('id')
      .where({ make_id: makeId, model_id: modelId, trim: trimName })
      .first();
    if (!row?.id) return null;

    this.cache.trim[makeId][modelId][trimName] = row.id;
    return row.id;
  }
}
