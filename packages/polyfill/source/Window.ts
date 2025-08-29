import {Document} from './Document.ts';
import {Event} from './Event.ts';
import {EventTarget} from './EventTarget.ts';
import {CustomEvent} from './CustomEvent.ts';
import {ErrorEvent} from './ErrorEvent.ts';
import {PromiseRejectionEvent} from './PromiseRejectionEvent.ts';
import {ToggleEvent} from './ToggleEvent.ts';
import {FocusEvent} from './FocusEvent.ts';
import {ClipboardEvent} from './ClipboardEvent.ts';
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
import {HOOKS} from './constants.ts';
import type {Hooks} from './hooks.ts';

type OnErrorHandler =
  | ((
      message: string,
      filename?: string,
      lineno?: number,
      colno?: number,
      error?: any,
    ) => void)
  | null;

export class Window extends EventTarget {
  [HOOKS]: Partial<Hooks> = {};
  name = '';
  window = this;
  parent = this;
  self = this;
  top = this;
  document = new Document(this);
  customElements = new CustomElementRegistryImplementation();
  location = globalThis.location;
  navigator = globalThis.navigator;
  Event = Event;
  ErrorEvent = ErrorEvent;
  PromiseRejectionEvent = PromiseRejectionEvent;
  ToggleEvent = ToggleEvent;
  FocusEvent = FocusEvent;
  ClipboardEvent = ClipboardEvent;
  EventTarget = EventTarget;
  CustomEvent = CustomEvent;
  Node = Node;
  ParentNode = ParentNode;
  ChildNode = ChildNode;
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

  #currentOnErrorHandler: ((event: any) => void) | null = null;
  #currentOriginalOnErrorHandler: OnErrorHandler = null;
  #currentOnUnhandledRejectionHandler: WindowEventHandlers['onunhandledrejection'] =
    null;

  get onerror() {
    return this.#currentOriginalOnErrorHandler;
  }
  set onerror(handler: OnErrorHandler) {
    if (this.#currentOnErrorHandler) {
      this.removeEventListener('error', this.#currentOnErrorHandler);
    }
    if (handler && typeof handler === 'function') {
      // the event listener version receives an event object
      // whereas winwow.onerror receives 5 arguments instead
      // we need to wrap the handler to convert the event object to the 5 arguments
      // and also make sure that when window.onerror is read to return the original handler
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event#syntax
      this.#currentOriginalOnErrorHandler = handler;
      this.#currentOnErrorHandler = (event: ErrorEvent) => {
        handler(
          event.message ?? 'Error',
          event.filename,
          event.lineno,
          event.colno,
          event.error,
        );
      };
      this.addEventListener('error', this.#currentOnErrorHandler);
    } else {
      this.#currentOnErrorHandler = null;
      this.#currentOriginalOnErrorHandler = null;
    }
  }

  get onunhandledrejection() {
    return this.#currentOnUnhandledRejectionHandler;
  }
  set onunhandledrejection(
    handler: WindowEventHandlers['onunhandledrejection'],
  ) {
    if (this.#currentOnUnhandledRejectionHandler) {
      this.removeEventListener(
        'unhandledrejection',
        this.#currentOnUnhandledRejectionHandler as any,
      );
    }
    if (handler && typeof handler === 'function') {
      this.#currentOnUnhandledRejectionHandler = handler;
      this.addEventListener(
        'unhandledrejection',
        this.#currentOnUnhandledRejectionHandler as any,
      );
    } else {
      this.#currentOnUnhandledRejectionHandler = null;
    }
  }

  static setGlobal(window: Window) {
    const properties = Object.getOwnPropertyDescriptors(window);

    delete (properties as any).self;

    Object.defineProperties(globalThis, properties);

    if (typeof globalThis.self === 'undefined') {
      Object.defineProperty(globalThis, 'self', {
        value: window,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    } else {
      // There can already be a `self`, like when polyfilling the DOM
      // in a Web Worker. In those cases, just mirror all the `Window`
      // properties onto `self`, rather than wholly redefining it.
      Object.defineProperties(self, properties);
    }
  }

  static setGlobalThis(window: Window) {
    for (const property in window) {
      if ((window as any)[property] === window) {
        (window as any)[property] = globalThis;
      }
    }

    const properties = Object.getOwnPropertyDescriptors(window);
    const eventTargetPrototypeProperties = Object.getOwnPropertyDescriptors(
      EventTarget.prototype,
    );

    for (const descriptor of Object.values(eventTargetPrototypeProperties)) {
      if (typeof descriptor.value === 'function') {
        descriptor.value = descriptor.value.bind(window);
      }
    }

    Object.defineProperties(globalThis, properties);
    Object.defineProperties(globalThis, eventTargetPrototypeProperties);
  }
}
