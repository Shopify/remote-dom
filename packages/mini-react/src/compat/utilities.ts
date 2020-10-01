/**
 * Check if two objects have a different shape
 */
export function shallowDiffers(first: any, second: any) {
  for (const key in first) {
    if (key !== '__source' && !(key in second)) return true;
  }

  for (const key in second) {
    if (key !== '__source' && (first as any)[key] !== (second as any)[key])
      return true;
  }

  return false;
}
