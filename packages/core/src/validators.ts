// import {RemoteRootInsertRootValidator} from './root';
// import {RemoteComponentViolationType} from './types';

// export function restrictRoots(roots: string[]): RemoteRootInsertRootValidator {
//   return (child) =>
//     roots.includes(child.type)
//       ? undefined
//       : {
//           type: RemoteComponentViolationType.InsertRoot,
//           component: child.type,
//           message: `Only the following component types are allowed as roots: ${roots
//             .map((root) => JSON.stringify(root))
//             .join(', ')}`,
//         };
// }
