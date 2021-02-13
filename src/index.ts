import { EventEmitter } from 'events';
import net from 'net';
import { serialize } from 'v8';
import * as util from 'util';

namespace Core {
  export interface IKeyValue {
    [key: string]: any;
  }

  export type Void = Promise<void> | void;

  export class F {
    private static Separator = '\r\n';

    public static stringify(data: { [key: string]: any }): string {
      try {
        return JSON.stringify(data) + '\r\n';
      } catch (e) {
        return '';
      }
    }

    public static parseBuffer(buffer: Buffer, defaultValue: Core.IKeyValue = {}): Core.IKeyValue[] {
      const lines = buffer.toString().split(Core.F.Separator);
      return lines.reduce((acc, line) => {
        if (line) {
          try {
            const data = JSON.parse(line);
            acc.push(data);
          } catch (e) {
            acc.push(defaultValue);
          }
        }
        return acc;
      }, <Core.IKeyValue[]>[]);
    }
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

  export enum ServiceEventType {
    Error = 'error',
    Connect = 'connect',
    Disconnect = 'disconnect',
    Data = 'data',
    DeviceAdded = 'device-added',
    DeviceChanged = 'device-changed',
    DeviceRemoved = 'device-removed',
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

    constructor(options: IConnectionOptions = {}) {
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

  export interface IDeviceState extends IKeyValue {}

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
  }

  export interface IDeviceInterface extends Core.IConnection {
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

    public get name() {
      return this._name;
    }

    public set name(name) {
      this._name = name;
    }

    public get model() {
      return this._model;
    }

    public set model(model) {
      this._model = model;
    }

    public get version() {
      return this._version;
    }

    public set version(version) {
      this._version = version;
    }

    public get state() {
      return this._state;
    }

    public set state(state) {
      this._state = state;
    }

    public get commands() {
      return this._commands;
    }

    public set commands(commands) {
      this._commands = commands;
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

    public toString() {
      return JSON.stringify(this.toObject());
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
      return new Promise(resolve =>
        this._client.connect({ port: this._port, host: this._host }, resolve)
      );
    }

    public disconnect(): void {
      super.disconnect();
      this._client.destroy();
    }

    public send(command: string, params?: any): Promise<Core.IDataResponse> {
      return super.send(command, params);
    }
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

    protected readonly _devices: Map<string, Core.Device> = new Map();

    protected _timeouts: NodeJS.Timeout[] = [];

    constructor(options?: Core.IServiceOptions) {
      super(options);
    }

    public get devices() {
      return this._devices;
    }

    protected async scan(): Promise<void> {
      throw new Error(`No "scan" implementation for service: [port: ${this._port}]`);
    }

    public async send(...args: any[]) {
      throw new Error(`No "send" implementation for service: [port: ${this._port}]`);
    }

    public async connect(): Promise<void> {
      this.on(Core.ServiceEventType.Connect, async () => {
        await this.scan();
        const timeoutId = setInterval(this.scan.bind(this), Service.ScanInterval);
        this._timeouts.push(timeoutId);
      });
    }

    public disconnect() {
      this._devices.forEach(device => device.disconnect());
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
      this.removeAllListeners();
      this.emit(ServiceEventType.Disconnect);
    }
  }

  export namespace TCP {
    export class PayloadError extends Error {
      toString() {
        return JSON.stringify({ name: this.name, message: this.message, stack: this.stack });
      }
    }

    export interface IServiceManagerOptions extends Core.IConnectionOptions {
      port: number;
      services: Core.Service[];
    }

    export class ServiceManager extends Core.Connection {
      protected _services: Map<string, Core.Service> = new Map<string, Core.Service>();
      protected _client: net.Socket = new net.Socket();

      constructor(options: Core.TCP.IServiceManagerOptions) {
        super(options);

        options.services.forEach(service => {
          this._services.set(service.constructor.name, service);
        });
      }

      protected publish(event: Core.ServiceEventType, payload?: Core.IKeyValue | PayloadError) {
        const data = Core.F.stringify({ event, date: new Date(), payload });
        this._client.write(data);
      }

      public async connect(): Promise<void> {
        this._client.connect({ port: this._port, host: this._host });
        this._client.on(Core.ConnectionEventType.Data, buffer => {
          const data = Core.F.parseBuffer(buffer);
          data.forEach(item => {
            const { service, deviceId, command, params } = item;

            const serviceInstance = this._services.get(service);
            if (!serviceInstance) {
              return this.publish(
                Core.ServiceEventType.Error,
                new PayloadError(`No service attached: [service="${service}"]`)
              );
            }

            const device = service.devices.get(deviceId);
            if (!device) {
              return this.publish(
                Core.ServiceEventType.Error,
                new PayloadError(`No device connected: [deviceId="${deviceId}"]`)
              );
            }

            if (!command) {
              return this.publish(
                Core.ServiceEventType.Error,
                new PayloadError(`No command provided: [command=""]`)
              );
            }

            device.send(command, params);
          });
        });

        this._services.forEach(service => {
          service.devices.forEach(device => {
            this.publish(Core.ServiceEventType.DeviceAdded, device.toObject());
          });
        });

        const promises: any[] = [];
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

          promises.push(
            service.connect(),
            new Promise(resolve => service.once(Core.ServiceEventType.Connect, resolve))
          );
        });

        await Promise.all(promises);
        await new Promise(resolve => this._client.once(Core.ConnectionEventType.Connect, resolve));
      }

      public disconnect() {
        this._services.forEach(service => {
          service.disconnect();
        });

        this.publish(Core.ServiceEventType.Disconnect);
      }
    }
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
  }
}

export default Core;
