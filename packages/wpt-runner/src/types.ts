export interface WptHarnessTestResult {
  name: string;
  status: number;
  message?: string;
  stack?: string;
}

export interface WptHarnessStatus {
  status: number;
  message?: string;
  stack?: string;
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

export type WorkerRequest = {
  type: 'run';
  path: string;
  source: string;
};

export type WorkerResponse =
  | {type: 'ready'}
  | {type: 'log'; level: string; text: string}
  | {type: 'complete'; result: WptHarnessResult}
  | {type: 'error'; error: string};
