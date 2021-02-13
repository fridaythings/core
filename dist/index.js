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
        get name() {
            return this._name;
        }
        set name(name) {
            this._name = name;
        }
        get model() {
            return this._model;
        }
        set model(model) {
            this._model = model;
        }
        get version() {
            return this._version;
        }
        set version(version) {
            this._version = version;
        }
        get state() {
            return this._state;
        }
        set state(state) {
            this._state = state;
        }
        get commands() {
            return this._commands;
        }
        set commands(commands) {
            this._commands = commands;
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
                id: this._id,
                host: this._host,
                port: this._port,
                model: this._model,
                name: this._name,
                version: this._version,
                commands: this._commands,
                state: this._state,
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
            this.on(Core.ServiceEventType.Connect, async () => {
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
        class PayloadError extends Error {
            toJSON() {
                return {
                    name: PayloadError.constructor.name,
                    message: this.message,
                    stack: this.stack,
                };
            }
        }
        TCP.PayloadError = PayloadError;
        class ServiceManager extends Core.Connection {
            constructor(options) {
                super(options);
                this._services = new Map();
                this._client = new net_1.default.Socket();
                options.services.forEach(service => {
                    this._services.set(service.constructor.name, service);
                });
            }
            publish(event, payload) {
                const data = Core.F.stringify({ event, date: new Date(), payload });
                this._client.write(data);
            }
            async connect() {
                this._client.connect({ port: this._port, host: this._host });
                this._client.on(Core.ConnectionEventType.Data, buffer => {
                    const data = Core.F.parseBuffer(buffer);
                    data.forEach(item => {
                        const { service, deviceId, command, params } = item;
                        const serviceInstance = this._services.get(service);
                        if (!serviceInstance) {
                            return this.publish(Core.ServiceEventType.Error, new PayloadError(`No service attached: [service="${service}"]`));
                        }
                        const device = service.devices.get(deviceId);
                        if (!device) {
                            return this.publish(Core.ServiceEventType.Error, new PayloadError(`No device connected: [deviceId="${deviceId}"]`));
                        }
                        if (!command) {
                            return this.publish(Core.ServiceEventType.Error, new PayloadError(`No command provided: [command=""]`));
                        }
                        device.send(command, params);
                    });
                });
                this._services.forEach(service => {
                    service.devices.forEach(device => {
                        this.publish(Core.ServiceEventType.DeviceAdded, device.toObject());
                    });
                });
                const promises = [];
                this._services.forEach(service => {
                    service.on(Core.ServiceEventType.Error, error => {
                        this.publish(Core.ServiceEventType.Error, error);
                    });
                    service.on(Core.ServiceEventType.DeviceAdded, data => {
                        this.publish(Core.ServiceEventType.DeviceAdded, data);
                    });
                    service.on(Core.ServiceEventType.DeviceChanged, data => {
                        this.publish(Core.ServiceEventType.DeviceChanged, data);
                    });
                    service.on(Core.ServiceEventType.DeviceRemoved, data => {
                        this.publish(Core.ServiceEventType.DeviceRemoved, data);
                    });
                    promises.push(service.connect(), new Promise(resolve => service.once(Core.ServiceEventType.Connect, resolve)));
                });
                await Promise.all(promises);
                await new Promise(resolve => this._client.once(Core.ConnectionEventType.Connect, resolve));
            }
            disconnect() {
                this._services.forEach(service => {
                    service.disconnect();
                });
                this.publish(Core.ServiceEventType.Disconnect);
            }
        }
        TCP.ServiceManager = ServiceManager;
        //
        // export class ServiceClient extends Core.Connection {
        //   private _client: net.Socket = new net.Socket();
        //
        //   constructor(options: Core.IConnectionOptions) {
        //     super(options);
        //   }
        //
        //   async connect(): Promise<void> {
        //     await new Promise(resolve =>
        //       this._client.connect({ port: this._port, host: this._host }, resolve)
        //     );
        //
        //     this._client.on(
        //       Core.ConnectionEventType.Error,
        //       this.emit.bind(this, Core.ServiceEventType.Error)
        //     );
        //     this._client.on(
        //       Core.ConnectionEventType.Close,
        //       this.emit.bind(this, Core.ServiceEventType.Disconnect)
        //     );
        //     this._client.on(Core.ConnectionEventType.Data, buffer => {
        //       Core.F.parseBuffer(buffer).forEach(data => this.emit(Core.ServiceEventType.Data, data));
        //     });
        //   }
        //
        //   disconnect() {
        //     this._client.destroy();
        //     this.removeAllListeners();
        //   }
        //
        //   async send(deviceId: string, command: string, params?: any): Promise<void> {
        //     const data = Core.F.stringify({ deviceId, command, params });
        //     await new Promise(resolve => this._client.write(data, resolve));
        //   }
        // }
    })(TCP = Core.TCP || (Core.TCP = {}));
})(Core || (Core = {}));
exports.default = Core;
