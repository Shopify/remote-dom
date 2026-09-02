import {describe, expect, it} from 'vitest';

import {CustomEvent} from '../CustomEvent.ts';

describe('CustomEvent', () => {
  describe('constructor', () => {
    it('defaults detail to null when the initialization dictionary is omitted', () => {
      expect(new CustomEvent('test').detail).toBeNull();
    });

    it('defaults detail to null when omitted from the initialization dictionary', () => {
      expect(new CustomEvent('test', {}).detail).toBeNull();
    });

    it('defaults an explicitly undefined detail to null', () => {
      expect(new CustomEvent('test', {detail: undefined}).detail).toBeNull();
    });

    it.each([null, 0, false, '', {custom: 'detail'}])(
      'preserves an explicitly supplied detail value of %j',
      (detail) => {
        expect(new CustomEvent('test', {detail}).detail).toBe(detail);
      },
    );
  });
});
