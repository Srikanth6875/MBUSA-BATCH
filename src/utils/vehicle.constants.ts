export const INVENTORY_CONST = {
    CSV_HEADERS: {
        VIN: 'VIN',
        DEALER_ID: 'Dealer ID',
        MAKE: 'Make',
        MODEL: 'Model',
        TRIM: 'Trim',
        IMAGE_LIST: 'ImageList',
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
        noChange: 'Action: SKIPPED (no change)',
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
