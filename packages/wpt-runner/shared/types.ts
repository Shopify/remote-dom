export interface WptHarnessTestResult {
  name: string;
  status: number;
  message?: string | null;
  stack?: string | null;
}

export interface WptHarnessStatus {
  status: number;
  message?: string | null;
  stack?: string | null;
}

export interface WptHarnessResult {
  tests: WptHarnessTestResult[];
  status: WptHarnessStatus;
}

export type WptRunState =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'passed'
  | 'failed'
  | 'error';

export interface WptRunRecord {
  state: WptRunState;
  path: string;
  warnings: string[];
  logs: string[];
  result?: WptHarnessResult;
  error?: string;
}
