import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import {
  VEHICLES_COLUMN_MAPPING,
  VEHICLE_HISTORY_COLUMN_MAPPING_MONGO,
} from '../shared/db.mapping';
import { mapCsvRecordToDbObject } from 'src/utils/csv-to-db-mapper';
import {
  INVENTORY_CONST,
  TABLE_NAMES,
  VehicleAction,
} from '../shared/vehicle.constants';
import { VehicleImportService } from 'src/mbusa-job/vehicle-import.service';
import { VehicleDataService } from 'src/mbusa-job/mongo/schemas/vehicle-data.service';
import {
  normalizeBoolean,
  normalizeNullableNumber,
  normalizeNumber,
  normalizeString,
  normalizeStringArray,
} from 'src/utils/safe-trim-value';

@Injectable()
export class VehicleUpsertService {
  constructor(
    private readonly vehicleService: VehicleImportService,
    private readonly historyService: VehicleDataService,
    @Inject('PG_CONNECTION') private readonly db: Knex,
  ) {}

  async upsertVehicle(
    record: any,
    vin: string,
    dealerId: string,
  ): Promise<{ action: VehicleAction }> {
    const vehCsvData = mapCsvRecordToDbObject(record, VEHICLES_COLUMN_MAPPING);
    const veh_historyData = mapCsvRecordToDbObject(
      record,
      VEHICLE_HISTORY_COLUMN_MAPPING_MONGO,
    );
    const imagesCsv = normalizeStringArray(
      record[INVENTORY_CONST.CSV_HEADERS.IMAGE_LIST],
    );

    vehCsvData.veh_listing_type = this.normalizeListingType(
      vehCsvData.veh_listing_type,
    );
    vehCsvData.veh_certified = normalizeBoolean(vehCsvData.veh_certified);
    vehCsvData.veh_miles = normalizeNullableNumber(vehCsvData.veh_miles);

    const rooftop = await this.db(TABLE_NAMES.ROOFTOP)
      .select('rt_id')
      .where({ rt_dealer_id: dealerId })
      .first();
    if (!rooftop?.rt_id) return { action: INVENTORY_CONST.ACTIONS.SKIPPED }; //clarity

    const veh_year_id = await this.vehicleService.VehicleLookupId(
      TABLE_NAMES.VEHICLE_YEAR,
      'year',
      normalizeNumber(record[INVENTORY_CONST.CSV_HEADERS.YEAR]),
    );
    const veh_body_type_id = await this.vehicleService.VehicleLookupId(
      TABLE_NAMES.VEHICLE_BODY_TYPE,
      'body_type',
      normalizeString(record[INVENTORY_CONST.CSV_HEADERS.BODY_TYPE]),
    );
    const veh_ext_color_id = await this.vehicleService.VehicleLookupId(
      TABLE_NAMES.VEHICLE_COLOR,
      'color',
      normalizeString(record[INVENTORY_CONST.CSV_HEADERS.EXT_COLOR]),
    );
    const veh_int_color_id = await this.vehicleService.VehicleLookupId(
      TABLE_NAMES.VEHICLE_COLOR,
      'color',
      normalizeString(record[INVENTORY_CONST.CSV_HEADERS.INT_COLOR]),
    );

    const { makeId, modelId, trimId } =
      await this.vehicleService.getMakeModelTrimIds(
        normalizeString(record[INVENTORY_CONST.CSV_HEADERS.MAKE]),
        normalizeString(record[INVENTORY_CONST.CSV_HEADERS.MODEL]),
        normalizeString(record[INVENTORY_CONST.CSV_HEADERS.TRIM]),
      );
    const veh_Exist = await this.db(TABLE_NAMES.VEHICLES)
      .select('veh_id', 'veh_options_mng_id', 'veh_description_mng_id')
      .where({ veh_vin: vin })
      .first();

    const vehicleData = {
      ...vehCsvData,
      veh_rt_id: rooftop.rt_id,
      veh_make_id: makeId,
      veh_model_id: modelId,
      veh_trim_id: trimId,
      veh_year_id,
      veh_body_type_id,
      veh_ext_color_id,
      veh_int_color_id,
      veh_active: INVENTORY_CONST.VEHICLE_STATUS.ACTIVE,
    };

    //CREATE VEHICLE
    if (!veh_Exist) {
      const [id] = await this.db(TABLE_NAMES.VEHICLES)
        .insert(vehicleData)
        .returning('veh_id');
      const vehicleId = typeof id === 'object' ? id.veh_id : id;

      await this.syncVehicleImages(vehicleId, imagesCsv);
      const mongoIds = await this.historyService.upsertSnapshot(
        vehicleId,
        vin,
        veh_historyData,
      );

      await this.db(TABLE_NAMES.VEHICLES)
        .where({ veh_id: vehicleId })
        .update({
          veh_options_mng_id: mongoIds.optionsId ?? null,
          veh_description_mng_id: mongoIds.descriptionId ?? null,
        });

      return { action: INVENTORY_CONST.ACTIONS.ADDED };
    }

    //COMPARE VEHICLE IMG COUNT
    const vehicleId = veh_Exist.veh_id;
    const imgRow = await this.db(TABLE_NAMES.VEHICLE_IMAGES)
      .select('image_src')
      .where({ vehicle_id: vehicleId })
      .first();

    const oldCount = normalizeStringArray(imgRow?.image_src).length;
    if (oldCount > 0 && imagesCsv.length === 0) {
      return { action: INVENTORY_CONST.ACTIONS.SKIPPED };
    }

    const imagesChanged = oldCount !== imagesCsv.length;
    const mongoIds = await this.historyService.upsertSnapshot(
      vehicleId,
      vin,
      veh_historyData,
    );

    if (!imagesChanged) {
      return { action: INVENTORY_CONST.ACTIONS.NO_CHANGE };
    }

    //UPDATE VEHICLE
    await this.db(TABLE_NAMES.VEHICLES)
      .where({ veh_id: vehicleId })
      .update({
        ...vehicleData,
        veh_options_mng_id: mongoIds.optionsId ?? veh_Exist.veh_options_mng_id,
        veh_description_mng_id:
          mongoIds.descriptionId ?? veh_Exist.veh_description_mng_id,
      });

    await this.syncVehicleImages(vehicleId, imagesCsv);
    return { action: INVENTORY_CONST.ACTIONS.UPDATED };
  }

  private async syncVehicleImages(vehicleId: number, images: string[]) {
    if (!images.length) return;

    await this.db(TABLE_NAMES.VEHICLE_IMAGES)
      .insert({ vehicle_id: vehicleId, image_src: images.join(',') })
      .onConflict('vehicle_id')
      .merge({ image_src: images.join(','), mtime: this.db.fn.now() });
  }

  private normalizeListingType(v?: string) {
    const val = normalizeString(v);
    if (!val) return 'Used';
    return val.toLowerCase() === 'new' ? 'New' : 'Used';
  }
}
