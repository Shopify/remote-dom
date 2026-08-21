import {describe, expect, it} from 'vitest';
import type {WptRunRecord} from '../src/types.ts';
import type {CapabilityRow} from './capabilities.ts';
import {evaluateCapabilities} from './evaluate-capabilities.ts';

interface TestResult {
  name: string;
  status: number;
}

const rows: CapabilityRow[] = [
  {path: 'test.html', status: 'supported', case: 'supported case', note: ''},
  {
    path: 'test.html',
    status: 'deferred',
    case: 'deferred case',
    note: 'blocked',
  },
];

function run(tests: TestResult[], status = 0): WptRunRecord {
  return {
    state: tests.some((test) => test.status !== 0) ? 'failed' : 'passed',
    path: 'test.html',
    warnings: [],
    logs: [],
    result: {tests, status: {status}},
  };
}

describe('capability evaluation', () => {
  it('allows deferred failures and reports deferred passes for promotion', () => {
    const failedDeferred = evaluateCapabilities(
      run([
        {name: 'supported case', status: 0},
        {name: 'deferred case', status: 1},
      ]),
      rows,
    );
    expect(failedDeferred.failed).toBe(false);
    expect(failedDeferred.deferredFailures).toHaveLength(1);

    const passingDeferred = evaluateCapabilities(
      run([
        {name: 'supported case', status: 0},
        {name: 'deferred case', status: 0},
      ]),
      rows,
    );
    expect(passingDeferred.promotionCandidates).toHaveLength(1);
  });

  it('fails supported, missing, unlisted, duplicate, harness, and worker errors', () => {
    expect(
      evaluateCapabilities(
        run([
          {name: 'supported case', status: 1},
          {name: 'deferred case', status: 1},
        ]),
        rows,
      ).failed,
    ).toBe(true);

    const drift = evaluateCapabilities(
      run([
        {name: 'supported case', status: 0},
        {name: 'new case', status: 0},
      ]),
      rows,
    );
    expect(drift.failed).toBe(true);
    expect(drift.missing.map((row: {case: string}) => row.case)).toEqual([
      'deferred case',
    ]);
    expect(drift.unlisted.map((test: TestResult) => test.name)).toEqual([
      'new case',
    ]);

    const duplicate = evaluateCapabilities(
      run([
        {name: 'supported case', status: 0},
        {name: 'supported case', status: 0},
        {name: 'deferred case', status: 1},
      ]),
      rows,
    );
    expect(duplicate.failed).toBe(true);
    expect(duplicate.duplicateResults).toEqual(['supported case']);

    expect(evaluateCapabilities(run([], 1), []).failed).toBe(true);
    expect(
      evaluateCapabilities(
        {state: 'passed', path: 'test.html', warnings: [], logs: []},
        [],
      ).failed,
    ).toBe(true);
    expect(
      evaluateCapabilities(
        {state: 'error', path: 'test.html', warnings: [], logs: []},
        [],
      ).failed,
    ).toBe(true);
  });
});
