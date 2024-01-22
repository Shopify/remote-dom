import {RemoteElement} from './RemoteElement';

/**
 * A custom element that can be used as the `remote-fragment` element in a remote
 * environment, which is used by a number of Remote DOM libraries to represent
 * cases where multiple sibling elements are returned.
 */
export class RemoteFragmentElement extends RemoteElement {}
