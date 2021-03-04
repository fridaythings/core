import { EventEmitter } from 'events';
import net from 'net';
import fs from 'fs';

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

  export class SerialPort {
    static findZigbee(): string | undefined {
      const defaultDevices = ['ttyACM0', 'tty.usb'];
      const ttyModem = fs
        .readdirSync('/dev')
        .find(fileName => defaultDevices.some(path => fileName.startsWith(path)));
      return ttyModem ? `/dev/${ttyModem}` : undefined;
    }
  }

  export interface IConnectionOptions {
    host?: string;
    port?: number;
  }

  export interface IConnection extends EventEmitter {
    host: string;
    port: number;
    connect(): Promise<this>;
    disconnect(): this;
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
    PermitJoin = 'permit_join',
    DeviceAdded = 'device_added',
    DeviceChanged = 'device_changed',
    DeviceRemoved = 'device_removed',
  }

  export enum DeviceEventType {
    Connect = 'connect',
    Disconnect = 'close',
    Error = 'error',
    Change = 'change',
  }

  export enum ServiceCommand {
    PermitJoin = 'permitJoin',
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

    public async connect(): Promise<this> {
      throw new Error('connect: No implementation');
    }

    public disconnect(): this {
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
    type: ServiceType;
    model: string;
    name: string;
    version: string;
    commands?: string[];
    state?: Core.IDeviceState;
  }

  enum ServiceTypeEnum {
    Unknown = 'UnknownService',
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
    protected static RequestTimeout = 5000;

    protected _requestId: number = 0;
    protected _eventId: number = 0;

    protected _id: string;
    protected _type: Core.ServiceType = ServiceTypeEnum.Unknown;
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
      this._type = options.type;

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

    public get type() {
      return this._type;
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

    public connect(): Promise<this> {
      throw new Error(`No "connect" implementation for device: [id: ${this.id}]`);
    }

    public disconnect(): this {
      this.removeAllListeners();
      return this;
    }

    public toObject() {
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

    public async connect(): Promise<this> {
      await new Promise(resolve =>
        this._client.connect({ port: this._port, host: this._host }, resolve)
      );
      return this;
    }

    public disconnect(): this {
      this._client.destroy();
      return super.disconnect();
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

    public async connect(): Promise<this> {
      this.once(Core.ServiceEventType.Disconnect, () => {
        const intervalId = setInterval(() => this.connect(), Core.Service.ScanInterval);
        this.once(Core.ServiceEventType.Connect, () => clearInterval(intervalId));
      });
      return this;
    }

    public disconnect() {
      this._devices.forEach(device => device.disconnect());
      this._devices.clear();
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
      this.removeAllListeners();
      this.emit(ServiceEventType.Disconnect);
      return this;
    }
  }

  export namespace TCP {
    export class PayloadError extends Error {
      constructor(messageOrError: string | Error) {
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

      public publish(
        event: Core.ServiceEventType,
        payload?: Core.IKeyValue | { errors: PayloadError[] }
      ) {
        if (!this._client.writable) return;
        const data = Core.F.stringify({ event, date: new Date(), payload });
        this._client.write(data);
      }

      public async connect(): Promise<this> {
        this._client.connect({ port: this._port, host: this._host });

        this._client.on(Core.ConnectionEventType.Error, (error: Error & { code: string }) => {
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

            const device = service?.devices.get(deviceId);
            if (deviceId && !device) {
              errors.push(new PayloadError(`No device connected: [deviceId="${deviceId}"]`));
            }

            if (errors.length > 0) {
              return this.publish(Core.ServiceEventType.Error, { errors });
            }
            if (!service) return;

            return device ? device.send(command, params) : service.send(command, params);
          });
        });

        const promises: any[] = [];
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
              service: { type: service.constructor.name, ...data },
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

        await Promise.all(promises);
        await new Promise(resolve => this._client.once(Core.ConnectionEventType.Connect, resolve));
        return this;
      }

      public disconnect(): this {
        this._client.removeAllListeners();
        this._services.forEach(service => service.disconnect());

        this.publish(Core.ServiceEventType.Disconnect);
        return this;
      }

      public get devices(): Core.Device[] {
        const devices: Core.Device[] = [];
        this._services.forEach(service => service.devices.forEach(device => devices.push(device)));
        return devices;
      }
    }
  }
}

export default Core;
