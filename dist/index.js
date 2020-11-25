"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
var Core;
(function (Core) {
    class Connection extends events_1.EventEmitter {
        constructor(options) {
            super();
            this._host = '';
            this._port = 0;
            if (options.host !== undefined) {
                this._host = options.host;
            }
            if (options.port !== undefined) {
                this._port = options.port;
            }
        }
        get host() {
            return this._host;
        }
        get port() {
            return this._port;
        }
        async connect() {
            throw new Error('connect: No implementation');
        }
        async send(...args) {
            throw new Error('connect: No implementation');
        }
        disconnect() {
            throw new Error('disconnect: No implementation');
        }
    }
    Connection.EventType = {
        Connect: 'connect',
        Error: 'error',
        Message: 'message',
        Disconnect: 'disconnect',
    };
    Connection.SocketEventType = {
        Connect: 'connect',
        Close: 'close',
        Error: 'error',
        Readable: 'readable',
    };
    Core.Connection = Connection;
})(Core || (Core = {}));
exports.default = Core;
