export function createDOMException(
  message: string,
  name: string,
): DOMException {
  const DOMExceptionConstructor = globalThis.DOMException;

  if (typeof DOMExceptionConstructor === 'function') {
    return new DOMExceptionConstructor(message, name);
  }

  const error = new Error(message);
  error.name = name;
  return error as DOMException;
}
