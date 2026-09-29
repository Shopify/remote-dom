import {beforeEach, describe, expect, it} from 'vitest';

import {Element} from '../Element.ts';
import {HOOKS, HTMLElement as PolyfillHTMLElement, Window} from '../index.ts';

let polyfillWindow: Window;
let polyfillDocument: Window['document'];

beforeEach(() => {
  polyfillWindow = new Window();
  Window.setGlobalThis(polyfillWindow);
  polyfillDocument = polyfillWindow.document;
});

function defineCustomElement(
  name: string,
  Constructor: new () => PolyfillHTMLElement,
) {
  polyfillWindow.customElements.define(
    name,
    Constructor as unknown as CustomElementConstructor,
  );
}

describe('custom-element tree reactions', () => {
  it('emits insertion before a connected callback removes the element', () => {
    const mutations: string[] = [];

    class SelfRemovingElement extends PolyfillHTMLElement {
      connectedCallback() {
        this.remove();
      }
    }

    defineCustomElement('self-removing', SelfRemovingElement);
    const element = polyfillDocument.createElement('self-removing');

    polyfillWindow[HOOKS].insertChild = () => {
      mutations.push('insert');
    };
    polyfillWindow[HOOKS].removeChild = () => {
      mutations.push('remove');
    };

    polyfillDocument.body.appendChild(element);

    expect(mutations).toEqual(['insert', 'remove']);
    expect(element.parentNode).toBeNull();
    expect(element.isConnected).toBe(false);
  });

  it('emits removal before a disconnected callback reinserts the element', () => {
    const mutations: string[] = [];

    class SelfReinsertingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        polyfillDocument.body.appendChild(this);
      }
    }

    defineCustomElement('self-reinserting', SelfReinsertingElement);
    const element = polyfillDocument.createElement('self-reinserting');
    polyfillDocument.body.appendChild(element);

    polyfillWindow[HOOKS].insertChild = () => {
      mutations.push('insert');
    };
    polyfillWindow[HOOKS].removeChild = () => {
      mutations.push('remove');
    };

    polyfillDocument.body.removeChild(element);

    expect(mutations).toEqual(['remove', 'insert']);
    expect(element.parentNode).toBe(polyfillDocument.body);
    expect(element.isConnected).toBe(true);
  });

  it('commits connectivity for the full subtree before invoking callbacks', () => {
    const connectivity: boolean[][] = [];
    let child: Element;
    let grandchild: Element;

    class SubtreeElement extends PolyfillHTMLElement {
      connectedCallback() {
        connectivity.push([
          this.isConnected,
          child.isConnected,
          grandchild.isConnected,
        ]);
      }

      disconnectedCallback() {
        connectivity.push([
          this.isConnected,
          child.isConnected,
          grandchild.isConnected,
        ]);
      }
    }

    defineCustomElement('subtree-element', SubtreeElement);
    const root = polyfillDocument.createElement('subtree-element');
    child = polyfillDocument.createElement('span');
    grandchild = polyfillDocument.createElement('span');
    child.appendChild(grandchild);
    root.appendChild(child);

    polyfillDocument.body.appendChild(root);
    polyfillDocument.body.removeChild(root);

    expect(connectivity).toEqual([
      [true, true, true],
      [false, false, false],
    ]);
  });

  it('emits insertion and preserves local state when connectedCallback throws', () => {
    const error = new Error('connected callback failed');
    const insertions: unknown[] = [];

    class ThrowingElement extends PolyfillHTMLElement {
      connectedCallback() {
        throw error;
      }
    }

    defineCustomElement('throwing-element', ThrowingElement);
    const element = polyfillDocument.createElement('throwing-element');
    polyfillWindow[HOOKS].insertChild = (_parent, node) => {
      insertions.push(node);
    };

    expect(() => polyfillDocument.body.appendChild(element)).toThrow(error);
    expect(insertions).toContain(element);
    expect(element.parentNode).toBe(polyfillDocument.body);
    expect(element.isConnected).toBe(true);
  });

  it('runs every subtree callback before rethrowing the first error', () => {
    const error = new Error('first callback failed');
    let secondCallbackRan = false;

    class FirstElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        throw error;
      }
    }

    class SecondElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        secondCallbackRan = true;
      }
    }

    defineCustomElement('first-callback', FirstElement);
    defineCustomElement('second-callback', SecondElement);
    const root = polyfillDocument.createElement('div');
    const first = polyfillDocument.createElement('first-callback');
    const second = polyfillDocument.createElement('second-callback');
    root.append(first, second);
    polyfillDocument.body.appendChild(root);

    expect(() => polyfillDocument.body.removeChild(root)).toThrow(error);
    expect(secondCallbackRan).toBe(true);
    expect(root.isConnected).toBe(false);
    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(false);
  });

  it('finishes a move before removal reactions mutate its target', () => {
    const source = polyfillDocument.createElement('div');
    const target = polyfillDocument.createElement('div');
    const reference = polyfillDocument.createElement('span');

    class TargetMutatingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        reference.remove();
      }
    }

    defineCustomElement('target-mutating', TargetMutatingElement);
    const element = polyfillDocument.createElement('target-mutating');
    source.appendChild(element);
    target.appendChild(reference);
    polyfillDocument.body.append(source, target);

    target.insertBefore(element, reference);

    expect(element.parentNode).toBe(target);
    expect(element.isConnected).toBe(true);
    expect(reference.parentNode).toBeNull();
    expect(source.childNodes).toHaveLength(0);
    expect([...target.childNodes]).toEqual([element]);
  });

  it('does not duplicate a moved node reinserted by disconnectedCallback', () => {
    const mutations: string[] = [];
    const callbackParents: Array<Element | null> = [];
    const originalParent = polyfillDocument.createElement('div');
    const target = polyfillDocument.createElement('div');

    class MoveReinsertingElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        callbackParents.push(this.parentNode as Element | null);
        if (this.parentNode !== originalParent)
          originalParent.appendChild(this);
      }
    }

    defineCustomElement('move-reinserting', MoveReinsertingElement);
    const element = polyfillDocument.createElement('move-reinserting');
    originalParent.appendChild(element);
    polyfillDocument.body.append(originalParent, target);

    polyfillWindow[HOOKS].removeChild = () => mutations.push('remove');
    polyfillWindow[HOOKS].insertChild = () => mutations.push('insert');

    target.appendChild(element);

    expect(mutations).toEqual(['remove', 'insert', 'remove', 'insert']);
    expect(callbackParents).toEqual([target, originalParent]);
    expect([...originalParent.childNodes]).toEqual([element]);
    expect(target.childNodes).toHaveLength(0);
    expect(element.nextSibling).not.toBe(element);
    expect(element.isConnected).toBe(true);
  });

  it('connects every DocumentFragment child before running callbacks', () => {
    const events: string[] = [];
    let second: Element;
    let firstObservedSecond = false;

    class FirstFragmentElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push('callback:first');
        firstObservedSecond =
          second.isConnected && second.parentNode === polyfillDocument.body;
      }
    }

    class SecondFragmentElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push('callback:second');
      }
    }

    defineCustomElement('fragment-first', FirstFragmentElement);
    defineCustomElement('fragment-second', SecondFragmentElement);
    const fragment = polyfillDocument.createDocumentFragment();
    const first = polyfillDocument.createElement('fragment-first');
    second = polyfillDocument.createElement('fragment-second');
    fragment.append(first, second);

    polyfillWindow[HOOKS].insertChild = (_parent, node) => {
      events.push(`hook:${(node as any).localName}`);
    };

    polyfillDocument.body.appendChild(fragment);

    expect(events).toEqual([
      'hook:fragment-first',
      'hook:fragment-second',
      'callback:first',
      'callback:second',
    ]);
    expect(firstObservedSecond).toBe(true);
    expect(fragment.childNodes).toHaveLength(0);
  });

  it('flushes a nested attribute reaction before returning to connectedCallback', () => {
    const reactions: string[] = [];

    class ReadyElement extends PolyfillHTMLElement {
      static observedAttributes = ['state'];
      ready = false;

      connectedCallback() {
        reactions.push('connected:start');
        this.setAttribute('state', 'ready');
        reactions.push(`connected:ready:${this.ready}`);
      }

      attributeChangedCallback() {
        this.ready = true;
        reactions.push('attribute');
      }
    }

    defineCustomElement('ready-element', ReadyElement);
    const element = polyfillDocument.createElement('ready-element');

    polyfillDocument.body.appendChild(element);

    expect(reactions).toEqual([
      'connected:start',
      'attribute',
      'connected:ready:true',
    ]);
  });

  it('flushes a nested insertion before returning to connectedCallback', () => {
    const reactions: string[] = [];
    let child: Element;

    class AppendingElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('parent:start');
        this.appendChild(child);
        reactions.push('parent:after-append');
      }
    }

    class AppendedElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('child:connected');
      }
    }

    defineCustomElement('appending-element', AppendingElement);
    defineCustomElement('appended-element', AppendedElement);
    const parent = polyfillDocument.createElement('appending-element');
    child = polyfillDocument.createElement('appended-element');

    polyfillDocument.body.appendChild(parent);

    expect(reactions).toEqual([
      'parent:start',
      'child:connected',
      'parent:after-append',
    ]);
  });

  it('drains a pending sibling before returning from its nested mutation', () => {
    const reactions: string[] = [];
    let second: Element;

    class FirstPendingElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('first:start');
        second.setAttribute('state', 'ready');
        reactions.push('first:after-set');
      }
    }

    class SecondPendingElement extends PolyfillHTMLElement {
      static observedAttributes = ['state'];

      connectedCallback() {
        reactions.push('second:connected');
      }

      attributeChangedCallback() {
        reactions.push('second:attribute');
      }
    }

    defineCustomElement('first-pending', FirstPendingElement);
    defineCustomElement('second-pending', SecondPendingElement);
    const fragment = polyfillDocument.createDocumentFragment();
    const first = polyfillDocument.createElement('first-pending');
    second = polyfillDocument.createElement('second-pending');
    fragment.append(first, second);

    polyfillDocument.body.appendChild(fragment);

    expect(reactions).toEqual([
      'first:start',
      'second:connected',
      'second:attribute',
      'first:after-set',
    ]);
  });

  it('keeps nested disconnections behind queued connection reactions', () => {
    const reactions: string[] = [];
    let child: Element;

    class RemovingAncestorElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('ancestor:connected');
        child.remove();
        reactions.push('ancestor:after-remove');
      }
    }

    class RemovedDescendantElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push(`descendant:connected:${this.isConnected}`);
      }

      disconnectedCallback() {
        reactions.push('descendant:disconnected');
      }
    }

    defineCustomElement('removing-ancestor', RemovingAncestorElement);
    defineCustomElement('removed-descendant', RemovedDescendantElement);
    const ancestor = polyfillDocument.createElement('removing-ancestor');
    child = polyfillDocument.createElement('removed-descendant');
    ancestor.appendChild(child);

    polyfillDocument.body.appendChild(ancestor);

    expect(reactions).toEqual([
      'ancestor:connected',
      'descendant:connected:false',
      'descendant:disconnected',
      'ancestor:after-remove',
    ]);
    expect(child.parentNode).toBeNull();
    expect(child.isConnected).toBe(false);
  });

  it('runs a captured callback after an earlier reaction replaces it', () => {
    const reactions: string[] = [];
    let descendant: Element;

    class ReplacingAncestorElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push('ancestor:connected');
        (descendant as any).connectedCallback = () => {
          reactions.push('descendant:replaced');
        };
      }
    }

    class OriginalDescendantElement extends PolyfillHTMLElement {
      connectedCallback() {
        reactions.push(`descendant:original:${this === descendant}`);
      }
    }

    defineCustomElement('replacing-ancestor', ReplacingAncestorElement);
    defineCustomElement('original-descendant', OriginalDescendantElement);
    const ancestor = polyfillDocument.createElement('replacing-ancestor');
    descendant = polyfillDocument.createElement('original-descendant');
    ancestor.appendChild(descendant);

    polyfillDocument.body.appendChild(ancestor);

    expect(reactions).toEqual([
      'ancestor:connected',
      'descendant:original:true',
    ]);
  });

  it('finishes a replacement before rethrowing a lifecycle error', () => {
    const error = new Error('disconnected callback failed');
    const events: string[] = [];

    class ThrowingOldElement extends PolyfillHTMLElement {
      disconnectedCallback() {
        events.push('callback:disconnected');
        throw error;
      }
    }

    class ConnectedReplacementElement extends PolyfillHTMLElement {
      connectedCallback() {
        events.push('callback:connected');
      }
    }

    defineCustomElement('throwing-old', ThrowingOldElement);
    defineCustomElement('connected-replacement', ConnectedReplacementElement);
    const parent = polyfillDocument.createElement('div');
    const oldChild = polyfillDocument.createElement('throwing-old');
    const newChild = polyfillDocument.createElement('connected-replacement');
    parent.appendChild(oldChild);
    polyfillDocument.body.appendChild(parent);

    polyfillWindow[HOOKS].removeChild = () => events.push('hook:remove');
    polyfillWindow[HOOKS].insertChild = () => events.push('hook:insert');

    expect(() => parent.replaceChild(newChild, oldChild)).toThrow(error);
    expect(events).toEqual([
      'hook:remove',
      'hook:insert',
      'callback:disconnected',
      'callback:connected',
    ]);
    expect([...parent.childNodes]).toEqual([newChild]);
    expect(oldChild.parentNode).toBeNull();
    expect(oldChild.isConnected).toBe(false);
    expect(newChild.parentNode).toBe(parent);
    expect(newChild.isConnected).toBe(true);
  });
});

describe('custom-element attribute reactions', () => {
  it('emits reentrant attribute values in local mutation order', () => {
    const values: string[] = [];

    class ReentrantAttributeElement extends PolyfillHTMLElement {
      static observedAttributes = ['state'];

      attributeChangedCallback(
        name: string,
        _oldValue: string | null,
        newValue: string | null,
      ) {
        if (newValue === 'outer') this.setAttribute(name, 'inner');
      }
    }

    defineCustomElement('reentrant-attribute', ReentrantAttributeElement);
    const element = polyfillDocument.createElement('reentrant-attribute');
    polyfillWindow[HOOKS].setAttribute = (_element, name, value) => {
      if (name === 'state') values.push(value);
    };

    element.setAttribute('state', 'outer');

    expect(values).toEqual(['outer', 'inner']);
    expect(element.getAttribute('state')).toBe('inner');
  });

  it('flushes a nested attribute reaction before returning to its callback', () => {
    const reactions: string[] = [];

    class NestedAttributeElement extends PolyfillHTMLElement {
      static observedAttributes = ['first', 'second'];

      attributeChangedCallback(name: string) {
        reactions.push(`${name}:start`);
        if (name === 'first') {
          this.setAttribute('second', 'value');
          reactions.push('first:after-set');
        }
      }
    }

    defineCustomElement('nested-attribute', NestedAttributeElement);
    const element = polyfillDocument.createElement('nested-attribute');

    element.setAttribute('first', 'value');

    expect(reactions).toEqual([
      'first:start',
      'second:start',
      'first:after-set',
    ]);
  });

  it('emits removal before an attribute callback restores the attribute', () => {
    const mutations: string[] = [];

    class RestoringAttributeElement extends PolyfillHTMLElement {
      static observedAttributes = ['state'];

      attributeChangedCallback(
        name: string,
        _oldValue: string | null,
        newValue: string | null,
      ) {
        if (newValue == null) this.setAttribute(name, 'restored');
      }
    }

    defineCustomElement('restoring-attribute', RestoringAttributeElement);
    const element = polyfillDocument.createElement('restoring-attribute');
    element.setAttribute('state', 'initial');

    polyfillWindow[HOOKS].removeAttribute = (_element, name) => {
      if (name === 'state') mutations.push('remove');
    };
    polyfillWindow[HOOKS].setAttribute = (_element, name, value) => {
      if (name === 'state') mutations.push(`set:${value}`);
    };

    element.removeAttribute('state');

    expect(mutations).toEqual(['remove', 'set:restored']);
    expect(element.getAttribute('state')).toBe('restored');
  });

  it('emits the update and preserves local state when a callback throws', () => {
    const error = new Error('attribute callback failed');
    const updates: string[] = [];

    class ThrowingAttributeElement extends PolyfillHTMLElement {
      static observedAttributes = ['state'];

      attributeChangedCallback() {
        throw error;
      }
    }

    defineCustomElement('throwing-attribute', ThrowingAttributeElement);
    const element = polyfillDocument.createElement('throwing-attribute');
    polyfillWindow[HOOKS].setAttribute = (_element, name, value) => {
      if (name === 'state') updates.push(value);
    };

    expect(() => element.setAttribute('state', 'updated')).toThrow(error);
    expect(updates).toEqual(['updated']);
    expect(element.getAttribute('state')).toBe('updated');
  });
});
