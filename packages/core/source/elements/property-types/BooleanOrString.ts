import type {RemoteElementPropertyType} from '../types.ts';

export const BooleanOrString: RemoteElementPropertyType<boolean | string> = {
  parse(value) {
    if (value === '') return true;
    if (value === 'false') return false;
    return String(value);
  },
  serialize(value) {
    if (typeof value === 'boolean') {
      return value ? '' : null;
    }

    return String(value);
  },
};
