---
'@remote-ui/react': major
---

Added support for React 18 by having the consumer own the versions of `react` and `react-reconciler`. If you are currently using React 17 only, and are rendering in the “remote” context, you will need to add a dependency on `react-reconciler^0.27.0`. If you are using React 18, you will need to manually install the version of `react-reconciler` that matches up to that version (currently, `^0.29.0`).
