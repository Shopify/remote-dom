import {describe, expectTypeOf, it} from 'vitest';

import {
  MATCHER_ATTRIBUTE,
  MATCHER_CLASS,
  MATCHER_ELEMENT,
  MATCHER_FUNCTION,
  MATCHER_ID,
  MATCHER_PSEUDO,
  MATCHER_SCOPE,
  MATCHER_UNKNOWN,
} from '../selectors.ts';
import type {
  AttributeMatcher,
  FunctionMatcher,
  Matcher,
  NameMatcher,
  NormalizedNameMatcher,
  PseudoMatcher,
  ScopeMatcher,
} from '../selectors.ts';

function assertDiscriminantNarrowing(matcher: Matcher) {
  switch (matcher.type) {
    case MATCHER_UNKNOWN:
    case MATCHER_ID:
    case MATCHER_CLASS:
      expectTypeOf(matcher).toEqualTypeOf<NameMatcher>();
      break;
    case MATCHER_ELEMENT:
      expectTypeOf(matcher).toEqualTypeOf<NormalizedNameMatcher>();
      break;
    case MATCHER_ATTRIBUTE:
      expectTypeOf(matcher).toEqualTypeOf<AttributeMatcher>();
      break;
    case MATCHER_PSEUDO:
      expectTypeOf(matcher).toEqualTypeOf<PseudoMatcher>();
      break;
    case MATCHER_FUNCTION:
      expectTypeOf(matcher).toEqualTypeOf<FunctionMatcher>();
      break;
    case MATCHER_SCOPE:
      expectTypeOf(matcher).toEqualTypeOf<ScopeMatcher>();
      break;
    default:
      expectTypeOf(matcher).toEqualTypeOf<never>();
  }
}

describe('Matcher types', () => {
  it('narrow to their distinct member contracts', () => {
    const matchers: Matcher[] = [
      {type: MATCHER_UNKNOWN, name: '*', value: '*'},
      {type: MATCHER_ELEMENT, name: 'DIV', value: 'div'},
      {type: MATCHER_ID, name: 'target', value: 'target'},
      {type: MATCHER_CLASS, name: 'active', value: 'active'},
      {type: MATCHER_ATTRIBUTE, name: 'disabled'},
      {type: MATCHER_PSEUDO, name: 'hover'},
      {type: MATCHER_FUNCTION, name: 'not', value: '.hidden'},
      {type: MATCHER_SCOPE, name: ':scope'},
    ];

    for (const matcher of matchers) assertDiscriminantNarrowing(matcher);
  });

  it('enforces optional, required, and undefined-only value contracts', () => {
    expectTypeOf<NameMatcher['value']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<NormalizedNameMatcher['value']>().toEqualTypeOf<string>();
    expectTypeOf<PseudoMatcher['value']>().toEqualTypeOf<undefined>();
    expectTypeOf<ScopeMatcher['value']>().toEqualTypeOf<undefined>();

    // @ts-expect-error Element matching requires the normalized value.
    const missingElementValue: NormalizedNameMatcher = {
      type: MATCHER_ELEMENT,
      name: 'DIV',
    };
    const pseudoWithValue: PseudoMatcher = {
      type: MATCHER_PSEUDO,
      name: 'hover',
      // @ts-expect-error Non-functional pseudo matchers cannot have arguments.
      value: 'argument',
    };

    expectTypeOf(missingElementValue).toEqualTypeOf<NormalizedNameMatcher>();
    expectTypeOf(pseudoWithValue).toEqualTypeOf<PseudoMatcher>();
  });
});
