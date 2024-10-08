import {describe, beforeEach, it, expect} from 'vitest';

import {Node} from '../Node';
import {createNode} from '../Document';
import {setupScratch} from './helpers';

describe('ParentNode', () => {
  const ctx = setupScratch();
  const {document, hooks} = ctx;

  describe('append and remove', () => {
    it('can be appended to a parent', () => {
      const node = createNode(new Node(), document);
      ctx.scratch.append(node);
      expect(hooks.insertChild).toHaveBeenCalledOnce();
      expect(hooks.insertChild).toHaveBeenCalledWith(ctx.scratch, node, 0);
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
    });

    it('can be removed from a parent', () => {
      const node = createNode(new Node(), document);
      ctx.scratch.append(node);
      ctx.scratch.removeChild(node);
      expect(hooks.insertChild).toHaveBeenCalledOnce();
      expect(hooks.insertChild).toHaveBeenCalledWith(ctx.scratch, node, 0);
      expect(hooks.removeChild).toHaveBeenCalledOnce();
      expect(hooks.removeChild).toHaveBeenCalledAfter(hooks.insertChild);
      expect(hooks.removeChild).toHaveBeenCalledWith(ctx.scratch, node, 0);
      expect(node.parentNode).toBe(null);
      expect(node.isConnected).toBe(false);
    });

    it('throws if removed from wrong parent', () => {
      const node = createNode(new Node(), document);
      ctx.scratch.append(node);
      expect(() => {
        document.body.removeChild(node);
      }).toThrow();
      expect(hooks.removeChild).not.toHaveBeenCalled();
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
    });

    it('throws if removed twice', () => {
      const node = createNode(new Node(), document);
      ctx.scratch.append(node);
      ctx.scratch.removeChild(node);
      ctx.clearMocks();
      expect(() => {
        ctx.scratch.removeChild(node);
      }).toThrow();
      expect(hooks.removeChild).not.toHaveBeenCalled();
    });
  });

  describe('re-insertion into current parent', () => {
    let node: Node;
    let node2: Node;
    let node3: Node;
    beforeEach(() => {
      node = createNode(new Node(), document);
      node2 = createNode(new Node(), document);
      node3 = createNode(new Node(), document);
      ctx.scratch.append(node, node2, node3);
      ctx.clearMocks();
    });

    it('move to end', () => {
      ctx.scratch.insertBefore(node, null);
      expect(hooks.removeChild).toHaveBeenCalledOnce();
      expect(hooks.removeChild).toHaveBeenCalledWith(ctx.scratch, node, 0);
      expect(hooks.insertChild).toHaveBeenCalledOnce();
      expect(hooks.insertChild).toHaveBeenCalledWith(ctx.scratch, node, 2);
      expect(hooks.insertChild).toHaveBeenCalledAfter(hooks.removeChild);
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
    });

    it('move to start', () => {
      ctx.scratch.insertBefore(node3, node);
      expect(hooks.removeChild).toHaveBeenCalledOnce();
      expect(hooks.removeChild).toHaveBeenCalledWith(ctx.scratch, node3, 2);
      expect(hooks.insertChild).toHaveBeenCalledOnce();
      expect(hooks.insertChild).toHaveBeenCalledWith(ctx.scratch, node3, 0);
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
    });

    it('reinsert at end', () => {
      ctx.scratch.appendChild(node3);
      expect(hooks.removeChild).toHaveBeenCalledOnce();
      expect(hooks.removeChild).toHaveBeenCalledWith(ctx.scratch, node3, 2);
      expect(hooks.insertChild).toHaveBeenCalledOnce();
      expect(hooks.insertChild).toHaveBeenCalledWith(ctx.scratch, node3, 2);
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
    });

    it('reinsert at start', () => {
      ctx.scratch.insertBefore(node, node2);
      expect(hooks.removeChild).toHaveBeenCalledOnce();
      expect(hooks.removeChild).toHaveBeenCalledWith(ctx.scratch, node, 0);
      expect(hooks.insertChild).toHaveBeenCalledOnce();
      expect(hooks.insertChild).toHaveBeenCalledWith(ctx.scratch, node, 0);
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
    });

    it('reverse children order', () => {
      ctx.scratch.replaceChildren(node3, node2, node);
      // remove all nodes in document order
      expect(hooks.removeChild).toHaveBeenCalledTimes(3);
      expect(hooks.removeChild).toHaveBeenNthCalledWith(
        1,
        ctx.scratch,
        node,
        0,
      );
      expect(hooks.removeChild).toHaveBeenNthCalledWith(
        2,
        ctx.scratch,
        node2,
        0,
      );
      expect(hooks.removeChild).toHaveBeenNthCalledWith(
        3,
        ctx.scratch,
        node3,
        0,
      );
      // insert all nodes in new order
      expect(hooks.insertChild).toHaveBeenCalledTimes(3);
      expect(hooks.insertChild).toHaveBeenNthCalledWith(
        1,
        ctx.scratch,
        node3,
        0,
      );
      expect(hooks.insertChild).toHaveBeenNthCalledWith(
        2,
        ctx.scratch,
        node2,
        1,
      );
      expect(hooks.insertChild).toHaveBeenNthCalledWith(
        3,
        ctx.scratch,
        node,
        2,
      );
      expect(node.parentNode).toBe(ctx.scratch);
      expect(node2.parentNode).toBe(ctx.scratch);
      expect(node3.parentNode).toBe(ctx.scratch);
      expect(node.isConnected).toBe(true);
      expect(node2.isConnected).toBe(true);
      expect(node3.isConnected).toBe(true);
    });
  });
});
