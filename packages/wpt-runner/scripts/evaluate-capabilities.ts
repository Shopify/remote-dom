import type {WptHarnessTestResult, WptRunRecord} from '../src/types.ts';
import {compareCodeUnits, type CapabilityRow} from './capabilities.ts';

export function evaluateCapabilities(
  run: WptRunRecord,
  rows: readonly CapabilityRow[],
) {
  const tests = run.result?.tests ?? [];
  const testByName = new Map<string, WptHarnessTestResult>();
  const duplicateResults: string[] = [];
  for (const test of tests) {
    if (testByName.has(test.name)) duplicateResults.push(test.name);
    else testByName.set(test.name, test);
  }

  const rowByName = new Map(rows.map((row) => [row.case, row]));
  const missing = rows.filter((row) => !testByName.has(row.case));
  const unlisted = tests
    .filter((test) => !rowByName.has(test.name))
    .sort((left, right) => compareCodeUnits(left.name, right.name));
  const supportedPassed = [];
  const supportedFailures = [];
  const deferredFailures = [];
  const promotionCandidates = [];

  for (const row of rows) {
    const test = testByName.get(row.case);
    if (!test) continue;
    if (row.status === 'supported' && test.status === 0)
      supportedPassed.push({row, test});
    else if (row.status === 'supported') supportedFailures.push({row, test});
    else if (test.status === 0) promotionCandidates.push({row, test});
    else deferredFailures.push({row, test});
  }

  return {
    deferredFailures,
    duplicateResults: [...new Set(duplicateResults)].sort(compareCodeUnits),
    failed:
      run.state === 'error' ||
      !run.result ||
      run.result.status.status !== 0 ||
      duplicateResults.length > 0 ||
      missing.length > 0 ||
      unlisted.length > 0 ||
      supportedFailures.length > 0,
    missing,
    promotionCandidates,
    supportedFailures,
    supportedPassed,
    unlisted,
  };
}
