/// <reference types="node" />
import { EventEmitter } from 'events';
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
    class Connection extends EventEmitter implements IConnection {
        static EventType: {
            Connect: string;
            Error: string;
            Message: string;
            Disconnect: string;
        };
        protected static SocketEventType: {
            Connect: string;
            Close: string;
            Error: string;
            Readable: string;
        };
        protected _host: string;
        protected _port: number;
        constructor(options: IConnectionOptions);
        get host(): string;
        get port(): number;
        connect(): Promise<void>;
        send(...args: any[]): Promise<any>;
        disconnect(): void;
    }
}
export default Core;
