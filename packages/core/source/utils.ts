

export function getPosition(childrenOrNode: ArrayLike<unknown> | Node, remoteId: string) {
  const children = childrenOrNode instanceof Node ? childrenOrNode.childNodes : childrenOrNode;
  return Array.from(children).findIndex((c) => {
    if(!c || typeof c !== "object") {
      return;
    }

    if ("getAttribute" in c && typeof c.getAttribute === "function") {
      return c.getAttribute("id") === remoteId
    }
    if ("id" in c && typeof c.id === "string") {
      return c.id === remoteId
    }
  });
}