import {beforeEach, describe, expect, it} from 'vitest';

import {CHILD} from '../constants.ts';
import {HOOKS, HTMLElement as PolyfillHTMLElement, Window} from '../index.ts';

const WIDE_TREE_SIZE = 10_000;

let polyfillWindow: Window;
let polyfillDocument: Window['document'];

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
  polyfillDocument = polyfillWindow.document;
});

describe('wide-tree traversal', () => {
  it('collects text from wide sibling lists without overflowing the stack', () => {
    const root = polyfillDocument.createElement('div');

    for (let index = 0; index < WIDE_TREE_SIZE; index++) {
      root.appendChild(polyfillDocument.createTextNode('x'));
    }

    expect(root.textContent).toBe('x'.repeat(WIDE_TREE_SIZE));
  });

  it('queries wide sibling lists without overflowing the stack', () => {
    const root = polyfillDocument.createElement('div');
    let last;

    for (let index = 0; index < WIDE_TREE_SIZE; index++) {
      const child = polyfillDocument.createElement('span');
      if (index === WIDE_TREE_SIZE - 1) child.id = 'last-wide-child';
      root.appendChild(child);
      last = child;
    }

    expect(root.querySelectorAll('span')).toHaveLength(WIDE_TREE_SIZE);
    expect(root.querySelector('#last-wide-child')).toBe(last);
  });

  it('completes connectivity, hooks, and reactions for wide subtree insertion', () => {
    let connected = 0;
    let disconnected = 0;

    class WideTreeElement extends PolyfillHTMLElement {
      connectedCallback() {
        connected++;
      }

      disconnectedCallback() {
        disconnected++;
      }
    }

    polyfillWindow.customElements.define(
      'wide-tree-element',
      WideTreeElement as unknown as CustomElementConstructor,
    );

    const root = polyfillDocument.createElement('div');
    for (let index = 0; index < WIDE_TREE_SIZE; index++) {
      root.appendChild(polyfillDocument.createElement('wide-tree-element'));
    }

    const first = root.firstChild!;
    const last = root.lastChild!;
    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

    polyfillDocument.body.appendChild(root);

    expect(hooks).toEqual(['insert']);
    expect(connected).toBe(WIDE_TREE_SIZE);
    expect(root.isConnected).toBe(true);
    expect(first.isConnected).toBe(true);
    expect(last.isConnected).toBe(true);

    polyfillDocument.body.removeChild(root);

    expect(hooks).toEqual(['insert', 'remove']);
    expect(disconnected).toBe(WIDE_TREE_SIZE);
    expect(root.isConnected).toBe(false);
    expect(first.isConnected).toBe(false);
    expect(last.isConnected).toBe(false);
  });

  it('keeps custom-element reactions in document preorder', () => {
    const reactions: string[] = [];

    class OrderedElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push(this.id);
      }
    }

    polyfillWindow.customElements.define(
      'ordered-element',
      OrderedElement as unknown as CustomElementConstructor,
    );

    const root = polyfillDocument.createElement('ordered-element');
    const left = polyfillDocument.createElement('ordered-element');
    const grandchild = polyfillDocument.createElement('ordered-element');
    const right = polyfillDocument.createElement('ordered-element');
    root.id = 'root';
    left.id = 'left';
    grandchild.id = 'grandchild';
    right.id = 'right';
    left.appendChild(grandchild);
    root.append(left, right);

    polyfillDocument.body.appendChild(root);

    expect(reactions).toEqual(['root', 'left', 'grandchild', 'right']);
  });

  it('leaves links, connectivity, and hooks unchanged when insertion traversal fails', () => {
    const source = polyfillDocument.createElement('div');
    const destination = polyfillDocument.createElement('div');
    const subtree = polyfillDocument.createElement('section');
    const descendant = polyfillDocument.createElement('span');
    subtree.appendChild(descendant);
    source.appendChild(subtree);
    polyfillDocument.body.append(source, destination);

    const traversalError = new Error('traversal failed');
    Object.defineProperty(subtree, CHILD, {
      get() {
        throw traversalError;
      },
    });

    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

    expect(() => destination.appendChild(subtree)).toThrow(traversalError);

    expect(hooks).toEqual([]);
    expect([...source.childNodes]).toEqual([subtree]);
    expect(destination.childNodes).toHaveLength(0);
    expect(subtree.parentNode).toBe(source);
    expect(subtree.previousSibling).toBeNull();
    expect(subtree.nextSibling).toBeNull();
    expect(subtree.isConnected).toBe(true);
    expect(descendant.parentNode).toBe(subtree);
    expect(descendant.isConnected).toBe(true);
  });

  it('keeps a connected source intact across repeated failed moves to a disconnected parent', () => {
    const source = polyfillDocument.createElement('div');
    const destination = polyfillDocument.createElement('div');
    const subtree = polyfillDocument.createElement('section');
    const descendant = polyfillDocument.createElement('span');
    subtree.appendChild(descendant);
    source.appendChild(subtree);
    polyfillDocument.body.appendChild(source);

    const traversalError = new Error('traversal failed');
    Object.defineProperty(subtree, CHILD, {
      get() {
        throw traversalError;
      },
    });

    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

    for (let attempt = 0; attempt < 2; attempt++) {
      expect(() => destination.appendChild(subtree)).toThrow(traversalError);
      expect([...source.childNodes]).toEqual([subtree]);
      expect(destination.childNodes).toHaveLength(0);
      expect(subtree.parentNode).toBe(source);
      expect(subtree.isConnected).toBe(true);
      expect(descendant.isConnected).toBe(true);
    }
    expect(hooks).toEqual([]);
  });

  it('reuses one subtree snapshot for source and destination connectivity', () => {
    const source = polyfillDocument.createElement('div');
    const destination = polyfillDocument.createElement('div');
    const subtree = polyfillDocument.createElement('section');
    const descendant = polyfillDocument.createElement('span');
    subtree.appendChild(descendant);
    source.appendChild(subtree);
    polyfillDocument.body.append(source, destination);

    const traversalError = new Error('subtree traversed twice');
    const child = subtree[CHILD];
    let childReads = 0;
    Object.defineProperty(subtree, CHILD, {
      get() {
        childReads++;
        if (childReads > 1) throw traversalError;
        return child;
      },
    });

    expect(() => destination.appendChild(subtree)).not.toThrow();
    expect(childReads).toBe(1);
    expect(source.childNodes).toHaveLength(0);
    expect([...destination.childNodes]).toEqual([subtree]);
    expect(subtree.isConnected).toBe(true);
    expect(descendant.isConnected).toBe(true);
  });

  it('preflights replacement traversal before removing the old child', () => {
    const source = polyfillDocument.createElement('div');
    const parent = polyfillDocument.createElement('div');
    const replacement = polyfillDocument.createElement('section');
    const replacementChild = polyfillDocument.createElement('span');
    const oldChild = polyfillDocument.createElement('p');
    replacement.appendChild(replacementChild);
    source.appendChild(replacement);
    parent.appendChild(oldChild);
    polyfillDocument.body.append(source, parent);

    const traversalError = new Error('replacement traversal failed');
    Object.defineProperty(replacement, CHILD, {
      get() {
        throw traversalError;
      },
    });

    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

    expect(() => parent.replaceChild(replacement, oldChild)).toThrow(
      traversalError,
    );

    expect(hooks).toEqual([]);
    expect([...source.childNodes]).toEqual([replacement]);
    expect([...parent.childNodes]).toEqual([oldChild]);
    expect(replacement.parentNode).toBe(source);
    expect(replacement.isConnected).toBe(true);
    expect(replacementChild.isConnected).toBe(true);
    expect(oldChild.parentNode).toBe(parent);
    expect(oldChild.isConnected).toBe(true);
  });

  it('preflights every fragment child before consuming the fragment', () => {
    const destination = polyfillDocument.createElement('div');
    const existing = polyfillDocument.createElement('p');
    const fragment = polyfillDocument.createDocumentFragment();
    const first = polyfillDocument.createElement('section');
    const second = polyfillDocument.createElement('section');
    destination.appendChild(existing);
    fragment.append(first, second);
    polyfillDocument.body.appendChild(destination);

    const traversalError = new Error('later fragment child traversal failed');
    Object.defineProperty(second, CHILD, {
      get() {
        throw traversalError;
      },
    });

    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = () => hooks.push('insert');
    polyfillWindow[HOOKS].removeChild = () => hooks.push('remove');

    expect(() => destination.appendChild(fragment)).toThrow(traversalError);

    expect(hooks).toEqual([]);
    expect([...fragment.childNodes]).toEqual([first, second]);
    expect([...destination.childNodes]).toEqual([existing]);
    expect(first.parentNode).toBe(fragment);
    expect(second.parentNode).toBe(fragment);
    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(false);
  });

  it('runs removal-hook mutations against the committed destination tree', () => {
    const events: string[] = [];

    class TransactionElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push(`${this.id}:connected:${this.isConnected}`);
      }

      disconnectedCallback() {
        events.push(`${this.id}:disconnected:${this.isConnected}`);
      }
    }

    polyfillWindow.customElements.define(
      'transaction-element',
      TransactionElement as unknown as CustomElementConstructor,
    );

    const source = polyfillDocument.createElement('div');
    const destination = polyfillDocument.createElement('div');
    const subtree = polyfillDocument.createElement('transaction-element');
    const existing = polyfillDocument.createElement('transaction-element');
    const added = polyfillDocument.createElement('transaction-element');
    source.id = 'source';
    destination.id = 'destination';
    subtree.id = 'subtree';
    existing.id = 'existing';
    added.id = 'added';
    subtree.appendChild(existing);
    source.appendChild(subtree);
    polyfillDocument.body.append(source, destination);
    events.length = 0;

    polyfillWindow[HOOKS].removeChild = (parent, child) => {
      events.push(`remove:${parent.id}:${(child as Element).id}`);
      if (parent === (source as any) && child === (subtree as any)) {
        expect(subtree.parentNode).toBe(destination);
        expect(subtree.isConnected).toBe(true);
        expect(existing.isConnected).toBe(true);
        subtree.appendChild(added);
      }
    };
    polyfillWindow[HOOKS].insertChild = (parent, child) => {
      events.push(`insert:${parent.id}:${(child as Element).id}`);
    };

    destination.appendChild(subtree);

    expect(subtree.parentNode).toBe(destination);
    expect(added.parentNode).toBe(subtree);
    expect(added.isConnected).toBe(true);
    expect(events).toEqual([
      'remove:source:subtree',
      'insert:destination:subtree',
      'insert:subtree:added',
      'subtree:disconnected:true',
      'existing:disconnected:true',
      'subtree:connected:true',
      'existing:connected:true',
      'added:connected:true',
    ]);
  });

  it('preserves lifecycle chronology for a reentrant destination removal', () => {
    const events: string[] = [];

    class ReentrantMoveElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push(`callback:connected:${this.isConnected}`);
      }

      disconnectedCallback() {
        events.push(`callback:disconnected:${this.isConnected}`);
      }
    }

    polyfillWindow.customElements.define(
      'reentrant-move-element',
      ReentrantMoveElement as unknown as CustomElementConstructor,
    );

    const source = polyfillDocument.createElement('div');
    const destination = polyfillDocument.createElement('div');
    const child = polyfillDocument.createElement('reentrant-move-element');
    source.id = 'source';
    destination.id = 'destination';
    child.id = 'child';
    source.appendChild(child);
    polyfillDocument.body.append(source, destination);
    events.length = 0;

    polyfillWindow[HOOKS].removeChild = (parent, node) => {
      events.push(`hook:remove:${parent.id}:${(node as Element).id}`);
      if (parent === (source as any)) destination.removeChild(child);
    };
    polyfillWindow[HOOKS].insertChild = (parent, node) => {
      events.push(`hook:insert:${parent.id}:${(node as Element).id}`);
    };

    destination.appendChild(child);

    expect(events).toEqual([
      'hook:remove:source:child',
      'hook:insert:destination:child',
      'hook:remove:destination:child',
      'callback:disconnected:false',
      'callback:connected:false',
      'callback:disconnected:false',
    ]);
    expect(source.childNodes).toHaveLength(0);
    expect(destination.childNodes).toHaveLength(0);
    expect(child.parentNode).toBeNull();
    expect(child.isConnected).toBe(false);
  });

  it('emits every outer fragment insertion before a reentrant insertion', () => {
    const destination = polyfillDocument.createElement('div');
    const fragment = polyfillDocument.createDocumentFragment();
    const first = polyfillDocument.createElement('span');
    const second = polyfillDocument.createElement('span');
    const added = polyfillDocument.createElement('span');
    destination.id = 'destination';
    first.id = 'first';
    second.id = 'second';
    added.id = 'added';
    fragment.append(first, second);
    polyfillDocument.body.appendChild(destination);

    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = (parent, node) => {
      hooks.push(`insert:${parent.id}:${(node as Element).id}`);
      if (node === (first as any)) destination.appendChild(added);
    };

    destination.appendChild(fragment);

    expect(hooks).toEqual([
      'insert:destination:first',
      'insert:destination:second',
      'insert:destination:added',
    ]);
    expect([...destination.childNodes]).toEqual([first, second, added]);
  });

  it('queues replacement insertion before a reentrant removal', () => {
    const parent = polyfillDocument.createElement('div');
    const oldChild = polyfillDocument.createElement('span');
    const replacement = polyfillDocument.createElement('span');
    parent.id = 'parent';
    oldChild.id = 'old';
    replacement.id = 'replacement';
    parent.appendChild(oldChild);
    polyfillDocument.body.appendChild(parent);

    const hooks: string[] = [];
    polyfillWindow[HOOKS].removeChild = (hookParent, node) => {
      hooks.push(`remove:${hookParent.id}:${(node as Element).id}`);
      if (node === (oldChild as any)) parent.removeChild(replacement);
    };
    polyfillWindow[HOOKS].insertChild = (hookParent, node) => {
      hooks.push(`insert:${hookParent.id}:${(node as Element).id}`);
    };

    parent.replaceChild(replacement, oldChild);

    expect(hooks).toEqual([
      'remove:parent:old',
      'insert:parent:replacement',
      'remove:parent:replacement',
    ]);
    expect(parent.childNodes).toHaveLength(0);
    expect(oldChild.parentNode).toBeNull();
    expect(replacement.parentNode).toBeNull();
    expect(replacement.isConnected).toBe(false);
  });

  it('finishes queued hook effects before rethrowing a nested hook error', () => {
    const error = new Error('hook failed');
    const destination = polyfillDocument.createElement('div');
    const fragment = polyfillDocument.createDocumentFragment();
    const first = polyfillDocument.createElement('span');
    const second = polyfillDocument.createElement('span');
    const added = polyfillDocument.createElement('span');
    first.id = 'first';
    second.id = 'second';
    added.id = 'added';
    fragment.append(first, second);
    polyfillDocument.body.appendChild(destination);

    const hooks: string[] = [];
    polyfillWindow[HOOKS].insertChild = (_parent, node) => {
      hooks.push((node as Element).id);
      if (node === (first as any)) {
        destination.appendChild(added);
        throw error;
      }
    };

    expect(() => destination.appendChild(fragment)).toThrow(error);

    expect(hooks).toEqual(['first', 'second', 'added']);
    expect([...destination.childNodes]).toEqual([first, second, added]);
    expect(first.isConnected).toBe(true);
    expect(second.isConnected).toBe(true);
    expect(added.isConnected).toBe(true);
  });

  it('flushes earned insertion reactions while preserving the first hook error', () => {
    const hookError = new Error('insertion hook failed');
    const callbackError = new Error('connected callback failed');
    const events: string[] = [];

    class ThrowingInsertionElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push(`callback:${this.id}`);
        if (this.id === 'first') throw callbackError;
      }
    }

    polyfillWindow.customElements.define(
      'throwing-insertion-element',
      ThrowingInsertionElement as unknown as CustomElementConstructor,
    );

    const destination = polyfillDocument.createElement('div');
    const fragment = polyfillDocument.createDocumentFragment();
    const first = polyfillDocument.createElement('throwing-insertion-element');
    const second = polyfillDocument.createElement('throwing-insertion-element');
    first.id = 'first';
    second.id = 'second';
    fragment.append(first, second);
    polyfillDocument.body.appendChild(destination);

    polyfillWindow[HOOKS].insertChild = (_parent, node) => {
      const id = (node as Element).id;
      events.push(`hook:${id}`);
      if (id === 'first') throw hookError;
    };

    let thrown: unknown;
    try {
      destination.appendChild(fragment);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(hookError);
    expect(events).toEqual([
      'hook:first',
      'hook:second',
      'callback:first',
      'callback:second',
    ]);
    expect(first.isConnected).toBe(true);
    expect(second.isConnected).toBe(true);
  });

  it('flushes an earned disconnection reaction when its removal hook throws', () => {
    const hookError = new Error('removal hook failed');
    const events: string[] = [];

    class ThrowingRemovalElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        events.push(`callback:disconnected:${this.isConnected}`);
      }
    }

    polyfillWindow.customElements.define(
      'throwing-removal-element',
      ThrowingRemovalElement as unknown as CustomElementConstructor,
    );

    const child = polyfillDocument.createElement('throwing-removal-element');
    polyfillDocument.body.appendChild(child);
    polyfillWindow[HOOKS].removeChild = () => {
      events.push('hook:remove');
      throw hookError;
    };

    expect(() => polyfillDocument.body.removeChild(child)).toThrow(hookError);

    expect(events).toEqual(['hook:remove', 'callback:disconnected:false']);
    expect(child.parentNode).toBeNull();
    expect(child.isConnected).toBe(false);
  });

  it('flushes replacement reactions after a throwing removal hook', () => {
    const hookError = new Error('replacement removal hook failed');
    const events: string[] = [];

    class ThrowingReplacementElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push(`callback:connected:${this.id}:${this.isConnected}`);
      }

      disconnectedCallback() {
        events.push(`callback:disconnected:${this.id}:${this.isConnected}`);
      }
    }

    polyfillWindow.customElements.define(
      'throwing-replacement-element',
      ThrowingReplacementElement as unknown as CustomElementConstructor,
    );

    const parent = polyfillDocument.createElement('div');
    const oldChild = polyfillDocument.createElement(
      'throwing-replacement-element',
    );
    const replacement = polyfillDocument.createElement(
      'throwing-replacement-element',
    );
    oldChild.id = 'old';
    replacement.id = 'replacement';
    parent.appendChild(oldChild);
    polyfillDocument.body.appendChild(parent);
    events.length = 0;

    polyfillWindow[HOOKS].removeChild = (_parent, node) => {
      events.push(`hook:remove:${(node as Element).id}`);
      if (node === (oldChild as any)) throw hookError;
    };
    polyfillWindow[HOOKS].insertChild = (_parent, node) => {
      events.push(`hook:insert:${(node as Element).id}`);
    };

    expect(() => parent.replaceChild(replacement, oldChild)).toThrow(hookError);

    expect(events).toEqual([
      'hook:remove:old',
      'hook:insert:replacement',
      'callback:disconnected:old:false',
      'callback:connected:replacement:true',
    ]);
    expect(oldChild.parentNode).toBeNull();
    expect(oldChild.isConnected).toBe(false);
    expect(replacement.parentNode).toBe(parent);
    expect(replacement.isConnected).toBe(true);
  });
  it('traverses a chain deeper than ten thousand nodes without overflowing the stack', () => {
    const root = polyfillDocument.createElement('div');
    let leaf = root;

    for (let depth = 0; depth < WIDE_TREE_SIZE + 1; depth++) {
      const child = polyfillDocument.createElement('div');
      leaf.appendChild(child);
      leaf = child;
    }
    leaf.id = 'deep-leaf';
    leaf.appendChild(polyfillDocument.createTextNode('deep text'));

    expect(root.textContent).toBe('deep text');
    expect(root.querySelector('#deep-leaf')).toBe(leaf);

    polyfillDocument.body.appendChild(root);
    expect(root.isConnected).toBe(true);
    expect(leaf.isConnected).toBe(true);

    polyfillDocument.body.removeChild(root);
    expect(root.isConnected).toBe(false);
    expect(leaf.isConnected).toBe(false);
  });
});
