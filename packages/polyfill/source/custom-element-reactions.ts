type CustomElementReaction = () => void;
type ReactionTarget = object;

const scopes: ReactionTarget[][] = [];
const reactionsByTarget = new WeakMap<
  ReactionTarget,
  CustomElementReaction[]
>();

export function enqueueCustomElementReaction(
  target: ReactionTarget,
  reaction: CustomElementReaction,
) {
  const reactions = reactionsByTarget.get(target);
  if (reactions) reactions.push(reaction);
  else reactionsByTarget.set(target, [reaction]);
  scopes[scopes.length - 1]!.push(target);
}

export function performWithCustomElementReactions<T>(mutation: () => T): T {
  const scope: ReactionTarget[] = [];
  scopes.push(scope);

  let result: T;
  try {
    result = mutation();
  } catch (error) {
    scopes.pop();
    try {
      flushCustomElementReactions(scope);
    } catch {}
    throw error;
  }

  scopes.pop();
  flushCustomElementReactions(scope);
  return result;
}

function flushCustomElementReactions(scope: ReactionTarget[]) {
  let firstError: unknown;
  let didThrow = false;

  for (const target of scope) {
    const reactions = reactionsByTarget.get(target);
    if (!reactions) continue;

    while (reactions.length > 0) {
      const reaction = reactions.shift()!;
      try {
        reaction();
      } catch (error) {
        if (!didThrow) {
          firstError = error;
          didThrow = true;
        }
      }
    }

    reactionsByTarget.delete(target);
  }

  if (didThrow) throw firstError;
}
