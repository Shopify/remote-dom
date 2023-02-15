---
'@remote-ui/react': patch
---

Added missing `detachDeletedInstance` function to `@remote-ui/react/reconciler`. This function is invoked during React's clean up phase, so prior to this change you'd get an exception / broken app when a component is removed from the tree.
