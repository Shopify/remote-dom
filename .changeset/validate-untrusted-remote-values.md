---
'@remote-ui/core': patch
'@remote-ui/react': patch
'@remote-ui/vue': patch
---

Validate values received from the remote environment before storing or rendering them.

`createRemoteReceiver()` now normalizes text node content to strings, rejects props containing objects that a UI framework would mistake for one of its own virtual nodes (Preact’s `constructor === undefined` shape, Vue’s `__v_isVNode` flag), rejects `__proto__` as a prop name, and requires component types to be strings. The `@remote-ui/react` host renderer never passes remote-controlled `children`, `ref`, `key`, `dangerouslySetInnerHTML`, `innerHTML`, or `outerHTML` props to host components. The `@remote-ui/vue` host renderer filters remote-controlled DOM content props, `children`, `key`, `ref`, `__proto__`, and all `onVnode*` lifecycle hooks. Vue hosts now require Vue `>=3.5.9 <4.0.0`, which checks the VNode flag before treating object children as virtual nodes. The validation helpers are exported from `@remote-ui/core` for custom receivers.
