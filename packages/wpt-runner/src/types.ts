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

export interface WorkerRunRequest {
  type: 'run';
  path: string;
  source: string;
}

export interface WorkerRequest extends WorkerRunRequest {
  responsePort: MessagePort;
}

export type WorkerLogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

export type WorkerResponse =
  | {type: 'ready'}
  | {type: 'log'; level: WorkerLogLevel; text: string}
  | {type: 'complete'; result: WptHarnessResult}
  | {type: 'error'; error: string};
