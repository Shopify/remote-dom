import {describe, expect, it, vi} from 'vitest';

import {HOOKS, Window} from '../index.ts';
import {CHILD, CONTENT, PARENT} from '../constants.ts';
import type {HTMLTemplateElement} from '../HTMLTemplateElement.ts';
import {adoptNodes, collectAdoptionSnapshot} from '../shared.ts';

const DEEP_TEMPLATE_CONTENT_DEPTH = 6_000;

describe('cross-document insertion', () => {
  it('adopts a nested subtree and its attached attributes', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = destinationWindow.document;

    const root = sourceDocument.createElement('section');
    const descendant = sourceDocument.createElement('span');
    const text = sourceDocument.createTextNode('before');
    root.setAttribute('data-root', 'root');
    descendant.setAttribute('data-descendant', 'before');
    descendant.appendChild(text);
    root.appendChild(descendant);

    const rootAttribute = root.attributes.getNamedItem('data-root')!;
    const descendantAttribute =
      descendant.attributes.getNamedItem('data-descendant')!;
    const sourceSetAttribute = vi.fn();
    const sourceSetText = vi.fn();
    const sourceInsertChild = vi.fn();
    const destinationSetAttribute = vi.fn();
    const destinationSetText = vi.fn();
    const destinationInsertChild = vi.fn();

    sourceWindow[HOOKS] = {
      setAttribute: sourceSetAttribute,
      setText: sourceSetText,
      insertChild: sourceInsertChild,
    };
    destinationWindow[HOOKS] = {
      setAttribute: destinationSetAttribute,
      setText: destinationSetText,
      insertChild: destinationInsertChild,
    };

    destinationDocument.body.appendChild(root);

    expect(root.ownerDocument).toBe(destinationDocument);
    expect(descendant.ownerDocument).toBe(destinationDocument);
    expect(text.ownerDocument).toBe(destinationDocument);
    expect(rootAttribute.ownerDocument).toBe(destinationDocument);
    expect(descendantAttribute.ownerDocument).toBe(destinationDocument);

    descendant.setAttribute('data-added', 'value');
    descendantAttribute.value = 'after';
    text.data = 'after';
    descendant.appendChild(destinationDocument.createElement('strong'));

    expect(sourceSetAttribute).not.toHaveBeenCalled();
    expect(sourceSetText).not.toHaveBeenCalled();
    expect(sourceInsertChild).not.toHaveBeenCalled();
    expect(destinationSetAttribute).toHaveBeenCalledTimes(2);
    expect(destinationSetText).toHaveBeenCalledTimes(1);
    expect(destinationInsertChild).toHaveBeenCalledTimes(2);
  });

  it('adopts initialized template content and routes later mutations through the destination hooks', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = destinationWindow.document;
    const template = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const content = template.content;
    const contentElement = sourceDocument.createElement('span');
    const text = sourceDocument.createTextNode('before');
    contentElement.setAttribute('data-content', 'before');
    contentElement.appendChild(text);
    content.appendChild(contentElement);

    const attribute = contentElement.attributes.getNamedItem('data-content')!;
    const sourceSetAttribute = vi.fn();
    const sourceSetText = vi.fn();
    const sourceInsertChild = vi.fn();
    const destinationSetAttribute = vi.fn();
    const destinationSetText = vi.fn();
    const destinationInsertChild = vi.fn();

    sourceWindow[HOOKS] = {
      setAttribute: sourceSetAttribute,
      setText: sourceSetText,
      insertChild: sourceInsertChild,
    };
    destinationWindow[HOOKS] = {
      setAttribute: destinationSetAttribute,
      setText: destinationSetText,
      insertChild: destinationInsertChild,
    };

    destinationDocument.body.appendChild(template);

    for (const node of [template, content, contentElement, text, attribute]) {
      expect(node.ownerDocument).toBe(destinationDocument);
    }

    contentElement.setAttribute('data-added', 'value');
    attribute.value = 'after';
    text.data = 'after';
    contentElement.appendChild(destinationDocument.createElement('strong'));

    expect(sourceSetAttribute).not.toHaveBeenCalled();
    expect(sourceSetText).not.toHaveBeenCalled();
    expect(sourceInsertChild).not.toHaveBeenCalled();
    expect(destinationSetAttribute).toHaveBeenCalledTimes(2);
    expect(destinationSetText).toHaveBeenCalledTimes(1);
    expect(destinationInsertChild).toHaveBeenCalledTimes(2);
  });

  it('adopts initialized template content with Document.adoptNode', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = destinationWindow.document;
    const template = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const content = template.content;
    const contentElement = sourceDocument.createElement('span');
    const text = sourceDocument.createTextNode('before');
    contentElement.setAttribute('data-content', 'before');
    contentElement.appendChild(text);
    content.appendChild(contentElement);

    const attribute = contentElement.attributes.getNamedItem('data-content')!;
    const sourceSetAttribute = vi.fn();
    const sourceSetText = vi.fn();
    const sourceInsertChild = vi.fn();
    const destinationSetAttribute = vi.fn();
    const destinationSetText = vi.fn();
    const destinationInsertChild = vi.fn();

    sourceWindow[HOOKS] = {
      setAttribute: sourceSetAttribute,
      setText: sourceSetText,
      insertChild: sourceInsertChild,
    };
    destinationWindow[HOOKS] = {
      setAttribute: destinationSetAttribute,
      setText: destinationSetText,
      insertChild: destinationInsertChild,
    };

    destinationDocument.adoptNode(template);

    for (const node of [template, content, contentElement, text, attribute]) {
      expect(node.ownerDocument).toBe(destinationDocument);
    }

    contentElement.setAttribute('data-added', 'value');
    attribute.value = 'after';
    text.data = 'after';
    contentElement.appendChild(destinationDocument.createElement('strong'));

    expect(sourceSetAttribute).not.toHaveBeenCalled();
    expect(sourceSetText).not.toHaveBeenCalled();
    expect(sourceInsertChild).not.toHaveBeenCalled();
    expect(destinationSetAttribute).toHaveBeenCalledTimes(2);
    expect(destinationSetText).toHaveBeenCalledTimes(1);
    expect(destinationInsertChild).toHaveBeenCalledTimes(1);
  });

  it('does not initialize untouched template content during adoption', () => {
    const sourceDocument = new Window().document;
    const destinationDocument = new Window().document;
    const template = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;

    expect(template[CONTENT]).toBeUndefined();

    destinationDocument.body.appendChild(template);

    expect(template.ownerDocument).toBe(destinationDocument);
    expect(template[CONTENT]).toBeUndefined();
  });

  it('snapshots and adopts a malformed direct template host cycle once', () => {
    const sourceDocument = new Window().document;
    const destinationDocument = new Window().document;
    const template = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const content = template.content;

    content[CHILD] = template;
    template[PARENT] = content;

    const snapshot = collectAdoptionSnapshot(template);

    expect(snapshot.treeNodes).toEqual([template]);
    expect(snapshot.nodes).toEqual([template, content]);
    expect(template.ownerDocument).toBe(sourceDocument);
    expect(content.ownerDocument).toBe(sourceDocument);

    adoptNodes(snapshot.nodes, destinationDocument);

    expect(template.ownerDocument).toBe(destinationDocument);
    expect(content.ownerDocument).toBe(destinationDocument);
  });

  it('snapshots and adopts a malformed mutual template host cycle once', () => {
    const sourceDocument = new Window().document;
    const destinationDocument = new Window().document;
    const first = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const second = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const firstContent = first.content;
    const secondContent = second.content;

    firstContent[CHILD] = second;
    second[PARENT] = firstContent;
    secondContent[CHILD] = first;
    first[PARENT] = secondContent;

    const snapshot = collectAdoptionSnapshot(first);

    expect(snapshot.treeNodes).toEqual([first]);
    expect(snapshot.nodes).toEqual([
      first,
      firstContent,
      second,
      secondContent,
    ]);
    for (const node of snapshot.nodes) {
      expect(node.ownerDocument).toBe(sourceDocument);
    }

    adoptNodes(snapshot.nodes, destinationDocument);

    for (const node of snapshot.nodes) {
      expect(node.ownerDocument).toBe(destinationDocument);
    }
  });

  it('iteratively adopts deeply nested template content', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = destinationWindow.document;
    const root = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const templates = [root];
    const contents = [];
    let leaf = root;

    for (let depth = 0; depth < DEEP_TEMPLATE_CONTENT_DEPTH; depth++) {
      const content = leaf.content;
      const nested = sourceDocument.createElement(
        'template',
      ) as HTMLTemplateElement;
      content.appendChild(nested);
      contents.push(content);
      templates.push(nested);
      leaf = nested;
    }

    const sourceInsertChild = vi.fn();
    const sourceSetAttribute = vi.fn();
    const destinationInsertChild = vi.fn();
    const destinationSetAttribute = vi.fn();
    sourceWindow[HOOKS] = {
      insertChild: sourceInsertChild,
      setAttribute: sourceSetAttribute,
    };
    destinationWindow[HOOKS] = {
      insertChild: destinationInsertChild,
      setAttribute: destinationSetAttribute,
    };

    expect(leaf[CONTENT]).toBeUndefined();

    destinationDocument.body.appendChild(root);

    for (const template of templates) {
      expect(template.ownerDocument).toBe(destinationDocument);
    }
    for (const content of contents) {
      expect(content.ownerDocument).toBe(destinationDocument);
    }
    expect(leaf[CONTENT]).toBeUndefined();

    leaf.setAttribute('data-deep', 'adopted');

    expect(sourceInsertChild).not.toHaveBeenCalled();
    expect(sourceSetAttribute).not.toHaveBeenCalled();
    expect(destinationInsertChild).toHaveBeenCalledTimes(1);
    expect(destinationSetAttribute).toHaveBeenCalledTimes(1);
  }, 20_000);

  it('preflights template content before changing insertion state', () => {
    const sourceWindow = new Window();
    const destinationWindow = new Window();
    const sourceDocument = sourceWindow.document;
    const destinationDocument = destinationWindow.document;
    const source = sourceDocument.createElement('div');
    const destination = destinationDocument.createElement('div');
    const template = sourceDocument.createElement(
      'template',
    ) as HTMLTemplateElement;
    const content = template.content;
    const contentElement = sourceDocument.createElement('span');
    contentElement.setAttribute('data-content', 'value');
    content.appendChild(contentElement);
    source.appendChild(template);
    sourceDocument.body.appendChild(source);
    destinationDocument.body.appendChild(destination);

    const attribute = contentElement.attributes.getNamedItem('data-content')!;
    const nodes = [template, content, contentElement, attribute];
    const originalOwnerDocuments = nodes.map((node) => node.ownerDocument);
    const originalConnectivity = nodes.map((node) => node.isConnected);
    const traversalError = new Error('template content traversal failed');
    Object.defineProperty(content, CHILD, {
      get() {
        throw traversalError;
      },
    });

    const sourceInsertChild = vi.fn();
    const sourceRemoveChild = vi.fn();
    const destinationInsertChild = vi.fn();
    const destinationRemoveChild = vi.fn();
    sourceWindow[HOOKS] = {
      insertChild: sourceInsertChild,
      removeChild: sourceRemoveChild,
    };
    destinationWindow[HOOKS] = {
      insertChild: destinationInsertChild,
      removeChild: destinationRemoveChild,
    };

    expect(() => destination.appendChild(template)).toThrow(traversalError);

    expect([...source.childNodes]).toEqual([template]);
    expect(destination.childNodes).toHaveLength(0);
    expect(source.parentNode).toBe(sourceDocument.body);
    expect(destination.parentNode).toBe(destinationDocument.body);
    expect(source.isConnected).toBe(true);
    expect(destination.isConnected).toBe(true);
    expect(template.parentNode).toBe(source);
    expect(template.previousSibling).toBeNull();
    expect(template.nextSibling).toBeNull();
    expect([...content.childNodes]).toEqual([contentElement]);
    expect(contentElement.parentNode).toBe(content);
    nodes.forEach((node, index) => {
      expect(node.ownerDocument).toBe(originalOwnerDocuments[index]);
      expect(node.isConnected).toBe(originalConnectivity[index]);
    });
    expect(sourceInsertChild).not.toHaveBeenCalled();
    expect(sourceRemoveChild).not.toHaveBeenCalled();
    expect(destinationInsertChild).not.toHaveBeenCalled();
    expect(destinationRemoveChild).not.toHaveBeenCalled();
  });

  it('adopts every subtree inserted from a document fragment', () => {
    const sourceDocument = new Window().document;
    const destinationDocument = new Window().document;
    const fragment = sourceDocument.createDocumentFragment();
    const first = sourceDocument.createElement('div');
    const second = sourceDocument.createElement('section');
    const descendant = sourceDocument.createElement('span');
    const text = sourceDocument.createTextNode('content');
    descendant.setAttribute('data-nested', 'value');
    descendant.appendChild(text);
    second.appendChild(descendant);
    fragment.append(first, second);

    const attribute = descendant.attributes.getNamedItem('data-nested')!;

    destinationDocument.body.appendChild(fragment);

    expect(fragment.ownerDocument).toBe(sourceDocument);
    for (const node of [first, second, descendant, text, attribute]) {
      expect(node.ownerDocument).toBe(destinationDocument);
    }
    expect(fragment.childNodes).toHaveLength(0);
  });
});
