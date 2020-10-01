// The dependency cycle here is between ../Component and ./diff. I am not sure
// how to resolve this any other way since components need to be able to forcibly
// diff/ commit their own updates, and the diffing process needs to construct
// component instances.

// eslint-disable-next-line import/no-cycle
export {diff, commitRoot} from './diff';
