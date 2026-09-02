import {
  ATTRIBUTES,
  CHILD,
  CONTENT,
  CREATE_ELEMENT,
  DATA,
  HTML_NAMESPACE,
  NAME,
  NEXT,
  NS,
  SVG_NAMESPACE,
  VALUE,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  asciiLowercase,
} from './constants.ts';
import type {Node} from './Node.ts';
import type {Text} from './Text.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';
import type {HTMLTemplateElement} from './HTMLTemplateElement.ts';

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
const SVG_HTML_BREAKOUTS =
  '|b|big|blockquote|body|br|center|code|dd|div|dl|dt|em|embed|h1|h2|h3|h4|h5|h6|head|hr|i|img|li|listing|menu|meta|nobr|ol|p|pre|ruby|s|small|span|strong|strike|sub|sup|table|tt|u|ul|var|';
const SVG_HTML_FONT_ATTRIBUTE = /^(?:color|face|size)$/i;

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

function isHtmlIntegrationPoint(element: Element) {
  const name = element.localName;
  return (
    element[NS] === SVG_NAMESPACE &&
    (name === 'foreignObject' || name === 'desc' || name === 'title')
  );
}

function isSvgHtmlBreakout(tag: string, attributes: string) {
  if (SVG_HTML_BREAKOUTS.includes(`|${tag}|`)) return true;
  if (tag !== 'font') return false;

  for (const attribute of attributes.matchAll(ATTRIBUTE_TOKENIZER)) {
    if (SVG_HTML_FONT_ATTRIBUTE.test(attribute[1]!)) return true;
  }
  return false;
}

export function parseHtml(html: string, contextNode: Node) {
  const document = contextNode.ownerDocument;
  const root = document.createDocumentFragment();
  const stack: {element: Element; target: ParentNode}[] = [];
  let parent: ParentNode = root;
  for (const token of html.matchAll(ELEMENT_TOKENIZER)) {
    const tag = token[1];
    if (tag) {
      const attrs = token[2]!;
      const normalizedTag = asciiLowercase(tag);
      const openElement =
        stack[stack.length - 1]?.element ?? (contextNode as Element);
      let namespace = openElement[NS];

      if (normalizedTag === 'svg') {
        namespace = SVG_NAMESPACE;
      } else if (namespace === SVG_NAMESPACE) {
        if (isHtmlIntegrationPoint(openElement)) {
          namespace = HTML_NAMESPACE;
        } else if (isSvgHtmlBreakout(normalizedTag, attrs)) {
          while (stack.length > 0) {
            const frame = stack[stack.length - 1]!;
            if (
              frame.element[NS] !== SVG_NAMESPACE ||
              isHtmlIntegrationPoint(frame.element)
            ) {
              break;
            }

            stack.pop();
            parent = frame.target;
          }
          namespace = HTML_NAMESPACE;
        }
      }

      const name = namespace === HTML_NAMESPACE ? normalizedTag : tag;
      const node = document[CREATE_ELEMENT](name, namespace, null, name);
      for (const attribute of attrs.matchAll(ATTRIBUTE_TOKENIZER)) {
        node.setAttribute(
          attribute[1]!,
          decodeCharacterReferences(attribute[3] || attribute[4] || ''),
        );
      }
      parent.append(node);
      if (isVoidElement(node) || (namespace !== HTML_NAMESPACE && token[4])) {
        continue;
      }
      stack.push({element: node, target: parent});
      parent =
        namespace === HTML_NAMESPACE && normalizedTag === 'template'
          ? (node as HTMLTemplateElement).content
          : node;
    } else if (token[5]) {
      const closingTag = asciiLowercase(token[5]);
      for (let index = stack.length - 1; index >= 0; index--) {
        const frame = stack[index]!;
        const frameName = asciiLowercase(frame.element[NAME]);
        if (frameName === closingTag) {
          parent = frame.target;
          stack.length = index;
          break;
        }
        if (frame.element[NS] === HTML_NAMESPACE && frameName === 'template') {
          break;
        }
      }
    } else if (token[6]) {
      parent.append(document.createComment(token[6]!));
    } else {
      parent.append(decodeCharacterReferences(token[7]!));
    }
  }
  return root;
}

type SerializationWorkItem =
  | {type: 'opening'; node: Node}
  | {type: 'content'; child: Node | null}
  | {type: 'closing'; name: string};

export function serializeChildren(parentNode: ParentNode) {
  return serialize([{type: 'content', child: parentNode[CHILD]}]);
}

export function serializeNode(node: Node) {
  return serialize([{type: 'opening', node}]);
}

function serialize(workItems: SerializationWorkItem[]) {
  const chunks: string[] = [];
  let workItem: SerializationWorkItem | undefined;

  while ((workItem = workItems.pop())) {
    switch (workItem.type) {
      case 'opening': {
        const node = workItem.node;
        switch (node.nodeType) {
          case NODE_TYPE_ELEMENT: {
            const el = node as Element;
            chunks.push(`<${el[NAME]}`);
            let attr = el[ATTRIBUTES]?.[CHILD];
            while (attr) {
              chunks.push(` ${attr[NAME]}`);
              let value = attr[VALUE];
              if (value !== '') {
                value = String(value)
                  .replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;');
                chunks.push(`="${value}"`);
              }
              attr = attr[NEXT];
            }
            chunks.push('>');
            if (isVoidElement(el)) break;

            const content =
              el.namespaceURI === HTML_NAMESPACE && el.localName === 'template'
                ? (el as {[CONTENT]?: ParentNode})[CONTENT]
                : el;
            workItems.push({type: 'closing', name: el[NAME]});
            workItems.push({
              type: 'content',
              child: content?.[CHILD] ?? null,
            });
            break;
          }
          case NODE_TYPE_TEXT: {
            const text = node as Text;
            chunks.push(
              text[DATA].replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;'),
            );
            break;
          }
          case NODE_TYPE_COMMENT: {
            const text = node as Comment;
            chunks.push(`<!--${text[DATA]}-->`);
            break;
          }
        }
        break;
      }
      case 'content': {
        const child = workItem.child;
        if (child) {
          workItems.push({type: 'content', child: child[NEXT]});
          workItems.push({type: 'opening', node: child});
        }
        break;
      }
      case 'closing':
        chunks.push(`</${workItem.name}>`);
        break;
    }
  }

  return chunks.join('');
}
