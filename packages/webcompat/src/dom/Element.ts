import {
  NS,
  ATTRIBUTES,
  USER_PROPERTIES,
  STYLE,
  NAME,
  CHANNEL,
  ID,
  NamespaceURI,
  NodeType,
} from './constants';
import type {Document} from './Document';
import {ParentNode} from './ParentNode';
import {NamedNodeMap} from './NamedNodeMap';
import {Attr} from './Attr';
import {CSSStyleDeclaration} from './CSSStyleDeclaration';
import {querySelectorAll, querySelector} from './selectors';
import {serializeNode, serializeChildren, parseHtml} from './serialization';

let lock = false;

// Intercept initial property assignment on Element instances to install a
// getter/setter pair that forwards assigned values to the backing channel.
const elementProxy: ProxyHandler<Element> = {
  set(target, name, value, receiver) {
    let props = receiver[USER_PROPERTIES];
    if (
      lock === false &&
      typeof name === 'string' &&
      name[0] !== '_' &&
      name.length > 1 &&
      // (!(name in Element.prototype) || (props && props.indexOf(name) !== -1))
      // (!(name in receiver) || (props && props.indexOf(name) !== -1))
      (!(name in receiver) || (props && name in props))
    ) {
      const id = receiver[ID];
      if (!props) {
        // props = [];
        props = {__proto__: null};
        Reflect.set(receiver, USER_PROPERTIES, props);
      }
      // if (props.indexOf(name) === -1) {
      // On first property assignment, install a getter/setter for it on the instance
      if (!(name in props)) {
        // props.push(name);
        props[name] = value;
        Object.defineProperty(receiver, name, accessor(name, value));
      }
      // track user-defined properties prior to attachment
      if (id === undefined) {
        // const props =
        //   receiver[USER_PROPERTIES] || (receiver[USER_PROPERTIES] = []);
        // if (props.indexOf(name) === -1) props.push(name);
      } else {
        const channel = receiver[CHANNEL];
        if (channel) {
          channel.setProperty(id, name, value);
        }
      }
      return true;
    }
    Reflect.set(target, name, value, receiver);
    return true;
  },
  // get(target, name, receiver) {
  //   if (
  //     lock === false &&
  //     typeof name === 'string' &&
  //     name[0] !== '_' &&
  //     name.length > 1
  //   ) {
  //     const props = Reflect.get(receiver, USER_PROPERTIES);
  //     if (props && name in props) {
  //       return props[name];
  //     }
  //   }
  //   return Reflect.get(target, name, receiver);
  // },
  // has(target, name) {
  //   if (Reflect.has(target, name)) return true;
  //   const props = Reflect.get(target, USER_PROPERTIES);
  //   return props ? name in props : false;
  // },
  // ownKeys(target) {
  //   const keys = Reflect.ownKeys(target);
  //   const props = Reflect.get(target, USER_PROPERTIES);
  //   if (props) return keys.concat(Reflect.ownKeys(props));
  //   return keys;
  // },
};

function accessor(name: string, initialValue: any) {
  let value = initialValue;
  return {
    enumerable: true,
    configurable: true,
    get() {
      return value;
    },
    set(this: Element, newValue: any) {
      if (newValue !== value) {
        value = newValue;
        const id = this[ID];
        const channel = this[CHANNEL];
        if (id !== undefined && channel) {
          channel.setProperty(id, name, value);
        }
      }
    },
  };
}

// class ElementProto extends ParentNode {}
// Object.setPrototypeOf(
//   ElementProto.prototype,
//   new Proxy(ParentNode.prototype, elementProxy),
// );
// export class Element extends ElementProto {

export class Element extends ParentNode {
  nodeType = NodeType.ELEMENT_NODE;

  [NS] = NamespaceURI.XHTML;
  get namespaceURI() {
    return this[NS];
  }

  [ATTRIBUTES]!: NamedNodeMap;

  [USER_PROPERTIES]?: string[];

  [STYLE]?: CSSStyleDeclaration;

  [anyProperty: string]: any;

  constructor(
    ownerDocument: Document,
    localName: string,
    namespaceURI?: NamespaceURI,
  ) {
    super(((lock = true), ownerDocument));
    this[NAME] = localName;
    if (namespaceURI) this[NS] = namespaceURI;
    lock = false;

    // const proxy = new Proxy(this, elementProxy);
    // this[PROXY] = proxy;
    // \eslint-disable-next-line no-constructor-return
    // return proxy;
  }

  get attributes() {
    let attributes = this[ATTRIBUTES];
    if (!attributes) {
      attributes = new NamedNodeMap(this);
      this[ATTRIBUTES] = attributes;
    }
    return attributes;
  }

  setAttribute(name: string, value: string) {
    this.attributes.setNamedItem(new Attr(name, value));
  }

  setAttributeNS(namespace: NamespaceURI | null, name: string, value: string) {
    this.attributes.setNamedItemNS(new Attr(name, value, namespace));
  }

  getAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr && attr.value;
  }

  getAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr && attr.value;
  }

  hasAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr != null;
  }

  hasAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr != null;
  }

  removeAttribute(name: string) {
    this.attributes.removeNamedItem(name);
  }

  removeAttributeNS(namespace: NamespaceURI | null, name: string) {
    this.attributes.removeNamedItemNS(namespace, name);
  }

  querySelectorAll(selector: string) {
    return querySelectorAll(this, selector);
  }

  querySelector(selector: string) {
    return querySelector(this, selector);
  }

  set style(cssText) {
    this.style.cssText = String(cssText);
  }

  get style() {
    let style = this[STYLE];
    if (!style) {
      style = new CSSStyleDeclaration(this);
      this[STYLE] = style;
    }
    return style;
  }

  get outerHTML() {
    return serializeNode(this);
  }

  get innerHTML() {
    return serializeChildren(this);
  }

  set innerHTML(html: any) {
    if (html == null || html === '') {
      this.replaceChildren();
    } else {
      const fragment = parseHtml(String(html), this);
      this.replaceChildren(fragment);
    }
  }
}

Object.setPrototypeOf(
  Element.prototype,
  new Proxy(ParentNode.prototype, elementProxy),
);
