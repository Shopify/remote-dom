import {describe, expect, it, vi} from 'vitest';

import type {Attr} from '../Attr.ts';
import {CHILD, HOOKS, NEXT} from '../constants.ts';
import type {Element} from '../Element.ts';
import {Window} from '../index.ts';
import type {MutationRecord} from '../MutationObserver.ts';

const STATE_NAMESPACE = 'urn:state';

function expectRemovalRecord(
  record: MutationRecord,
  target: Element,
  oldValue = 'initial',
) {
  expect(record).toMatchObject({
    type: 'attributes',
    target,
    attributeName: 'state:mode',
    attributeNamespace: STATE_NAMESPACE,
    oldValue,
  });
}

describe('Document.adoptNode() attached attributes', () => {
  it('detaches an attached attribute during same-document adoption', () => {
    const window = new Window();
    const {document} = window;
    const element = document.createElement('div');
    element.setAttribute('data-state', 'initial');
    const attribute = element.attributes.getNamedItem('data-state')!;
    const removeAttribute = vi.fn(() => {
      expect(attribute.ownerElement).toBeNull();
      expect(attribute.ownerDocument).toBe(document);
      expect(attribute[NEXT]).toBeNull();
    });
    window[HOOKS] = {removeAttribute};

    expect(document.adoptNode(attribute)).toBe(attribute);

    expect(attribute.ownerElement).toBeNull();
    expect(attribute.ownerDocument).toBe(document);
    expect(attribute[NEXT]).toBeNull();
    expect(element.hasAttribute('data-state')).toBe(false);
    expect(element.attributes.getNamedItem('data-state')).toBeNull();
    expect(removeAttribute).toHaveBeenCalledOnce();
    expect(removeAttribute).toHaveBeenCalledWith(element, 'data-state', null);
  });

  it('adopts only the exact namespaced attribute and records its source removal', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = destinationWindow.document;
    const source = sourceDocument.createElement('div');
    source.setAttributeNS(STATE_NAMESPACE, 'state:mode', 'initial');
    source.setAttributeNS('urn:control', 'control:mode', 'retained');
    const attribute = source.attributes.getNamedItemNS(
      STATE_NAMESPACE,
      'mode',
    )!;
    const control = source.attributes.getNamedItemNS('urn:control', 'mode')!;
    const sourceRemoveAttribute = vi.fn();
    const destinationRemoveAttribute = vi.fn();
    sourceWindow[HOOKS] = {removeAttribute: sourceRemoveAttribute};
    destinationWindow[HOOKS] = {removeAttribute: destinationRemoveAttribute};
    const observer = new sourceWindow.MutationObserver(() => {});
    observer.observe(source, {attributes: true, attributeOldValue: true});

    expect(destinationDocument.adoptNode(attribute)).toBe(attribute);

    expect(attribute.ownerElement).toBeNull();
    expect(attribute.ownerDocument).toBe(destinationDocument);
    expect(attribute[NEXT]).toBeNull();
    expect(
      source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode'),
    ).toBeNull();
    expect(source.getAttributeNS(STATE_NAMESPACE, 'mode')).toBeNull();
    expect(source.attributes.getNamedItemNS('urn:control', 'mode')).toBe(
      control,
    );
    expect(control.ownerElement).toBe(source);
    expect(control.ownerDocument).toBe(sourceDocument);
    expect(control.value).toBe('retained');
    expect(sourceRemoveAttribute).toHaveBeenCalledOnce();
    expect(sourceRemoveAttribute).toHaveBeenCalledWith(
      source,
      'state:mode',
      STATE_NAMESPACE,
    );
    expect(destinationRemoveAttribute).not.toHaveBeenCalled();
    const records = observer.takeRecords();
    expect(records).toHaveLength(1);
    expectRemovalRecord(records[0]!, source);

    const destination = destinationDocument.createElement('div');
    expect(destination.attributes.setNamedItemNS(attribute)).toBeNull();
    expect(attribute.ownerElement).toBe(destination);
    expect(attribute.ownerDocument).toBe(destinationDocument);
    expect(destination.getAttributeNS(STATE_NAMESPACE, 'mode')).toBe('initial');
    observer.disconnect();
  });

  it.each(['hook', 'callback'] as const)(
    'preserves source reattachment from the removal %s',
    (notification) => {
      const sourceWindow = new Window();
      const destinationWindow = new Window();
      const sourceDocument = sourceWindow.document;
      const destinationDocument = destinationWindow.document;
      let attribute: Attr;
      let source: ReturnType<typeof sourceDocument.createElement>;

      const reattach = () => {
        expect(
          source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode'),
        ).toBeNull();
        expect(attribute.ownerElement).toBeNull();
        expect(attribute.ownerDocument).toBe(destinationDocument);
        expect(attribute[NEXT]).toBeNull();
        source.attributes.setNamedItemNS(attribute);
      };

      if (notification === 'callback') {
        class ReattachingElement extends sourceWindow.HTMLElement {
          static observedAttributes = ['mode'];

          attributeChangedCallback(
            _name: string,
            _oldValue: string | null,
            newValue: string | null,
          ) {
            if (newValue == null) reattach();
          }
        }
        sourceWindow.customElements.define(
          'reattaching-element',
          ReattachingElement as unknown as CustomElementConstructor,
        );
        source = sourceDocument.createElement('reattaching-element');
      } else {
        source = sourceDocument.createElement('div');
      }

      source.setAttributeNS(STATE_NAMESPACE, 'state:mode', 'initial');
      attribute = source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode')!;
      sourceWindow[HOOKS] = {
        removeAttribute: () => {
          if (notification === 'hook') reattach();
        },
      };

      destinationDocument.adoptNode(attribute);

      expect(attribute.ownerElement).toBe(source);
      expect(attribute.ownerDocument).toBe(sourceDocument);
      expect(source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode')).toBe(
        attribute,
      );
    },
  );

  it.each(['hook', 'callback'] as const)(
    'preserves a detached third-document transfer from the removal %s',
    (notification) => {
      const sourceWindow = new Window();
      const destinationDocument = new Window().document;
      const thirdDocument = new Window().document;
      const sourceDocument = sourceWindow.document;
      let attribute: Attr;
      let source: ReturnType<typeof sourceDocument.createElement>;

      const transfer = () => {
        expect(attribute.ownerElement).toBeNull();
        expect(attribute.ownerDocument).toBe(destinationDocument);
        thirdDocument.adoptNode(attribute);
      };

      if (notification === 'callback') {
        class TransferringElement extends sourceWindow.HTMLElement {
          static observedAttributes = ['mode'];

          attributeChangedCallback(
            _name: string,
            _oldValue: string | null,
            newValue: string | null,
          ) {
            if (newValue == null) transfer();
          }
        }
        sourceWindow.customElements.define(
          'transferring-element',
          TransferringElement as unknown as CustomElementConstructor,
        );
        source = sourceDocument.createElement('transferring-element');
      } else {
        source = sourceDocument.createElement('div');
      }

      source.setAttributeNS(STATE_NAMESPACE, 'state:mode', 'initial');
      attribute = source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode')!;
      sourceWindow[HOOKS] = {
        removeAttribute: () => {
          if (notification === 'hook') transfer();
        },
      };

      destinationDocument.adoptNode(attribute);

      expect(attribute.ownerElement).toBeNull();
      expect(attribute.ownerDocument).toBe(thirdDocument);
      expect(
        source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode'),
      ).toBeNull();
    },
  );

  it.each(['hook', 'callback'] as const)(
    'leaves committed ownership when the removal %s throws',
    (notification) => {
      const sourceWindow = new Window();
      const destinationDocument = new Window().document;
      const sourceDocument = sourceWindow.document;
      const error = new Error(`${notification} failed`);
      let removalCallbackCount = 0;

      class ThrowingElement extends sourceWindow.HTMLElement {
        static observedAttributes = ['mode'];

        attributeChangedCallback(
          _name: string,
          _oldValue: string | null,
          newValue: string | null,
        ) {
          if (newValue != null) return;
          removalCallbackCount++;
          expect(attribute.ownerElement).toBeNull();
          expect(attribute.ownerDocument).toBe(destinationDocument);
          if (notification === 'callback') throw error;
        }
      }
      sourceWindow.customElements.define(
        'throwing-element',
        ThrowingElement as unknown as CustomElementConstructor,
      );
      const source = sourceDocument.createElement('throwing-element');
      source.setAttributeNS(STATE_NAMESPACE, 'state:mode', 'initial');
      const attribute = source.attributes.getNamedItemNS(
        STATE_NAMESPACE,
        'mode',
      )!;
      const observer = new sourceWindow.MutationObserver(() => {});
      observer.observe(source, {attributes: true, attributeOldValue: true});
      sourceWindow[HOOKS] = {
        removeAttribute: () => {
          expect(attribute.ownerElement).toBeNull();
          expect(attribute.ownerDocument).toBe(destinationDocument);
          if (notification === 'hook') throw error;
        },
      };

      expect(() => destinationDocument.adoptNode(attribute)).toThrow(error);

      expect(attribute.ownerElement).toBeNull();
      expect(attribute.ownerDocument).toBe(destinationDocument);
      expect(attribute[NEXT]).toBeNull();
      expect(
        source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode'),
      ).toBeNull();
      const records = observer.takeRecords();
      expect(records).toHaveLength(1);
      expectRemovalRecord(records[0]!, source);
      expect(removalCallbackCount).toBe(notification === 'callback' ? 1 : 0);
      observer.disconnect();
    },
  );

  it('queues the record before the hook and exposes destination ownership to every notification', () => {
    const sourceWindow = new Window();
    const destinationDocument = new Window().document;
    const sourceDocument = sourceWindow.document;
    const events: string[] = [];
    let attribute: Attr;

    class ObservingElement extends sourceWindow.HTMLElement {
      static observedAttributes = ['mode'];

      attributeChangedCallback(
        _name: string,
        _oldValue: string | null,
        newValue: string | null,
      ) {
        if (newValue != null) return;
        events.push('callback');
        expect(attribute.ownerElement).toBeNull();
        expect(attribute.ownerDocument).toBe(destinationDocument);
      }
    }
    sourceWindow.customElements.define(
      'observing-element',
      ObservingElement as unknown as CustomElementConstructor,
    );
    const source = sourceDocument.createElement('observing-element');
    source.setAttributeNS(STATE_NAMESPACE, 'state:mode', 'initial');
    attribute = source.attributes.getNamedItemNS(STATE_NAMESPACE, 'mode')!;
    const observer = new sourceWindow.MutationObserver(() => {});
    observer.observe(source, {attributes: true, attributeOldValue: true});
    sourceWindow[HOOKS] = {
      removeAttribute: () => {
        events.push('hook');
        expect(attribute.ownerElement).toBeNull();
        expect(attribute.ownerDocument).toBe(destinationDocument);
        const records = observer.takeRecords();
        expect(records).toHaveLength(1);
        expectRemovalRecord(records[0]!, source);
      },
    };

    destinationDocument.adoptNode(attribute);

    expect(events).toEqual(['hook', 'callback']);
    observer.disconnect();
  });

  it('fails before transfer when the claimed owner map lacks the exact attribute', () => {
    const sourceWindow = new Window();
    const destinationDocument = new Window().document;
    const sourceDocument = sourceWindow.document;
    const source = sourceDocument.createElement('div');
    source.setAttribute('state', 'initial');
    const attribute = source.attributes.getNamedItem('state')!;
    source.attributes[CHILD] = null;
    const removeAttribute = vi.fn();
    sourceWindow[HOOKS] = {removeAttribute};

    expect(() => destinationDocument.adoptNode(attribute)).toThrow(
      'The owner element does not contain the adopted attribute.',
    );
    expect(attribute.ownerElement).toBe(source);
    expect(attribute.ownerDocument).toBe(sourceDocument);
    expect(attribute[NEXT]).toBeNull();
    expect(removeAttribute).not.toHaveBeenCalled();
  });

  it.each(['same-document', 'cross-document'] as const)(
    'keeps detached attribute adoption on the %s fast path without notifications',
    (kind) => {
      const sourceWindow = new Window();
      const destinationWindow = new Window();
      const sourceDocument = sourceWindow.document;
      const destinationDocument =
        kind === 'same-document' ? sourceDocument : destinationWindow.document;
      const source = sourceDocument.createElement('div');
      source.setAttribute('state', 'initial');
      const attribute = source.attributes.removeNamedItem('state')!;
      const sourceRemoveAttribute = vi.fn();
      const destinationRemoveAttribute = vi.fn();
      sourceWindow[HOOKS] = {removeAttribute: sourceRemoveAttribute};
      destinationWindow[HOOKS] = {removeAttribute: destinationRemoveAttribute};

      expect(destinationDocument.adoptNode(attribute)).toBe(attribute);
      expect(attribute.ownerElement).toBeNull();
      expect(attribute.ownerDocument).toBe(destinationDocument);
      expect(sourceRemoveAttribute).not.toHaveBeenCalled();
      expect(destinationRemoveAttribute).not.toHaveBeenCalled();
    },
  );
});
