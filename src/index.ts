import { EventEmitter } from 'events';
import net from 'net';
import { serialize } from 'v8';

namespace Core {
  export interface IConnectionOptions {
    host?: string;
    port?: number;
  }

  export interface IConnection extends EventEmitter {
    host: string;
    port: number;
    connect(): Promise<void>;
    send(...args: any[]): Promise<any>;
    send(buffer: Buffer): Promise<any>;
    disconnect(): void;
  }

  export enum ConnectionEventType {
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

  export enum DeviceEventType {
    Connect = 'connect',
    Disconnect = 'close',
    Error = 'error',
    Change = 'change',
  }

  export class Connection extends EventEmitter implements IConnection {
    protected _host: string = '';
    protected _port: number = 0;

    constructor(options: IConnectionOptions) {
      super();
      if (options.host !== undefined) {
        this._host = options.host;
      }
      if (options.port !== undefined) {
        this._port = options.port;
      }
    }

    public get host() {
      return this._host;
    }

    public get port() {
      return this._port;
    }

    public async connect(): Promise<void> {
      throw new Error('connect: No implementation');
    }

    public disconnect() {
      throw new Error('disconnect: No implementation');
    }

    public async send(...args: any[]): Promise<any> {
      throw new Error('connect: No implementation');
    }
  }

  export interface IDataResponse {
    id: number;
    result: any;
  }

  export interface IDeviceState {
    [key: string]: any;
  }

  export interface IDeviceOptions extends Core.IConnectionOptions {
    host: string;
    port: number;
    id: string;
    model: string;
    name: string;
    version: string;
    commands?: string[];
    state?: Core.IDeviceState;
  }

  export interface IDeviceObject extends Core.IDeviceOptions {
    commands: string[];
    state: Core.IDeviceState;
    eventId: number;
  }

  export interface IDeviceInterface extends Core.IConnection {
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

  export class Device extends Core.Connection implements IDeviceInterface {
    protected static RequestTimeout = 5000;

    protected _requestId: number = 0;
    protected _eventId: number = 0;

    protected _id: string;
    protected _model: string;
    protected _name: string;
    protected _version: string;
    protected _state: IDeviceState = {};
    protected _commands: string[] = [];

    constructor(options: IDeviceOptions) {
      super(options);

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

    protected onTimeout(id: number, callback: (error: Error) => void) {
      const timeoutId = setTimeout(() => {
        callback(new Error(`Request timeout: ${id}`));
        clearTimeout(timeoutId);
      }, Device.RequestTimeout);
    }

    public emit(event: string | symbol, ...args: any[]): boolean {
      this._eventId++;
      return super.emit(event, ...args);
    }

    public get id() {
      return this._id;
    }

    public get model() {
      return this._model;
    }

    public get name() {
      return this._name;
    }

    public get version() {
      return this._version;
    }

    public get commands() {
      return this._commands;
    }

    public get state() {
      return this._state;
    }

    public async send(command: string, params?: any): Promise<IDataResponse> {
      this._requestId++;
      return Promise.resolve({ id: this._requestId, result: {} });
    }

    public connect(): Promise<void> {
      throw new Error(`No "connect" implementation for device: [id: ${this.id}]`);
    }

    public disconnect() {
      this.removeAllListeners();
    }

    public toObject() {
      return {
        eventId: this._eventId,
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

    public toString() {
      return JSON.stringify(this.toObject());
    }
  }

  export namespace TCP {
    export class F {
      private static Separator = '\r\n';

      public static deserialize(data: { [key: string]: any }): string {
        try {
          return JSON.stringify(data) + '\r\n';
        } catch (e) {
          console.error('TCP.F.deserialize:', data, e);
          return '';
        }
      }

      public static serialize(buffer: Buffer): any[] {
        const lines = buffer.toString().split(Core.TCP.F.Separator);
        return lines.reduce((acc, line) => {
          if (line) {
            try {
              const data = JSON.parse(line);
              acc.push(data);
            } catch (e) {
              console.error('TCP.F.serialize:', line, e);
            }
          }
          return acc;
        }, <any[]>[]);
      }
    }
  }

  export class TCPDevice extends Core.Device {
    protected _client: net.Socket = new net.Socket();

    constructor(options: IDeviceOptions) {
      super(options);

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

    public async connect(): Promise<void> {
      return new Promise(resolve => this._client.connect({ port: this._port, host: this._host }, resolve));
    }

    public disconnect(): void {
      super.disconnect();
      this._client.destroy();
    }

    public send(command: string, params?: any): Promise<Core.IDataResponse> {
      return super.send(command, params);
    }
  }

  export interface IService extends EventEmitter {
    readonly devices: Map<string, Core.Device>;
    scan(): Promise<void>;
    start(): Promise<void>;
    stop(): void;
  }

  export interface IServiceOptions {
    port?: number;
  }

  export enum ServiceEventType {
    Error = 'Error',
    Start = 'start',
    Stop = 'stop',
    DeviceAdded = 'device-added',
    DeviceChanged = 'device-changed',
    DeviceRemoved = 'device-removed',
  }

  export class Service extends EventEmitter implements Core.IService {
    protected static readonly ScanInterval = 5000;

    protected readonly _options: Core.IServiceOptions;
    protected readonly _devices: Map<string, Core.Device> = new Map();

    protected _timeouts: NodeJS.Timeout[] = [];

    constructor(options?: IServiceOptions) {
      super();
      this._options = options ?? {};
    }

    public async scan(): Promise<void> {
      throw new Error(`No "scan" implementation for service: [port: ${this._options.port}]`);
    }

    public get devices() {
      return this._devices;
    }

    public async start(): Promise<void> {
      this.on(ServiceEventType.Start, async () => {
        await this.scan();
        const timeoutId = setInterval(this.scan.bind(this), Service.ScanInterval);
        this._timeouts.push(timeoutId);
      });
    }

    public stop() {
      this._devices.forEach(device => device.disconnect());
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
      this.removeAllListeners();
      this.emit(ServiceEventType.Stop);
    }
  }
}

export default Core;
