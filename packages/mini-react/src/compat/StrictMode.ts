import {Fragment} from '../Fragment';

/**
 * Strict Mode is not implemented in mini-react, so we provide a stand-in for it
 * that just renders its children without imposing any restrictions.
 */
export const StrictMode = Fragment;
