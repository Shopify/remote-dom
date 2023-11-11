import {Document} from './Document.ts';
import {Event} from './Event.ts';
import {EventTarget} from './EventTarget.ts';
import {CustomEvent} from './CustomEvent.ts';
import {Node} from './Node.ts';
import {ParentNode} from './ParentNode.ts';
import {ChildNode} from './ChildNode.ts';
import {Element} from './Element.ts';
import {HTMLElement} from './HTMLElement.ts';
import {SVGElement} from './SVGElement.ts';
import {CharacterData} from './CharacterData.ts';
import {Text} from './Text.ts';
import {Comment} from './Comment.ts';
import {DocumentFragment} from './DocumentFragment.ts';
import {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import {CustomElementRegistryImplementation} from './CustomElementRegistry.ts';
import {MutationObserver} from './MutationObserver.ts';

export class Window extends EventTarget {
  name = '';
  parent = this;
  self = this;
  top = this;
  document = new Document(this);
  customElements = new CustomElementRegistryImplementation();
  location = globalThis.location;
  navigator = globalThis.navigator;
  Event = Event;
  Node = Node;
  ParentNode = ParentNode;
  ChildNode = ChildNode;
  EventTarget = EventTarget;
  CustomEvent = CustomEvent;
  DocumentFragment = DocumentFragment;
  Document = Document;
  CharacterData = CharacterData;
  Comment = Comment;
  Text = Text;
  Element = Element;
  HTMLElement = HTMLElement;
  SVGElement = SVGElement;
  HTMLTemplateElement = HTMLTemplateElement;
  MutationObserver = MutationObserver;
}

export function installWindowAsGlobal(window: Window) {
  const properties = Object.getOwnPropertyDescriptors(window);

  delete (properties as any).self;

  Object.defineProperties(globalThis, {
    ...properties,
    window: {value: window},
  });

  if (typeof self === 'undefined') {
    Object.defineProperty(globalThis, 'self', {value: window});
  } else {
    // There can already be a `self`, like when polyfilling the DOM
    // in a Web Worker. In those cases, just mirror all the `Window`
    // properties onto `self`, rather than wholly redefining it.
    Object.defineProperties(self, properties);
  }
}
