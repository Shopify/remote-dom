import {
  ATTRIBUTES,
  CHILD,
  DATA,
  NAME,
  NEXT,
  VALUE,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  HTML_NAMESPACE,
} from './constants.ts';
import type {Node} from './Node.ts';
import type {Text} from './Text.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';

const CHARACTER_REFERENCES: Readonly<Record<string, string>> = {
  amp: '&',
  AMP: '&',
  apos: "'",
  gt: '>',
  GT: '>',
  lt: '<',
  LT: '<',
  quot: '"',
  QUOT: '"',
};

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const ELEMENT_TOKENIZER =
  /(?:<([a-z][a-z0-9-:]*)((?:[\s]+[^<>'"=/\s]+(?:=(['"])[^]*?\3|=[^>'"\s]*|))*)[\s]*(\/?)\s*>|<\/([a-z][a-z0-9-:]*)>|<!--(.*?)-->|([^<>]+))/gi;
const ATTRIBUTE_TOKENIZER =
  /\s([^<>'"=/\n\s]+)(?:=(["'])([\s\S]*?)\2|=([^>'"\n\s]*)|)/g;

function decodeCharacterReferences(value: string) {
  return value.replace(
    /&(?:(amp|AMP|apos|gt|GT|lt|LT|quot|QUOT)|#(\d+)|#[xX]([\da-fA-F]+));/g,
    (reference, name: string | undefined, decimal, hexadecimal) => {
      if (name) return CHARACTER_REFERENCES[name]!;

      const codePoint = Number.parseInt(
        decimal ?? hexadecimal,
        decimal ? 10 : 16,
      );

      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return reference;
      }
    },
  );
}

function isVoidElement(element: Element) {
  return (
    element.namespaceURI === HTML_NAMESPACE &&
    VOID_ELEMENTS.has(element.localName)
  );
}

export function parseHtml(html: string, contextNode: Node) {
  const document = contextNode.ownerDocument;
  const root = document.createDocumentFragment();
  const stack: Node[] = [root];
  let parent: ParentNode = root;
  for (const token of html.matchAll(ELEMENT_TOKENIZER)) {
    const tag = token[1];
    if (tag) {
      const node = document.createElement(tag);
      const attrs = token[2]!;
      for (const attribute of attrs.matchAll(ATTRIBUTE_TOKENIZER)) {
        node.setAttribute(
          attribute[1]!,
          decodeCharacterReferences(attribute[3] || attribute[4] || ''),
        );
      }
      parent.append(node);
      if (isVoidElement(node)) continue;
      stack.push(parent);
      parent = node;
    } else if (token[5]) {
      parent = (stack.pop() as ParentNode) || root;
    } else if (token[6]) {
      parent.append(document.createComment(token[6]!));
    } else {
      parent.append(decodeCharacterReferences(token[7]!));
    }
  }
  return root;
}

export function serializeChildren(parentNode: ParentNode) {
  let out = '';
  let child = parentNode[CHILD];
  while (child) {
    out += serializeNode(child);
    child = child[NEXT];
  }
  return out;
}

export function serializeNode(node: Node) {
  switch (node.nodeType) {
    case NODE_TYPE_ELEMENT: {
      const el = node as Element;
      let out = `<${el[NAME]}`;
      let attr = el[ATTRIBUTES]?.[CHILD];
      while (attr) {
        out += ` ${attr[NAME]}`;
        let value = attr[VALUE];
        if (value !== '') {
          value = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
          out += `="${value}"`;
        }
        attr = attr[NEXT];
      }
      out += '>';
      if (isVoidElement(el)) return out;
      out += serializeChildren(el);
      // let child = el[CHILD];
      // while (child) {
      //   out += serialize(child);
      //   child = child[NEXT];
      // }
      out += `</${el[NAME]}>`;
      return out;
    }
    case NODE_TYPE_TEXT: {
      const text = node as Text;
      return text[DATA].replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    case NODE_TYPE_COMMENT: {
      const text = node as Comment;
      return `<!--${text[DATA]}-->`;
    }
  }
  return '';
}
