"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPDATE_PROPERTY_TYPE_ATTRIBUTE = exports.UPDATE_PROPERTY_TYPE_EVENT_LISTENER = exports.UPDATE_PROPERTY_TYPE_PROPERTY = exports.MUTATION_TYPE_UPDATE_PROPERTY = exports.MUTATION_TYPE_UPDATE_TEXT = exports.MUTATION_TYPE_REMOVE_CHILD = exports.MUTATION_TYPE_INSERT_CHILD = exports.NODE_TYPE_TEXT = exports.NODE_TYPE_ROOT = exports.NODE_TYPE_ELEMENT = exports.NODE_TYPE_COMMENT = exports.ROOT_ID = exports.createRemoteConnection = void 0;
var connection_ts_1 = require("./connection.ts");
Object.defineProperty(exports, "createRemoteConnection", { enumerable: true, get: function () { return connection_ts_1.createRemoteConnection; } });
__exportStar(require("./types.ts"), exports);
var constants_ts_1 = require("./constants.ts");
Object.defineProperty(exports, "ROOT_ID", { enumerable: true, get: function () { return constants_ts_1.ROOT_ID; } });
Object.defineProperty(exports, "NODE_TYPE_COMMENT", { enumerable: true, get: function () { return constants_ts_1.NODE_TYPE_COMMENT; } });
Object.defineProperty(exports, "NODE_TYPE_ELEMENT", { enumerable: true, get: function () { return constants_ts_1.NODE_TYPE_ELEMENT; } });
Object.defineProperty(exports, "NODE_TYPE_ROOT", { enumerable: true, get: function () { return constants_ts_1.NODE_TYPE_ROOT; } });
Object.defineProperty(exports, "NODE_TYPE_TEXT", { enumerable: true, get: function () { return constants_ts_1.NODE_TYPE_TEXT; } });
Object.defineProperty(exports, "MUTATION_TYPE_INSERT_CHILD", { enumerable: true, get: function () { return constants_ts_1.MUTATION_TYPE_INSERT_CHILD; } });
Object.defineProperty(exports, "MUTATION_TYPE_REMOVE_CHILD", { enumerable: true, get: function () { return constants_ts_1.MUTATION_TYPE_REMOVE_CHILD; } });
Object.defineProperty(exports, "MUTATION_TYPE_UPDATE_TEXT", { enumerable: true, get: function () { return constants_ts_1.MUTATION_TYPE_UPDATE_TEXT; } });
Object.defineProperty(exports, "MUTATION_TYPE_UPDATE_PROPERTY", { enumerable: true, get: function () { return constants_ts_1.MUTATION_TYPE_UPDATE_PROPERTY; } });
Object.defineProperty(exports, "UPDATE_PROPERTY_TYPE_PROPERTY", { enumerable: true, get: function () { return constants_ts_1.UPDATE_PROPERTY_TYPE_PROPERTY; } });
Object.defineProperty(exports, "UPDATE_PROPERTY_TYPE_EVENT_LISTENER", { enumerable: true, get: function () { return constants_ts_1.UPDATE_PROPERTY_TYPE_EVENT_LISTENER; } });
Object.defineProperty(exports, "UPDATE_PROPERTY_TYPE_ATTRIBUTE", { enumerable: true, get: function () { return constants_ts_1.UPDATE_PROPERTY_TYPE_ATTRIBUTE; } });
