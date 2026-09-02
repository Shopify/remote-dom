import {
  XML_NAMESPACE,
  XMLNS_NAMESPACE,
  type NamespaceURI,
} from './constants.ts';

const VALID_ELEMENT_LOCAL_NAME =
  /^(?:[A-Za-z][^\0\t\n\f\r\u0020/>]*|[:_\u0080-\u{10FFFF}][A-Za-z0-9-.:_\u0080-\u{10FFFF}]*)$/u;
const INVALID_ATTRIBUTE_LOCAL_NAME = /[\0\t\n\f\r />=]/u;
const INVALID_NAMESPACE_PREFIX = /[\0\t\n\f\r />]/u;

export function normalizeNamespace(namespace: unknown): NamespaceURI {
  if (namespace == null) return null;

  const normalized = String(namespace);
  return normalized === '' ? null : normalized;
}

export function validateElementLocalName(name: string) {
  if (!VALID_ELEMENT_LOCAL_NAME.test(name)) {
    throwInvalidCharacterError(name);
  }
}

export function validateAttributeLocalName(name: string) {
  if (name === '' || INVALID_ATTRIBUTE_LOCAL_NAME.test(name)) {
    throwInvalidCharacterError(name);
  }
}

export function validateAndExtractQualifiedName(
  namespaceValue: unknown,
  qualifiedNameValue: unknown,
  kind: 'element' | 'attribute',
) {
  const namespace = normalizeNamespace(namespaceValue);
  const qualifiedName = String(qualifiedNameValue);
  const separator = qualifiedName.indexOf(':');
  const prefix = separator < 0 ? null : qualifiedName.slice(0, separator);
  const localName =
    separator < 0 ? qualifiedName : qualifiedName.slice(separator + 1);

  if (
    (prefix != null &&
      (prefix === '' || INVALID_NAMESPACE_PREFIX.test(prefix))) ||
    (kind === 'element'
      ? !VALID_ELEMENT_LOCAL_NAME.test(localName)
      : localName === '' || INVALID_ATTRIBUTE_LOCAL_NAME.test(localName))
  ) {
    throwInvalidCharacterError(qualifiedName);
  }

  if (prefix != null && namespace == null) {
    throw new DOMException(
      `A namespace is required for the prefix in "${qualifiedName}"`,
      'NamespaceError',
    );
  }

  if (prefix === 'xml' && namespace !== XML_NAMESPACE) {
    throw new DOMException(
      `The xml prefix requires the XML namespace`,
      'NamespaceError',
    );
  }

  if (
    (qualifiedName === 'xmlns' || prefix === 'xmlns') &&
    namespace !== XMLNS_NAMESPACE
  ) {
    throw new DOMException(
      `The xmlns name requires the XMLNS namespace`,
      'NamespaceError',
    );
  }

  if (
    namespace === XMLNS_NAMESPACE &&
    qualifiedName !== 'xmlns' &&
    prefix !== 'xmlns'
  ) {
    throw new DOMException(
      `The XMLNS namespace requires the xmlns name or prefix`,
      'NamespaceError',
    );
  }

  return {namespace, qualifiedName, prefix, localName};
}

function throwInvalidCharacterError(name: string): never {
  throw new DOMException(`Invalid name: "${name}"`, 'InvalidCharacterError');
}
