type CustomElementReaction = () => void;

const reactions: CustomElementReaction[] = [];
let isPerformingMutations = false;

export function enqueueCustomElementReaction(reaction: CustomElementReaction) {
  reactions.push(reaction);
}

export function performWithCustomElementReactions<T>(mutation: () => T): T {
  if (isPerformingMutations) return mutation();

  isPerformingMutations = true;

  try {
    let result: T;

    try {
      result = mutation();
    } catch (error) {
      try {
        flushCustomElementReactions();
      } catch {}

      throw error;
    }

    flushCustomElementReactions();
    return result;
  } finally {
    reactions.length = 0;
    isPerformingMutations = false;
  }
}

function flushCustomElementReactions() {
  let firstError: unknown;
  let didThrow = false;

  for (let index = 0; index < reactions.length; index++) {
    try {
      reactions[index]!();
    } catch (error) {
      if (!didThrow) {
        firstError = error;
        didThrow = true;
      }
    }
  }

  if (didThrow) throw firstError;
}
