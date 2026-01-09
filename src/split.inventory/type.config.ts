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
