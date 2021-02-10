/// <reference types="node" />
import { EventEmitter } from 'events';
import net from 'net';
declare namespace Core {
    interface IConnectionOptions {
        host?: string;
        port?: number;
    }
    interface IConnection extends EventEmitter {
        host: string;
        port: number;
        connect(): Promise<void>;
        send(...args: any[]): Promise<any>;
        send(buffer: Buffer): Promise<any>;
        disconnect(): void;
    }
    enum ConnectionEventType {
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
    enum DeviceEventType {
        Connect = "connect",
        Disconnect = "close",
        Error = "error",
        Change = "change"
    }
    class Connection extends EventEmitter implements IConnection {
        protected _host: string;
        protected _port: number;
        constructor(options: IConnectionOptions);
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
    interface IDeviceState {
        power?: boolean;
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
        readonly model: string;
        readonly name: string;
        readonly version: string;
        readonly commands: string[];
        send(...args: any[]): Promise<Core.IDataResponse>;
        send(command: string, params: any): Promise<Core.IDataResponse>;
        toObject(): Core.IDeviceObject;
        toString(): string;
    }
    class Device extends Core.Connection implements IDeviceInterface {
        protected static RequestTimeout: number;
        protected _requestId: number;
        protected _id: string;
        protected _model: string;
        protected _name: string;
        protected _version: string;
        protected _state: IDeviceState;
        protected _commands: string[];
        constructor(options: IDeviceOptions);
        protected onTimeout(id: number, callback: (error: Error) => void): void;
        get id(): string;
        get model(): string;
        get name(): string;
        get version(): string;
        get commands(): string[];
        get state(): IDeviceState;
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
}
export default Core;