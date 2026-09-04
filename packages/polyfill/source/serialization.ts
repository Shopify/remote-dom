import {
  ATTRIBUTES,
  CHILD,
  CONTENT,
  DATA,
  HTML_NAMESPACE,
  NS,
  NAME,
  NEXT,
  VALUE,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  type NamespaceURI,
} from './constants.ts';
import type {Node} from './Node.ts';
import type {Text} from './Text.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';
import type {HTMLTemplateElement} from './HTMLTemplateElement.ts';

const CHARACTER_REFERENCES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
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

function decodeCharacterReferences(value: string) {
  return value.replace(
    /&(?:(amp|apos|gt|lt|quot)|#(\d+)|#x([\da-f]+));/gi,
    (reference, name: string | undefined, decimal, hexadecimal) => {
      if (name) return CHARACTER_REFERENCES[name.toLowerCase()]!;

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

function isVoidElement(name: string, namespace: NamespaceURI = HTML_NAMESPACE) {
  return namespace === HTML_NAMESPACE && VOID_ELEMENTS.has(name.toLowerCase());
}

export function parseHtml(html: string, contextNode: Node) {
  const elementTokenizer =
    /(?:<([a-z][a-z0-9-:]*)((?:[\s]+[^<>'"=/\s]+(?:=(['"])[^]*?\3|=[^>'"\s]*|))*)[\s]*(\/?)\s*>|<\/([a-z][a-z0-9-:]*)>|<!--(.*?)-->|([^<>]+))/gi;
  const document = contextNode.ownerDocument;
  const root = document.createDocumentFragment();
  const stack: {element: Node; target: ParentNode}[] = [];
  let parent: ParentNode = root;
  let token: RegExpExecArray | null;
  while ((token = elementTokenizer.exec(html))) {
    const tag = token[1];
    if (tag) {
      const node = document.createElement(tag);
      const attrs = token[2]!;
      const attributeTokenizer =
        /\s([^<>'"=/\n\s]+)(?:=(["'])([\s\S]*?)\2|=([^>'"\n\s]*)|)/g;
      let t: RegExpExecArray | null;
      while ((t = attributeTokenizer.exec(attrs))) {
        node.setAttribute(t[1]!, decodeCharacterReferences(t[3] || t[4] || ''));
      }
      parent.append(node);
      if (isVoidElement(tag)) continue;
      stack.push({element: node, target: parent});
      parent =
        tag.toLowerCase() === 'template'
          ? (node as HTMLTemplateElement).content
          : node;
    } else if (token[5]) {
      parent = stack.pop()?.target ?? root;
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
            if (isVoidElement(el[NAME], el[NS])) break;

            const content = (el as {[CONTENT]?: ParentNode})[CONTENT] ?? el;
            workItems.push({type: 'closing', name: el[NAME]});
            workItems.push({type: 'content', child: content[CHILD]});
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
