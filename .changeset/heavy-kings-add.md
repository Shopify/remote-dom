---
'@remote-ui/rpc': patch
---

Throw better errors on the RESULT and FUNCTION_RESULT methods

```js
case RESULT: {
    const [callId, method] = data[1];

    try {
        callIdsToResolver.get(callId)!(...data[1]);
        callIdsToResolver.delete(callId);
    } catch (error) {
        const {message} = error as Error;
        throw new Error(
        `Error in result listener. Method: ${method} Error: ${message}`,
        );
    }
    break;
}
```
