import type {Options} from './types';
import {catchError} from './catch-error';

/**
 * The `option` object can potentially contain callback functions
 * that are called during various stages of our renderer. This is the
 * foundation on which the `hooks` and `compat` layers are based.
 */
const options: Options = {
  _catchError: catchError,
};

export default options;
