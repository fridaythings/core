"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const net_1 = __importDefault(require("net"));
const fs_1 = __importDefault(require("fs"));
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
    class SerialPort {
        static findZigbee() {
            const defaultDevices = ['ttyACM0', 'tty.usb'];
            const ttyModem = fs_1.default
                .readdirSync('/dev')
                .find(fileName => defaultDevices.some(path => fileName.startsWith(path)));
            return ttyModem ? `/dev/${ttyModem}` : undefined;
        }
    }
    Core.SerialPort = SerialPort;
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
        ServiceEventType["PermitJoin"] = "permit_join";
        ServiceEventType["DeviceAdded"] = "device_added";
        ServiceEventType["DeviceChanged"] = "device_changed";
        ServiceEventType["DeviceRemoved"] = "device_removed";
    })(ServiceEventType = Core.ServiceEventType || (Core.ServiceEventType = {}));
    let DeviceEventType;
    (function (DeviceEventType) {
        DeviceEventType["Connect"] = "connect";
        DeviceEventType["Disconnect"] = "close";
        DeviceEventType["Error"] = "error";
        DeviceEventType["Change"] = "change";
    })(DeviceEventType = Core.DeviceEventType || (Core.DeviceEventType = {}));
    let ServiceCommand;
    (function (ServiceCommand) {
        ServiceCommand["PermitJoin"] = "permitJoin";
    })(ServiceCommand = Core.ServiceCommand || (Core.ServiceCommand = {}));
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
        connect() {
            return __awaiter(this, void 0, void 0, function* () {
                throw new Error('connect: No implementation');
            });
        }
        disconnect() {
            throw new Error('disconnect: No implementation');
        }
        send(...args) {
            return __awaiter(this, void 0, void 0, function* () {
                throw new Error('connect: No implementation');
            });
        }
    }
    Core.Connection = Connection;
    let ServiceTypeEnum;
    (function (ServiceTypeEnum) {
        ServiceTypeEnum["Unknown"] = "UnknownService";
    })(ServiceTypeEnum || (ServiceTypeEnum = {}));
    class Device extends Core.Connection {
        constructor(options) {
            super(options);
            this._requestId = 0;
            this._eventId = 0;
            this._type = ServiceTypeEnum.Unknown;
            this._state = {};
            this._commands = [];
            this._id = options.id;
            this._model = options.model;
            this._name = options.name;
            this._version = options.version;
            this._type = options.type;
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
        get type() {
            return this._type;
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
        send(command, params) {
            return __awaiter(this, void 0, void 0, function* () {
                this._requestId++;
                return Promise.resolve({ id: this._requestId, result: {} });
            });
        }
        connect() {
            throw new Error(`No "connect" implementation for device: [id: ${this.id}]`);
        }
        disconnect() {
            this.removeAllListeners();
            return this;
        }
        toObject() {
            return {
                id: this._id,
                type: this._type,
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
        connect() {
            return __awaiter(this, void 0, void 0, function* () {
                yield new Promise(resolve => this._client.connect({ port: this._port, host: this._host }, resolve));
                return this;
            });
        }
        disconnect() {
            this._client.destroy();
            return super.disconnect();
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
        scan() {
            return __awaiter(this, void 0, void 0, function* () {
                throw new Error(`No "scan" implementation for service: [port: ${this._port}]`);
            });
        }
        send(...args) {
            return __awaiter(this, void 0, void 0, function* () {
                throw new Error(`No "send" implementation for service: [port: ${this._port}]`);
            });
        }
        connect() {
            return __awaiter(this, void 0, void 0, function* () {
                this.once(Core.ServiceEventType.Disconnect, () => {
                    const intervalId = setInterval(() => this.connect(), Core.Service.ScanInterval);
                    this.once(Core.ServiceEventType.Connect, () => clearInterval(intervalId));
                });
                return this;
            });
        }
        disconnect() {
            this._devices.forEach(device => device.disconnect());
            this._devices.clear();
            this._timeouts.forEach(clearTimeout);
            this._timeouts = [];
            this.removeAllListeners();
            this.emit(ServiceEventType.Disconnect);
            return this;
        }
    }
    Service.ScanInterval = 5000;
    Core.Service = Service;
    let TCP;
    (function (TCP) {
        class PayloadError extends Error {
            constructor(messageOrError) {
                super(messageOrError instanceof Error ? messageOrError.message : messageOrError);
                if (messageOrError instanceof Error) {
                    this.stack = messageOrError.stack;
                }
            }
            toJSON() {
                return {
                    name: 'PayloadError',
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
                if (!this._client.writable)
                    return;
                const data = Core.F.stringify({ event, date: new Date(), payload });
                this._client.write(data);
            }
            connect() {
                return __awaiter(this, void 0, void 0, function* () {
                    this._client.connect({ port: this._port, host: this._host });
                    this._client.on(Core.ConnectionEventType.Error, (error) => {
                        this.emit(Core.ServiceEventType.Error, error);
                        this.publish(Core.ServiceEventType.Error, { errors: new Core.TCP.PayloadError(error) });
                        this._client.removeAllListeners();
                        this._services.forEach(service => service.disconnect());
                    });
                    this._client.on(Core.ConnectionEventType.End, () => {
                        this._client.removeAllListeners();
                        this._services.forEach(service => service.disconnect());
                        this.emit(Core.ServiceEventType.Disconnect);
                        this.publish(Core.ServiceEventType.Disconnect);
                    });
                    this._client.on(Core.ConnectionEventType.Data, buffer => {
                        const data = Core.F.parseBuffer(buffer);
                        data.forEach(item => {
                            const { service: serviceName, deviceId, command, params } = item;
                            const errors = [];
                            const service = this._services.get(serviceName);
                            if (!service) {
                                errors.push(new PayloadError(`No service attached: [service="${serviceName}"]`));
                            }
                            if (!command) {
                                errors.push(new PayloadError(`No command provided: [command=""]`));
                            }
                            const device = service === null || service === void 0 ? void 0 : service.devices.get(deviceId);
                            if (deviceId && !device) {
                                errors.push(new PayloadError(`No device connected: [deviceId="${deviceId}"]`));
                            }
                            if (errors.length > 0) {
                                return this.publish(Core.ServiceEventType.Error, { errors });
                            }
                            if (!service)
                                return;
                            return device ? device.send(command, params) : service.send(command, params);
                        });
                    });
                    const promises = [];
                    this._services.forEach(service => {
                        service.devices.forEach(device => {
                            this.publish(Core.ServiceEventType.DeviceAdded, { device: device.toObject() });
                        });
                        service.on(Core.ServiceEventType.Disconnect, error => {
                            this.publish(Core.ServiceEventType.Disconnect, {
                                service: { type: service.constructor.name, error },
                            });
                        });
                        service.on(Core.ServiceEventType.Error, error => {
                            this.publish(Core.ServiceEventType.Error, { errors: [new PayloadError(error)] });
                        });
                        service.on(Core.ServiceEventType.PermitJoin, data => {
                            this.publish(Core.ServiceEventType.PermitJoin, {
                                service: Object.assign({ type: service.constructor.name }, data),
                            });
                        });
                        service.on(Core.ServiceEventType.DeviceAdded, device => {
                            this.publish(Core.ServiceEventType.DeviceAdded, { device });
                        });
                        service.on(Core.ServiceEventType.DeviceChanged, device => {
                            this.publish(Core.ServiceEventType.DeviceChanged, { device });
                        });
                        service.on(Core.ServiceEventType.DeviceRemoved, device => {
                            this.publish(Core.ServiceEventType.DeviceRemoved, { device });
                        });
                        promises.push(service.connect());
                    });
                    yield Promise.all(promises);
                    yield new Promise(resolve => this._client.once(Core.ConnectionEventType.Connect, resolve));
                    return this;
                });
            }
            disconnect() {
                this._client.removeAllListeners();
                this._services.forEach(service => service.disconnect());
                this.publish(Core.ServiceEventType.Disconnect);
                return this;
            }
            get devices() {
                const devices = [];
                this._services.forEach(service => service.devices.forEach(device => devices.push(device)));
                return devices;
            }
        }
        TCP.ServiceManager = ServiceManager;
    })(TCP = Core.TCP || (Core.TCP = {}));
})(Core || (Core = {}));
exports.default = Core;
