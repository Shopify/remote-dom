import path from 'node:path';

export function resolveServedWptFile(
  rawPath: string | null,
  {fixtureRoot, wptRoot}: {fixtureRoot: string; wptRoot?: string},
) {
  if (!rawPath || rawPath.includes('\\') || path.posix.isAbsolute(rawPath)) {
    return null;
  }
  const segments = rawPath.split('/');
  if (segments.some((segment) => segment === '..' || segment === '')) {
    return null;
  }

  if (rawPath.startsWith('__runner__/')) {
    return containedPath(fixtureRoot, rawPath.slice('__runner__/'.length));
  }
  return wptRoot ? containedPath(wptRoot, rawPath) : null;
}

function containedPath(root: string, relativePath: string) {
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return resolved;
}
