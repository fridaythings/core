"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const net_1 = __importDefault(require("net"));
var Core;
(function (Core) {
    class F {
        static stringify(data) {
            try {
                return JSON.stringify(data) + '\r\n';
            }
            catch (e) {
                return '';
            }
        }
        static parseBuffer(buffer, defaultValue = {}) {
            const lines = buffer.toString().split(Core.F.Separator);
            return lines.reduce((acc, line) => {
                if (line) {
                    try {
                        const data = JSON.parse(line);
                        acc.push(data);
                    }
                    catch (e) {
                        acc.push(defaultValue);
                    }
                }
                return acc;
            }, []);
        }
    }
    F.Separator = '\r\n';
    Core.F = F;
    let ConnectionEventType;
    (function (ConnectionEventType) {
        ConnectionEventType["Connection"] = "connection";
        ConnectionEventType["Connect"] = "connect";
        ConnectionEventType["Close"] = "close";
        ConnectionEventType["Data"] = "data";
        ConnectionEventType["Drain"] = "drain";
        ConnectionEventType["End"] = "end";
        ConnectionEventType["Error"] = "error";
        ConnectionEventType["Lookup"] = "lookup";
        ConnectionEventType["Ready"] = "ready";
        ConnectionEventType["Timeout"] = "timeout";
    })(ConnectionEventType = Core.ConnectionEventType || (Core.ConnectionEventType = {}));
    let DeviceEventType;
    (function (DeviceEventType) {
        DeviceEventType["Connect"] = "connect";
        DeviceEventType["Disconnect"] = "close";
        DeviceEventType["Error"] = "error";
        DeviceEventType["Change"] = "change";
    })(DeviceEventType = Core.DeviceEventType || (Core.DeviceEventType = {}));
    class Connection extends events_1.EventEmitter {
        constructor(options = {}) {
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
        disconnect() {
            throw new Error('disconnect: No implementation');
        }
        async send(...args) {
            throw new Error('connect: No implementation');
        }
    }
    Core.Connection = Connection;
    class Device extends Core.Connection {
        constructor(options) {
            super(options);
            this._requestId = 0;
            this._eventId = 0;
            this._state = {};
            this._commands = [];
            this._id = options.id;
            this._model = options.model;
            this._name = options.name;
            this._version = options.version;
            if (options.state !== undefined) {
                this._state = options.state;
            }
            if (options.commands !== undefined) {
                this._commands = options.commands;
            }
        }
        onTimeout(id, callback) {
            const timeoutId = setTimeout(() => {
                callback(new Error(`Request timeout: ${id}`));
                clearTimeout(timeoutId);
            }, Device.RequestTimeout);
        }
        emit(event, ...args) {
            this._eventId++;
            return super.emit(event, ...args);
        }
        get id() {
            return this._id;
        }
        get model() {
            return this._model;
        }
        get name() {
            return this._name;
        }
        get version() {
            return this._version;
        }
        get commands() {
            return this._commands;
        }
        get state() {
            return this._state;
        }
        async send(command, params) {
            this._requestId++;
            return Promise.resolve({ id: this._requestId, result: {} });
        }
        connect() {
            throw new Error(`No "connect" implementation for device: [id: ${this.id}]`);
        }
        disconnect() {
            this.removeAllListeners();
        }
        toObject() {
            return {
                id: this.id,
                host: this.host,
                port: this.port,
                model: this.model,
                name: this.name,
                version: this.version,
                commands: this.commands,
                state: this.state,
            };
        }
        toString() {
            return JSON.stringify(this.toObject());
        }
    }
    Device.RequestTimeout = 5000;
    Core.Device = Device;
    class TCPDevice extends Core.Device {
        constructor(options) {
            super(options);
            this._client = new net_1.default.Socket();
            this._client.setEncoding('utf8');
            this._client.setNoDelay();
            this._client.setKeepAlive(true);
            this._client.on(ConnectionEventType.Error, this.emit.bind(this, DeviceEventType.Error));
            this._client.on(ConnectionEventType.Connect, this.emit.bind(this, DeviceEventType.Connect));
            this._client.on(ConnectionEventType.Close, (...args) => {
                this.emit(DeviceEventType.Disconnect, ...args);
                this._client.removeAllListeners();
            });
        }
        async connect() {
            return new Promise(resolve => this._client.connect({ port: this._port, host: this._host }, resolve));
        }
        disconnect() {
            super.disconnect();
            this._client.destroy();
        }
        send(command, params) {
            return super.send(command, params);
        }
    }
    Core.TCPDevice = TCPDevice;
    let ServiceEventType;
    (function (ServiceEventType) {
        ServiceEventType["Error"] = "error";
        ServiceEventType["Connect"] = "connect";
        ServiceEventType["Disconnect"] = "disconnect";
        ServiceEventType["Data"] = "data";
        ServiceEventType["DeviceAdded"] = "device-added";
        ServiceEventType["DeviceChanged"] = "device-changed";
        ServiceEventType["DeviceRemoved"] = "device-removed";
    })(ServiceEventType = Core.ServiceEventType || (Core.ServiceEventType = {}));
    class Service extends Core.Connection {
        constructor(options) {
            super(options);
            this._devices = new Map();
            this._timeouts = [];
        }
        get devices() {
            return this._devices;
        }
        async scan() {
            throw new Error(`No "scan" implementation for service: [port: ${this._port}]`);
        }
        async send(...args) {
            throw new Error(`No "send" implementation for service: [port: ${this._port}]`);
        }
        async connect() {
            this.on(ServiceEventType.Connect, async () => {
                await this.scan();
                const timeoutId = setInterval(this.scan.bind(this), Service.ScanInterval);
                this._timeouts.push(timeoutId);
            });
        }
        disconnect() {
            this._devices.forEach(device => device.disconnect());
            this._timeouts.forEach(clearTimeout);
            this._timeouts = [];
            this.removeAllListeners();
            this.emit(ServiceEventType.Disconnect);
        }
    }
    Service.ScanInterval = 5000;
    Core.Service = Service;
    let TCP;
    (function (TCP) {
        // export class ServiceManager extends Core.Connection {
        //   protected _services: Set<Core.Service>;
        //   protected _server: net.Server = new net.Server();
        //   protected _connections: Set<net.Socket> = new Set();
        //
        //   constructor(options: Core.TCP.IServiceManagerOptions) {
        //     super(options);
        //     this._services = new Set(options.services);
        //   }
        //
        //   protected broadcast(
        //     event: Core.ServiceEventType,
        //     device: { [key: string]: any },
        //     sockets: Set<net.Socket> = this._connections
        //   ) {
        //     for (const connection of sockets) {
        //       const data = TCP.F.deserialize({ event, date: new Date(), device });
        //       connection.write(data);
        //     }
        //   }
        //
        //   public async connect(): Promise<void> {
        //     this._server.on(Core.ConnectionEventType.Connection, socket => {
        //       this._connections.add(socket);
        //
        //       socket.on(Core.ConnectionEventType.End, () => this._connections.delete(socket));
        //
        //       socket.on(Core.ConnectionEventType.Data, (buffer: Buffer) => {
        //         const { deviceId, command, params } = JSON.parse(buffer.toString());
        //         if (!deviceId || !command) {
        //           console.error('No required params.');
        //         }
        //
        //         for (const service of this._services) {
        //           const device = service.devices.get(deviceId);
        //           if (!device) return;
        //           device.send(command, params);
        //         }
        //       });
        //
        //       for (const service of this._services) {
        //         service.devices.forEach(device =>
        //           this.broadcast(Core.ServiceEventType.DeviceAdded, device.toObject(), new Set([socket]))
        //         );
        //       }
        //     });
        //
        //     // Initialize listener and run services
        //     const promises = [];
        //     for (const service of this._services) {
        //       service.on(Core.ServiceEventType.Error, error => this.broadcast(Core.ServiceEventType.Error, error));
        //       service.on(Core.ServiceEventType.DeviceAdded, p => this.broadcast(Core.ServiceEventType.DeviceAdded, p));
        //       service.on(Core.ServiceEventType.DeviceChanged, p => this.broadcast(Core.ServiceEventType.DeviceChanged, p));
        //       service.on(Core.ServiceEventType.DeviceRemoved, p => this.broadcast(Core.ServiceEventType.DeviceRemoved, p));
        //
        //       promises.push(
        //         service.connect(),
        //         new Promise(resolve => service.once(Core.ServiceEventType.Connect, resolve)),
        //         console.log(`Service starting: [${service.constructor.name}]`)
        //       );
        //     }
        //     await Promise.all(promises);
        //     await new Promise(resolve => this._server.listen({ port: this._port, host: this._host }, resolve));
        //   }
        //
        //   public disconnect() {
        //     for (const service of this._services) {
        //       service.disconnect();
        //     }
        //
        //     this.broadcast(Core.ServiceEventType.Disconnect, this._connections);
        //   }
        // }
        class ServiceClient extends Core.Connection {
            constructor(options) {
                super(options);
                this._client = new net_1.default.Socket();
            }
            async connect() {
                await new Promise(resolve => this._client.connect({ port: this._port, host: this._host }, resolve));
                this._client.on(Core.ConnectionEventType.Error, this.emit.bind(this, Core.ServiceEventType.Error));
                this._client.on(Core.ConnectionEventType.Close, this.emit.bind(this, Core.ServiceEventType.Disconnect));
                this._client.on(Core.ConnectionEventType.Data, buffer => {
                    Core.F.parseBuffer(buffer).forEach(data => this.emit(Core.ServiceEventType.Data, data));
                });
            }
            disconnect() {
                this._client.destroy();
                this.removeAllListeners();
            }
            async send(deviceId, command, params) {
                const data = Core.F.stringify({ deviceId, command, params });
                await new Promise(resolve => this._client.write(data, resolve));
            }
        }
        TCP.ServiceClient = ServiceClient;
    })(TCP = Core.TCP || (Core.TCP = {}));
})(Core || (Core = {}));
exports.default = Core;
