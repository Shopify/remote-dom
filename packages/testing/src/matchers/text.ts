import {
  matcherHint,
  printReceived,
  printExpected,
  RECEIVED_COLOR as receivedColor,
} from 'jest-matcher-utils';

import type {Node} from '../types';

import {assertIsNode, printReceivedWithHighlight} from './utilities';

export function toContainRemoteText<Props>(
  this: jest.MatcherUtils,
  node: Node<Props>,
  text: string,
) {
  assertIsNode(node, {
    expectation: 'toContainRemoteText',
    isNot: this.isNot,
  });

  const nodeText = node.text;
  const matchIndex = nodeText.indexOf(text);
  const pass = matchIndex >= 0;

  const message = pass
    ? () =>
        `${matcherHint('.not.toContainRemoteText', node.toString())}\n\n` +
        `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
        `Not to contain text:\n  ${printExpected(text)}\n` +
        `But it did:\n  ${printReceivedWithHighlight(
          nodeText,
          matchIndex,
          text.length,
        )}\n`
    : () =>
        `${matcherHint('.not.toContainRemoteText', node.toString())}\n\n` +
        `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
        `With text content:\n  ${printReceived(nodeText)}\n` +
        `To contain string:\n  ${printExpected(text)}\n`;

  return {pass, message};
}
