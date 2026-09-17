import {describe, expectTypeOf, it} from 'vitest';

import {
  MATCHER_ATTRIBUTE,
  MATCHER_CLASS,
  MATCHER_ELEMENT,
  MATCHER_FUNCTION,
  MATCHER_ID,
  MATCHER_PSEUDO,
  MATCHER_QUALIFIED_NAME,
  MATCHER_SCOPE,
  MATCHER_UNKNOWN,
} from '../selectors.ts';
import type {
  AttributeMatcher,
  FunctionMatcher,
  Matcher,
  MatcherBase,
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
    case MATCHER_QUALIFIED_NAME:
      expectTypeOf(matcher).toEqualTypeOf<NormalizedNameMatcher>();
      break;
    default:
      expectTypeOf(matcher).toEqualTypeOf<never>();
  }
}

describe('Matcher types', () => {
  it('narrow to their distinct member contracts', () => {
    const matchers: Matcher[] = [
      {type: MATCHER_UNKNOWN, name: '*', value: '*'},
      {type: MATCHER_ELEMENT, name: 'DIV', htmlName: 'div', value: 'DIV'},
      {type: MATCHER_ID, name: 'target', value: 'target'},
      {type: MATCHER_CLASS, name: 'active', value: 'active'},
      {type: MATCHER_ATTRIBUTE, name: 'DISABLED', htmlName: 'disabled'},
      {type: MATCHER_PSEUDO, name: 'hover'},
      {type: MATCHER_FUNCTION, name: 'not', value: '.hidden'},
      {type: MATCHER_SCOPE, name: ':scope'},
      {type: MATCHER_ID, name: 'target', htmlName: 'ignored'},
      {type: MATCHER_QUALIFIED_NAME, name: 'DIV', htmlName: 'div'},
    ];

    for (const matcher of matchers) assertDiscriminantNarrowing(matcher);
  });

  it('enforces optional, required, and undefined-only field contracts', () => {
    expectTypeOf<MatcherBase['htmlName']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<NameMatcher['value']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<NormalizedNameMatcher['value']>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<NormalizedNameMatcher['htmlName']>().toEqualTypeOf<string>();
    expectTypeOf<AttributeMatcher['htmlName']>().toEqualTypeOf<string>();
    expectTypeOf<PseudoMatcher['value']>().toEqualTypeOf<undefined>();
    expectTypeOf<ScopeMatcher['value']>().toEqualTypeOf<undefined>();

    // @ts-expect-error Element matching requires the normalized HTML name.
    const missingElementHTMLName: NormalizedNameMatcher = {
      type: MATCHER_ELEMENT,
      name: 'DIV',
    };
    // @ts-expect-error Attribute matching requires the normalized HTML name.
    const missingAttributeHTMLName: AttributeMatcher = {
      type: MATCHER_ATTRIBUTE,
      name: 'DATA-STATE',
    };
    // @ts-expect-error Qualified-name matching requires the normalized HTML name.
    const missingQualifiedHTMLName: NormalizedNameMatcher = {
      type: MATCHER_QUALIFIED_NAME,
      name: 'DIV',
    };
    const pseudoWithValue: PseudoMatcher = {
      type: MATCHER_PSEUDO,
      name: 'hover',
      // @ts-expect-error Non-functional pseudo matchers cannot have arguments.
      value: 'argument',
    };

    expectTypeOf(missingElementHTMLName).toEqualTypeOf<NormalizedNameMatcher>();
    expectTypeOf(missingAttributeHTMLName).toEqualTypeOf<AttributeMatcher>();
    expectTypeOf(missingQualifiedHTMLName).toEqualTypeOf<NormalizedNameMatcher>();
    expectTypeOf(pseudoWithValue).toEqualTypeOf<PseudoMatcher>();
  });
});
