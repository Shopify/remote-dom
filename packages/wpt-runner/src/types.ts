import type {WptHarnessResult} from '../shared/types.ts';

export type {
  WptHarnessResult,
  WptHarnessStatus,
  WptHarnessTestResult,
  WptRunRecord,
  WptRunState,
} from '../shared/types.ts';

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
