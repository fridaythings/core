/// <reference types="node" />
import { EventEmitter } from 'events';
import net from 'net';
declare namespace Core {
    interface IKeyValue {
        [key: string]: any;
    }
    type Void = Promise<void> | void;
    class F {
        private static Separator;
        static stringify(data: {
            [key: string]: any;
        }): string;
        static parseBuffer(buffer: Buffer, defaultValue?: Core.IKeyValue): Core.IKeyValue[];
    }
    interface IConnectionOptions {
        host?: string;
        port?: number;
    }
    interface IConnection extends EventEmitter {
        host: string;
        port: number;
        connect(): Promise<void>;
        disconnect(): void;
        send(...args: any[]): Promise<any>;
    }
    enum ConnectionEventType {
        Connection = "connection",
        Connect = "connect",
        Close = "close",
        Data = "data",
        Drain = "drain",
        End = "end",
        Error = "error",
        Lookup = "lookup",
        Ready = "ready",
        Timeout = "timeout"
    }
    enum ServiceEventType {
        Error = "error",
        Connect = "connect",
        Disconnect = "disconnect",
        Data = "data",
        DeviceAdded = "device-added",
        DeviceChanged = "device-changed",
        DeviceRemoved = "device-removed"
    }
    enum DeviceEventType {
        Connect = "connect",
        Disconnect = "close",
        Error = "error",
        Change = "change"
    }
    class Connection extends EventEmitter implements IConnection {
        protected _host: string;
        protected _port: number;
        constructor(options?: IConnectionOptions);
        get host(): string;
        get port(): number;
        connect(): Promise<void>;
        disconnect(): void;
        send(...args: any[]): Promise<any>;
    }
    interface IDataResponse {
        id: number;
        result: any;
    }
    interface IDeviceState extends IKeyValue {
    }
    interface IDeviceOptions extends Core.IConnectionOptions {
        host: string;
        port: number;
        id: string;
        model: string;
        name: string;
        version: string;
        commands?: string[];
        state?: Core.IDeviceState;
    }
    interface IDeviceObject extends Core.IDeviceOptions {
        commands: string[];
        state: Core.IDeviceState;
    }
    interface IDeviceInterface extends Core.IConnection {
        readonly id: string;
        model: string;
        name: string;
        version: string;
        state: IDeviceState;
        commands: string[];
        send(...args: any[]): Promise<Core.IDataResponse>;
        send(command: string, params: any): Promise<Core.IDataResponse>;
        toObject(): Core.IDeviceObject;
        toString(): string;
    }
    class Device extends Core.Connection implements IDeviceInterface {
        protected static RequestTimeout: number;
        protected _requestId: number;
        protected _eventId: number;
        protected _id: string;
        protected _model: string;
        protected _name: string;
        protected _version: string;
        protected _state: IDeviceState;
        protected _commands: string[];
        constructor(options: IDeviceOptions);
        protected onTimeout(id: number, callback: (error: Error) => void): void;
        emit(event: string | symbol, ...args: any[]): boolean;
        get id(): string;
        get name(): string;
        set name(name: string);
        get model(): string;
        set model(model: string);
        get version(): string;
        set version(version: string);
        get state(): IDeviceState;
        set state(state: IDeviceState);
        get commands(): string[];
        set commands(commands: string[]);
        send(command: string, params?: any): Promise<IDataResponse>;
        connect(): Promise<void>;
        disconnect(): void;
        toObject(): {
            id: string;
            host: string;
            port: number;
            model: string;
            name: string;
            version: string;
            commands: string[];
            state: IDeviceState;
        };
        toString(): string;
    }
    class TCPDevice extends Core.Device {
        protected _client: net.Socket;
        constructor(options: IDeviceOptions);
        connect(): Promise<void>;
        disconnect(): void;
        send(command: string, params?: any): Promise<Core.IDataResponse>;
    }
    interface IService extends Core.IConnection {
        readonly devices: Map<string, Core.Device>;
        on(event: Core.ServiceEventType.Connect, listener: () => Core.Void): this;
        on(event: Core.ServiceEventType.Disconnect, listener: () => Core.Void): this;
        on(event: Core.ServiceEventType.Error, listener: (error: Error) => Core.Void): this;
        on(event: Core.ServiceEventType.DeviceAdded, listener: (data: Core.IKeyValue) => Void): this;
        on(event: Core.ServiceEventType.DeviceChanged, listener: (data: Core.IKeyValue) => Void): this;
        on(event: Core.ServiceEventType.DeviceRemoved, listener: (data: Core.IKeyValue) => Void): this;
    }
    interface IServiceOptions {
        port?: number;
        host?: string;
    }
    class Service extends Core.Connection implements Core.IService {
        protected static readonly ScanInterval = 5000;
        protected readonly _devices: Map<string, Core.Device>;
        protected _timeouts: NodeJS.Timeout[];
        constructor(options?: Core.IServiceOptions);
        get devices(): Map<string, Device>;
        protected scan(): Promise<void>;
        send(...args: any[]): Promise<void>;
        connect(): Promise<void>;
        disconnect(): void;
    }
    namespace TCP {
        class PayloadError extends Error {
            toString(): string;
        }
        interface IServiceManagerOptions extends Core.IConnectionOptions {
            port: number;
            services: Core.Service[];
        }
        class ServiceManager extends Core.Connection {
            protected _services: Map<string, Core.Service>;
            protected _client: net.Socket;
            constructor(options: Core.TCP.IServiceManagerOptions);
            protected publish(event: Core.ServiceEventType, payload?: Core.IKeyValue | PayloadError): void;
            connect(): Promise<void>;
            disconnect(): void;
        }
    }
}
export default Core;
