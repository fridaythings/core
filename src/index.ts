import { EventEmitter } from 'events';

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

  export class Connection extends EventEmitter implements IConnection {
    public static EventType = {
      Connect: 'connect',
      Error: 'error',
      Message: 'message',
      Disconnect: 'disconnect',
    };
    protected static SocketEventType = {
      Connect: 'connect',
      Close: 'close',
      Error: 'error',
      Readable: 'readable',
    };
    // @ts-ignore
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

    public async connect() {
      throw new Error('connect: No implementation');
    }

    public async send(...args: any[]) {
      throw new Error('connect: No implementation');
    }

    public disconnect() {
      throw new Error('disconnect: No implementation');
    }
  }
}

export default Core;
