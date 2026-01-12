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

// Vehicles column mapping
export const VEHICLES_COLUMN_MAPPING: Record<string, string> = {
  'Stock': 'veh_stock',
  'VIN': 'veh_vin',
  'Active': 'veh_active',
  'Year': 'veh_year',
  'Type': 'veh_listing_type',
  'Certified': 'veh_certified',
  'Body': 'veh_body_type',
  'ExteriorColor': 'veh_ext_color',
  'InteriorColor': 'veh_int_color',
  'Miles': 'veh_miles',
  'Status': 'veh_status',
};

export const VEHICLE_HISTORY_COLUMN_MAPPING_MONGO: Record<string, string> = {
  Description: 'vh_description',
  Options: 'vh_options',
  // Style_Description : 'vh_style_description',
  // Ext_Color_Generic : 'vh_ext_color_generic',
  // Ext_Color_Code : 'vh_ext_color_code',
  // Int_Color_Code : 'vh_int_color_code',
  // Engine_Description : 'vh_engine_description',
  // Fuel_Type : 'vh_fuel_type',
  // PassengerCapacity : 'vh_passenger_capacity',
}