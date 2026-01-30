import { normalizeCsvValue } from "./safe-trim-value";

export function mapCsvRecordToDbObject(record: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
    const dbRow: Record<string, any> = {};

    for (const [csvLabel, dbColumn] of Object.entries(mapping)) {
        const cleaned = normalizeCsvValue(record?.[csvLabel]);

        if (cleaned !== undefined) {
            dbRow[dbColumn] = cleaned;
        }
    }
    return dbRow;
}
