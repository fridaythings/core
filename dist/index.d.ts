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
    disconnect(): void;
    send(...args: any[]): Promise<any>;
  }
  enum ConnectionEventType {
    Connection = 'connection',
    Connect = 'connect',
    Close = 'close',
    Data = 'data',
    Drain = 'drain',
    End = 'end',
    Error = 'error',
    Lookup = 'lookup',
    Ready = 'ready',
    Timeout = 'timeout',
  }
  enum DeviceEventType {
    Connect = 'connect',
    Disconnect = 'close',
    Error = 'error',
    Change = 'change',
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
  interface IDeviceState {
    [key: string]: any;
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
    eventId: number;
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
    get model(): string;
    get name(): string;
    get version(): string;
    get commands(): string[];
    get state(): IDeviceState;
    send(command: string, params?: any): Promise<IDataResponse>;
    connect(): Promise<void>;
    disconnect(): void;
    toObject(): {
      eventId: number;
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
  }
  interface IServiceOptions {
    port?: number;
    host?: string;
  }
  enum ServiceEventType {
    Error = 'error',
    Connect = 'connect',
    Disconnect = 'disconnect',
    Data = 'data',
    DeviceAdded = 'device-added',
    DeviceChanged = 'device-changed',
    DeviceRemoved = 'device-removed',
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
    class F {
      private static Separator;
      static deserialize(data: { [key: string]: any }): string;
      static serialize(buffer: Buffer): any[];
    }
    interface IServiceManagerOptions extends Core.IConnectionOptions {
      port: number;
      services: Core.Service[];
    }
    class ServiceManager extends Core.Connection {
      protected _services: Set<Core.Service>;
      protected _server: net.Server;
      protected _connections: Set<net.Socket>;
      constructor(options: Core.TCP.IServiceManagerOptions);
      protected broadcast(
        event: Core.ServiceEventType,
        device: {
          [key: string]: any;
        },
        sockets?: Set<net.Socket>
      ): void;
      connect(): Promise<void>;
      disconnect(): void;
    }
    class ServiceClient extends Core.Connection {
      private _client;
      constructor(options: Core.IConnectionOptions);
      connect(): Promise<void>;
      disconnect(): void;
      send(deviceId: string, command: string, params?: any): Promise<any>;
    }
  }
}
export default Core;
