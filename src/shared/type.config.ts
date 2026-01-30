export interface SplitFileConfig {
  inputFile: string;
  outputDir: string;
  delimiter: string;
  dealerIdLabel: string;
}

export interface SplitResult {
  total: number;
  skipped: number;
  rooftopIds: string[];
}

export type DownloadServerFile = {
  name: string;
  size: number;
};

export type DownloadResult =
  | {
      status: 'downloaded';
      filePath: string;
      serverFileName: string;
      serverFileSize: number;
    }
  | {
      status: 'skipped';
      reason: string;
    };

export interface ImportJobRow {
  ij_id: number;
  ij_source: string;
  ij_file_name: string;
  ij_file_size: string | number | null;
}
