export const INVENTORY_CONST = {
    CSV_HEADERS: {
        VIN: 'VIN',
        DEALER_ID: 'Dealer ID',
        MAKE: 'Make',
        MODEL: 'Model',
        TRIM: 'Trim',
        IMAGE_LIST: 'ImageList',
        YEAR: 'Year',
        BODY_TYPE: 'Body',
        INT_COLOR: 'InteriorColor',
        EXT_COLOR: 'ExteriorColor'
    },

    ACTIONS: {
        ADDED: 'added',
        UPDATED: 'updated',
        NO_CHANGE: 'noChange',
        SKIPPED: 'skipped',
    } as const,

    ACTION_LOGS: {
        added: 'Action: ADDED',
        updated: 'Action: UPDATED (image count changed or reactivated)',
        noChange: 'Action: NO_CHANGE',
        skipped: 'Action: SKIPPED',
    },

    VEHICLE_STATUS: {
        ACTIVE: 1,
        INACTIVE: 0,
    },

    LISTING_TYPE: {
        NEW: 'New',
        USED: 'Used',
    },
};

export type VehicleAction = typeof INVENTORY_CONST.ACTIONS[keyof typeof INVENTORY_CONST.ACTIONS];

export const TABLE_NAMES = {
    VEHICLES: 'vehicles',
    ROOFTOP: 'rooftop',
    VEHICLE_YEAR: 'veh_year',
    VEHICLE_BODY_TYPE: 'veh_body_type',
    VEHICLE_COLOR: 'veh_color',
    VEHICLE_IMAGES: 'veh_images',
    VEHICLE_MAKE: 'veh_make',
    VEHICLE_MODEL: 'veh_model',
    VEHICLE_TRIM: 'veh_trim',
    IMPORT_JOBS: 'import_jobs',
    IMPORT_FILE_JOBS: 'import_file_jobs'
};


export const MONGO_COLLECTIONS = {
    VEHICLE_DESCRIPTION: 'vehicle_descriptions',
    VEHICLE_OPTIONS: 'vehicle_options'
}