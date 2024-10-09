import {describe, it, expect} from 'vitest';

import {NAME} from '../constants';
import {Node} from '../Node';
import {createNode} from '../Document';
import {setupScratch} from './helpers';

describe('Node', () => {
  const {document, hooks} = setupScratch();

  it('can be constructed', () => {
    const node = createNode(new Node(), document);
    expect(node.ownerDocument).toBe(document);
    expect(node.isConnected).toBe(false);
    expect(hooks.createText).not.toHaveBeenCalled();
    expect(hooks.insertChild).not.toHaveBeenCalled();
  });

  it('exposes localName & nodeName', () => {
    const node = createNode(new Node(), document);
    node[NAME] = '#text';
    expect(node.localName).toBe('#text');
    expect(node.nodeName).toBe('#TEXT');
  });
});
