import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TABLE_NAMES } from 'src/shared/vehicle.constants';

type IdCache = {
  make: Record<string, number>;
  model: Record<number, Record<string, number>>;
  trim: Record<number, Record<number, Record<string, number>>>;
  veh_lookup: Record<string, Record<string | number, number>>;
};

@Injectable()
export class VehicleImportService {
  protected cache: IdCache = { make: {}, model: {}, trim: {}, veh_lookup: {} };

  constructor(@Inject('PG_CONNECTION') protected readonly db: Knex) {}

  // -------------------- MAKE --------------------
  async getOrCreateMake(makeName?: string): Promise<number | null> {
    if (!makeName?.trim()) return null;
    makeName = makeName.trim();

    if (this.cache.make[makeName]) return this.cache.make[makeName]; //captised

    // Insert if not exists
    await this.db(TABLE_NAMES.VEHICLE_MAKE)
      .insert({ make: makeName })
      .onConflict('make')
      .ignore();

    // Always select to ensure we get the id
    const row = await this.db(TABLE_NAMES.VEHICLE_MAKE)
      .select('id')
      .where({ make: makeName })
      .first();
    if (!row?.id) return null;

    this.cache.make[makeName] = row.id;
    return row.id;
  }

  // -------------------- MODEL --------------------
  async getOrCreateModel(
    makeId: number | null,
    modelName?: string,
  ): Promise<number | null> {
    if (!makeId || !modelName?.trim()) return null;
    modelName = modelName.trim();

    this.cache.model[makeId] ??= {};
    if (this.cache.model[makeId][modelName])
      return this.cache.model[makeId][modelName];

    await this.db(TABLE_NAMES.VEHICLE_MODEL)
      .insert({ make_id: makeId, model: modelName })
      .onConflict(['make_id', 'model'])
      .ignore();

    const row = await this.db(TABLE_NAMES.VEHICLE_MODEL)
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

    await this.db(TABLE_NAMES.VEHICLE_TRIM)
      .insert({ make_id: makeId, model_id: modelId, trim: trimName })
      .onConflict(['make_id', 'model_id', 'trim'])
      .ignore();

    const row = await this.db(TABLE_NAMES.VEHICLE_TRIM)
      .select('id')
      .where({ make_id: makeId, model_id: modelId, trim: trimName })
      .first();
    if (!row?.id) return null;

    this.cache.trim[makeId][modelId][trimName] = row.id;
    return row.id;
  }

  async getMakeModelTrimIds(
    makeName?: string,
    modelName?: string,
    trimName?: string,
  ): Promise<{
    makeId: number | null;
    modelId: number | null;
    trimId: number | null;
  }> {
    const makeId = await this.getOrCreateMake(makeName);
    const modelId = makeId
      ? await this.getOrCreateModel(makeId, modelName)
      : null;
    const trimId =
      makeId && modelId
        ? await this.getOrCreateTrim(makeId, modelId, trimName)
        : null;
    return { makeId, modelId, trimId };
  }

  // =====================================================
  // GENERIC LOOKUP (YEAR, BODY TYPE, COLOR, ETC)
  // =====================================================
  async VehicleLookupId(
    table: string,
    column: string,
    value?: string | number | null,
  ): Promise<number | null> {
    if (value === undefined || value === null || value === '') return null;
    this.cache.veh_lookup[table] ??= {};

    if (this.cache.veh_lookup[table][value]) {
      return this.cache.veh_lookup[table][value];
    }

    await this.db(table)
      .insert({ [column]: value })
      .onConflict(column)
      .ignore();

    const row = await this.db(table)
      .select('id')
      .where({ [column]: value })
      .first();
    if (!row?.id) return null;

    this.cache.veh_lookup[table][value] = row.id;
    return row.id;
  }
}
