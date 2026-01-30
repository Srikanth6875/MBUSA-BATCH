export const ROOFTOP_COLUMN_MAPPING: Record<string, string> = {
  'Dealer ID': 'rt_dealer_id',
  'Dealer Name': 'rt_name',
  'Dealer Address': 'rt_street',
  'Dealer City': 'rt_city',
  'Dealer State': 'rt_state',
  'Dealer Zip': 'rt_zip',
  'Dealer Phone': 'rt_ph',
  'Dealer Email': 'rt_email',
};

export const VEHICLES_COLUMN_MAPPING: Record<string, string> = {
  Stock: 'veh_stock',
  VIN: 'veh_vin',
  Active: 'veh_active',
  Type: 'veh_listing_type',
  Certified: 'veh_certified',
  Miles: 'veh_miles',
  Status: 'veh_status',
  ModelNumber: 'veh_model_num',
};

export const VEHICLE_HISTORY_COLUMN_MAPPING_MONGO: Record<string, string> = {
  Description: 'veh_description',
  Options: 'veh_options',
};
