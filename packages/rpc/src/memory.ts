import {RETAINED_BY, RETAIN_METHOD, RELEASE_METHOD} from './types';
import type {Retainer, MemoryManageable} from './types';

export {RETAINED_BY, RETAIN_METHOD, RELEASE_METHOD};
export type {Retainer, MemoryManageable};

export class StackFrame {
  private readonly memoryManaged = new Set<MemoryManageable>();

  add(memoryManageable: MemoryManageable) {
    this.memoryManaged.add(memoryManageable);
    memoryManageable[RETAINED_BY].add(this);
    memoryManageable[RETAIN_METHOD]();
  }

  release() {
    for (const memoryManaged of this.memoryManaged) {
      memoryManaged[RETAINED_BY].delete(this);
      memoryManaged[RELEASE_METHOD]();
    }

    this.memoryManaged.clear();
  }
}

export function isMemoryManageable(value: unknown): value is MemoryManageable {
  return Boolean(
    value && (value as any)[RETAIN_METHOD] && (value as any)[RELEASE_METHOD],
  );
}

export function retain(value: any, {deep = true} = {}): boolean {
  return retainInternal(value, deep, new WeakMap());
}

function retainInternal(
  value: unknown,
  deep: boolean,
  seen: WeakMap<any, boolean>,
): boolean {
  const seenValue = seen.get(value);
  if (seenValue != null) return seenValue;

  const canRetain = isMemoryManageable(value);

  if (canRetain) {
    value[RETAIN_METHOD]();
  }

  if (deep && !canRetain && typeof value === 'object' && value != null) {
    seen.set(value, false);

    if (Array.isArray(value)) {
      const nestedCanRetain = value.reduce(
        (canRetain, item) => retainInternal(item, deep, seen) || canRetain,
        canRetain,
      );

      seen.set(value, nestedCanRetain);

      return nestedCanRetain;
    } else if (typeof value === 'object' && value != null) {
      const nestedCanRetain = Object.keys(value).reduce<boolean>(
        (canRetain, key) =>
          retainInternal((value as any)[key], deep, seen) || canRetain,
        canRetain,
      );

      seen.set(value, nestedCanRetain);

      return nestedCanRetain;
    }
  }

  return canRetain;
}

export function release(value: any, {deep = true} = {}): boolean {
  return releaseInternal(value, deep, new WeakMap());
}

export function releaseInternal(
  value: any,
  deep: boolean,
  seen: WeakMap<any, boolean>,
): boolean {
  const canRelease = isMemoryManageable(value);

  if (canRelease) {
    value[RELEASE_METHOD]();
  }

  if (deep && !canRelease && typeof value === 'object' && value != null) {
    seen.set(value, false);

    if (Array.isArray(value)) {
      const nestedCanRelease = value.reduce(
        (canRelease, item) => releaseInternal(item, deep, seen) || canRelease,
        canRelease,
      );

      seen.set(value, nestedCanRelease);

      return nestedCanRelease;
    } else if (typeof value === 'object' && value != null) {
      const nestedCanRelease = Object.keys(value).reduce<boolean>(
        (canRelease, key) =>
          releaseInternal(value[key], deep, seen) || canRelease,
        canRelease,
      );

      seen.set(value, nestedCanRelease);

      return nestedCanRelease;
    }
  }

  return canRelease;
}
