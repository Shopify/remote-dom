function Text({data}: {data?: any}) {
  return String(data);
}

function Comment() {
  return null;
}

function Fragment({children}: {children?: any}) {
  return children;
}

export const BASE_COMPONENTS = {
  '#fragment': Fragment,
  '#text': Text,
  '#comment': Comment,
} as const;

export type BaseNodeTypes =
  (typeof BASE_COMPONENTS)[keyof typeof BASE_COMPONENTS];

// components that never receive props
export const PROPLESS_TYPES = [Fragment, Comment, Text] as const;
