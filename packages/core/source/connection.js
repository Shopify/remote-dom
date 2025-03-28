"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRemoteConnection = createRemoteConnection;
var constants_ts_1 = require("./constants.ts");
/**
 * A helper for creating a `RemoteConnection` object. The `RemoteConnection`
 * protocol is pretty low-level; this function provides more human-friendly
 * naming on top of the protocol.
 */
function createRemoteConnection(_a) {
    var _b;
    var call = _a.call, insertChild = _a.insertChild, removeChild = _a.removeChild, updateText = _a.updateText, updateProperty = _a.updateProperty;
    var handlers = (_b = {},
        _b[constants_ts_1.MUTATION_TYPE_INSERT_CHILD] = insertChild,
        _b[constants_ts_1.MUTATION_TYPE_REMOVE_CHILD] = removeChild,
        _b[constants_ts_1.MUTATION_TYPE_UPDATE_TEXT] = updateText,
        _b[constants_ts_1.MUTATION_TYPE_UPDATE_PROPERTY] = updateProperty,
        _b);
    return {
        call: call,
        mutate: function (records) {
            for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
                var _a = records_1[_i], type = _a[0], args = _a.slice(1);
                handlers[type].apply(handlers, args);
            }
        },
    };
}
