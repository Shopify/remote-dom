type HookEffect = () => void;

const hookEffects: HookEffect[] = [];
let isDispatchingHookEffects = false;

export function performHookEffects(effects: readonly HookEffect[]) {
  for (const effect of effects) hookEffects.push(effect);
  if (isDispatchingHookEffects) return;

  isDispatchingHookEffects = true;

  try {
    let firstError: unknown;
    let didThrow = false;

    for (let index = 0; index < hookEffects.length; index++) {
      try {
        hookEffects[index]!();
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
    isDispatchingHookEffects = false;
  }
}
