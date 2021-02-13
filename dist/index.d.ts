/// <reference types="node" />
import { EventEmitter } from 'events';
import net from 'net';
declare namespace Core {
    export interface IKeyValue {
        [key: string]: any;
    }
    export type Void = Promise<void> | void;
    export class F {
        private static Separator;
        static stringify(data: {
            [key: string]: any;
        }): string;
        static parseBuffer(buffer: Buffer, defaultValue?: Core.IKeyValue): Core.IKeyValue[];
    }
    export interface IConnectionOptions {
        host?: string;
        port?: number;
    }
    export interface IConnection extends EventEmitter {
        host: string;
        port: number;
        connect(): Promise<void>;
        disconnect(): void;
        send(...args: any[]): Promise<any>;
    }
    export enum ConnectionEventType {
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
    export enum ServiceEventType {
        Error = "error",
        Connect = "connect",
        Disconnect = "disconnect",
        Data = "data",
        DeviceAdded = "device-added",
        DeviceChanged = "device-changed",
        DeviceRemoved = "device-removed"
    }
    export enum DeviceEventType {
        Connect = "connect",
        Disconnect = "close",
        Error = "error",
        Change = "change"
    }
    export class Connection extends EventEmitter implements IConnection {
        protected _host: string;
        protected _port: number;
        constructor(options?: IConnectionOptions);
        get host(): string;
        get port(): number;
        connect(): Promise<void>;
        disconnect(): void;
        send(...args: any[]): Promise<any>;
    }
    export interface IDataResponse {
        id: number;
        result: any;
    }
    export interface IDeviceState extends IKeyValue {
    }
    export interface IDeviceOptions extends Core.IConnectionOptions {
        host: string;
        port: number;
        id: string;
        type: ServiceType;
        model: string;
        name: string;
        version: string;
        commands?: string[];
        state?: Core.IDeviceState;
    }
    enum ServiceTypeEnum {
        Unknown = "UnknownService"
    }
    export type ServiceType = ServiceTypeEnum | string;
    export interface IDeviceObject extends Core.IDeviceOptions {
        commands: string[];
        state: Core.IDeviceState;
    }
    export interface IDeviceInterface extends Core.IConnection {
        readonly id: string;
        model: string;
        name: string;
        version: string;
        state: IDeviceState;
        commands: string[];
        type: ServiceType;
        send(...args: any[]): Promise<Core.IDataResponse>;
        send(command: string, params: any): Promise<Core.IDataResponse>;
        toObject(): Core.IDeviceObject;
        toString(): string;
    }
    export class Device extends Core.Connection implements IDeviceInterface {
        protected static RequestTimeout: number;
        protected _requestId: number;
        protected _eventId: number;
        protected _id: string;
        protected _type: Core.ServiceType;
        protected _model: string;
        protected _name: string;
        protected _version: string;
        protected _state: IDeviceState;
        protected _commands: string[];
        constructor(options: IDeviceOptions);
        protected onTimeout(id: number, callback: (error: Error) => void): void;
        emit(event: string | symbol, ...args: any[]): boolean;
        get id(): string;
        get type(): string;
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
            type: string;
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
    export class TCPDevice extends Core.Device {
        protected _client: net.Socket;
        constructor(options: IDeviceOptions);
        connect(): Promise<void>;
        disconnect(): void;
        send(command: string, params?: any): Promise<Core.IDataResponse>;
    }
    export interface IService extends Core.IConnection {
        readonly devices: Map<string, Core.Device>;
        on(event: Core.ServiceEventType.Connect, listener: () => Core.Void): this;
        on(event: Core.ServiceEventType.Disconnect, listener: () => Core.Void): this;
        on(event: Core.ServiceEventType.Error, listener: (error: Error) => Core.Void): this;
        on(event: Core.ServiceEventType.DeviceAdded, listener: (data: Core.IKeyValue) => Void): this;
        on(event: Core.ServiceEventType.DeviceChanged, listener: (data: Core.IKeyValue) => Void): this;
        on(event: Core.ServiceEventType.DeviceRemoved, listener: (data: Core.IKeyValue) => Void): this;
    }
    export interface IServiceOptions {
        port?: number;
        host?: string;
    }
    export class Service extends Core.Connection implements Core.IService {
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
    export namespace TCP {
        class PayloadError extends Error {
            toJSON(): {
                name: string;
                message: string;
                stack: string | undefined;
            };
        }
        interface IServiceManagerOptions extends Core.IConnectionOptions {
            port: number;
            services: Core.Service[];
        }
        class ServiceManager extends Core.Connection {
            protected _services: Map<string, Core.Service>;
            protected _client: net.Socket;
            constructor(options: Core.TCP.IServiceManagerOptions);
            protected publish(event: Core.ServiceEventType, payload?: Core.IKeyValue | PayloadError[]): void;
            connect(): Promise<void>;
            disconnect(): void;
        }
    }
    export {};
}
export default Core;
