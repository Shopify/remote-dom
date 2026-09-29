import {HOST, PARENT} from './constants.ts';
import type {Node} from './Node.ts';

type HookEffect = readonly [run: () => void, publishes?: Node];

const hookEffects: HookEffect[] = [];
const pendingPublications: Node[] = [];
let isDispatchingHookEffects = false;

export function performHookEffects(effects: readonly HookEffect[]) {
  for (const effect of effects) {
    hookEffects.push(effect);
    if (effect[1]) pendingPublications.push(effect[1]);
  }
  if (isDispatchingHookEffects) return;

  isDispatchingHookEffects = true;

  try {
    let firstError: unknown;
    let didThrow = false;

    for (let index = 0; index < hookEffects.length; index++) {
      const [run, publication] = hookEffects[index]!;
      if (publication) {
        pendingPublications.splice(pendingPublications.indexOf(publication), 1);
      }

      try {
        run();
      } catch (error) {
        if (!didThrow) {
          firstError = error;
          didThrow = true;
        }
      }
    }

    if (didThrow) throw firstError;
  } finally {
    hookEffects.length = 0;
    pendingPublications.length = 0;
    isDispatchingHookEffects = false;
  }
}

export function isCoveredByPendingPublication(node: Node) {
  let current: Node | null = node;
  while (current) {
    if (pendingPublications.includes(current)) return true;
    current = current[PARENT] ?? current[HOST];
  }
  return false;
}

export type {HookEffect};
