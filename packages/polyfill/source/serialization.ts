import {
  ATTRIBUTES,
  CHILD,
  DATA,
  NAME,
  NEXT,
  VALUE,
  NodeType,
} from './constants.ts';
import type {Node} from './Node.ts';
import type {Text} from './Text.ts';
import type {Comment} from './Comment.ts';
import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';

// const voidElements = {
//   img: true,
//   image: true,
// };
// const elementTokenizer =
//   /(?:<([a-z][a-z0-9-:]*)( [^<>'"\n=\s]+=(['"])[^>'"\n]*\3)*\s*(\/?)\s*>|<\/([a-z][a-z0-9-:]*)>|([^&<>]+))/gi;
// const attributeTokenizer = / ([^<>'"\n=\s]+)=(['"])([^>'"\n]*)\2/g;

const elementTokenizer =
  /(?:<([a-z][a-z0-9-:]*)((?:[\s]+[^<>'"=\s]+(?:=(['"])[^]*?\3|=[^>'"\s]*|))*)[\s]*(\/?)\s*>|<\/([a-z][a-z0-9-:]*)>|<!--(.*?)-->|([^&<>]+))/gi;

const attributeTokenizer =
  /\s([^<>'"=\n\s]+)(?:=(["'])([\s\S]*?)\2|=([^>'"\n\s]*)|)/g;

export function parseHtml(html: string, contextNode: Node) {
  const document = contextNode.ownerDocument;
  const root = document.createDocumentFragment();
  const stack: Node[] = [root];
  let parent: ParentNode = root;
  let token: RegExpExecArray | null;
  elementTokenizer.lastIndex = 0;
  while ((token = elementTokenizer.exec(html))) {
    const tag = token[1];
    if (tag) {
      const node = document.createElement(tag);
      const attrs = token[2]!;
      attributeTokenizer.lastIndex = 0;
      let t: RegExpExecArray | null;
      while ((t = attributeTokenizer.exec(attrs))) {
        node.setAttribute(t[1]!, t[3] || t[4] || '');
      }
      parent.append(node);
      // if (voidElements[tag] === true) continue;
      stack.push(parent);
      parent = node;
    } else if (token[5]) {
      parent = (stack.pop() as ParentNode) || root;
    } else if (token[6]) {
      parent.append(document.createComment(token[6]!));
    } else {
      parent.append(token[7]!);
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
    case NodeType.ELEMENT_NODE: {
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
      out += serializeChildren(el);
      // let child = el[CHILD];
      // while (child) {
      //   out += serialize(child);
      //   child = child[NEXT];
      // }
      out += `</${el[NAME]}>`;
      return out;
    }
    case NodeType.TEXT_NODE: {
      const text = node as Text;
      return text[DATA].replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    case NodeType.COMMENT_NODE: {
      const text = node as Comment;
      return `<!--${text[DATA]}-->`;
    }
  }
  return '';
}
