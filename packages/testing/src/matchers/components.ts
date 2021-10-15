import type {
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';
import {
  matcherHint,
  printExpected,
  EXPECTED_COLOR as expectedColor,
  RECEIVED_COLOR as receivedColor,
} from 'jest-matcher-utils';

import {Node} from '../types';

import {
  assertIsNode,
  assertIsType,
  diffs,
  pluralize,
  printType,
} from './utilities';

export function toContainRemoteComponent<
  Type extends RemoteComponentType<string, any, any>,
>(
  this: jest.MatcherUtils,
  node: Node<unknown>,
  type: Type,
  props?: Partial<PropsForRemoteComponent<Type>>,
) {
  assertIsNode(node, {
    expectation: 'toContainRemoteComponent',
    isNot: this.isNot,
  });

  assertIsType(type, {
    expectation: 'toContainRemoteComponent',
    isNot: this.isNot,
  });

  const foundByType = node.findAll(type);
  const foundByProps =
    props == null
      ? foundByType
      : foundByType.filter((element) =>
          Object.keys(props).every((key) =>
            this.equals((props as any)[key], (element.props as any)[key]),
          ),
        );

  const pass = foundByProps.length > 0;

  const message = pass
    ? () =>
        `${matcherHint('.not.toContainRemoteComponent')}\n\n` +
        `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
        `Not to contain component:\n  ${expectedColor(printType(type))}\n${
          props ? `With props matching:\n  ${printExpected(props)}\n` : ''
        }` +
        `But ${foundByProps.length} matching ${printType(type)} ${
          foundByProps.length === 1 ? 'elements were' : 'element was'
        } found.\n`
    : () =>
        `${
          `${matcherHint('.toContainRemoteComponent')}\n\n` +
          `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
          `To contain component:\n  ${expectedColor(printType(type))}\n${
            props ? `With props matching:\n  ${printExpected(props)}\n` : ''
          }`
        }${
          foundByType.length === 0
            ? `But no matching ${printType(type)} elements were found.\n`
            : `But the ${
                foundByType.length === 1
                  ? 'found element has'
                  : 'found elements have'
              } the following prop differences:\n\n${diffs(
                foundByType,
                props!,
                this.expand,
              )}`
        }`;

  return {pass, message};
}

export function toContainRemoteComponentTimes<
  Type extends RemoteComponentType<string, any, any>,
>(
  this: jest.MatcherUtils,
  node: Node<unknown>,
  type: Type,
  times: number,
  props?: Partial<PropsForRemoteComponent<Type>>,
) {
  assertIsNode(node, {
    expectation: 'toContainRemoteComponentTimes',
    isNot: this.isNot,
  });

  assertIsType(type, {
    expectation: 'toContainRemoteComponent',
    isNot: this.isNot,
  });

  const foundByType = node.findAll(type);
  const foundByProps =
    props == null
      ? foundByType
      : foundByType.filter((element) =>
          Object.keys(props).every((key) =>
            this.equals((props as any)[key], (element.props as any)[key]),
          ),
        );

  const pass = foundByProps.length === times;

  const message = pass
    ? () =>
        [
          `${matcherHint('.not.toContainRemoteComponentTimes')}\n`,
          `Expected the React element:\n  ${receivedColor(node.toString())}`,
          `Not to contain component:\n  ${expectedColor(printType(type))}`,
          `${times} ${pluralize('time', times)}, but it did.`,
        ].join('\n')
    : () =>
        [
          `${matcherHint('.toContainRemoteComponentTimes')}\n`,
          `Expected the React element:\n  ${receivedColor(node.toString())}`,
          `To contain component:\n  ${expectedColor(printType(type))}`,
          `${times} ${pluralize('time', times)}, but it was found ${
            foundByProps.length
          }.`,
        ].join('\n');

  return {pass, message};
}
