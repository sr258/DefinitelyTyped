// Type definitions for sharedb 2.2
// Project: https://github.com/share/sharedb
// Definitions by: Steve Oney <https://github.com/soney>
//                 Eric Hwang <https://github.com/ericyhwang>
//                 Peter Xu <https://github.com/pxpeterxu>
//                 Alec Gibson <https://github.com/alecgibson>
//                 Christina Burger <https://github.com/pypmannetjies>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.0

/// <reference path="lib/sharedb.d.ts" />

import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import Agent = require('./lib/agent');
import { Connection } from './lib/client';
import * as ShareDB from './lib/sharedb';

interface PubSubOptions {
    prefix?: string;
}
interface Stream {
    id: string;
}

export = sharedb;

declare class sharedb extends EventEmitter {
    db: sharedb.DB;
    pubsub: sharedb.PubSub;
    extraDbs: {[extraDbName: string]: sharedb.ExtraDB};
    milestoneDb?: sharedb.MilestoneDB;
    errorHandler: ErrorHandler;

    readonly projections: {
        readonly [name: string]: ReadonlyProjection;
    };

    constructor(options?: {
        db?: any,
        pubsub?: sharedb.PubSub,
        extraDbs?: {[extraDbName: string]: sharedb.ExtraDB},
        milestoneDb?: sharedb.MilestoneDB,
        suppressPublish?: boolean,
        maxSubmitRetries?: number,
        doNotForwardSendPresenceErrorsToClient?: boolean,
        errorHandler?: ErrorHandler;

        presence?: boolean,
        /**
         * @deprecated disableDocAction was removed in v1.0
         */
        disableDocAction?: boolean,
        /**
         * @deprecated disableSpaceDelimitedActions was removed in v1.0
         */
        disableSpaceDelimitedActions?: boolean
    });
    /**
     * Creates a server-side connection to ShareDB.
     *
     * This is almost always called with no arguments.
     *
     * @param connection optional existing connection to re-bind to this `Backend`.
     * @param req optional request context for the new connection. See `#listen` for details.
     *
     * @see https://github.com/share/sharedb#client-api
     */
    connect(connection?: Connection, req?: any): Connection;
    /**
     * Registers a projection that can be used from clients just like a normal collection.
     *
     * @param name name of the projection
     * @param collection name of the backing collection
     * @param fields field whitelist for the projection
     */
    addProjection(name: string, collection: string, fields: ProjectionFields): void;
    /**
     * Registers a new `Duplex` stream with the backend. This should be called when the server
     * receives a new connection from a client.
     *
     * @param stream duplex stream for exchanging data with the new client
     * @param request optional request that initiated the new connection, e.g. a HTTP request. This
     *   is passed to any "connect" middleware listeners, which can use it for inspecting cookies
     *   or session info.
     */
    listen(stream: Duplex, request?: any): Agent;
    close(callback?: BasicCallback): void;
    /**
     * Registers a server middleware function.
     *
     * @param action name of an action from https://github.com/share/sharedb#middlewares
     * @param fn listener invoked when the specified action occurs
     */
    use<A extends keyof sharedb.middleware.ActionContextMap>(
        action: A,
        fn: (context: sharedb.middleware.ActionContextMap[A], callback: (err?: any) => void) => void,
    ): void;

    on(event: 'timing', callback: (type: string, time: number, request: any) => void): this;
    on(event: 'submitRequestEnd', callback: (error: Error, request: SubmitRequest) => void): this;
    on(event: 'error', callback: (err: Error) => void): this;
    on(event: 'send', callback: (agent: Agent, response: ShareDB.ServerResponseSuccess | ShareDB.ServerResponseError) => void): this;

    addListener(event: 'timing', callback: (type: string, time: number, request: any) => void): this;
    addListener(event: 'submitRequestEnd', callback: (error: Error, request: SubmitRequest) => void): this;
    addListener(event: 'error', callback: (err: Error) => void): this;

    getOps(agent: Agent, index: string, id: string, from: number, to: number, options: GetOpsOptions, callback: (error: Error, ops: any[]) => any): void;
    getOpsBulk(agent: Agent, index: string, id: string, fromMap: Record<string, number>, toMap: Record<string, number>, options: GetOpsOptions, callback: (error: Error, ops: any[]) => any): void;

    static types: ShareDB.Types;
    static logger: ShareDB.Logger;
}

declare namespace sharedb {
    abstract class DB {
        projectsSnapshots: boolean;
        disableSubscribe: boolean;
        close(callback?: BasicCallback): void;
        commit(collection: string, id: string, op: any, snapshot: any, options: any, callback: (...args: any[]) => any): void;
        getSnapshot(collection: string, id: string, fields: any, options: any, callback: (...args: any[]) => any): void;
        getSnapshotBulk(collection: string, ids: string[], fields: any, options: any, callback: (...args: any[]) => any): void;
        getOps(collection: string, id: string, from: number | null, to: number | null, options: any, callback: (...args: any[]) => any): void;
        getOpsToSnapshot(collection: string, id: string, from: number | null, snapshot: number, options: any, callback: (...args: any[]) => any): void;
        getOpsBulk(collection: string, fromMap: any, toMap: any, options: any, callback: (...args: any[]) => any): void;
        getCommittedOpVersion(collection: string, id: string, snapshot: any, op: any, options: any, callback: (...args: any[]) => any): void;
        query: DBQueryMethod;
        queryPoll(collection: string, query: any, options: any, callback: (...args: any[]) => any): void;
        queryPollDoc(collection: string, id: string, query: any, options: any, callback: (...args: any[]) => any): void;
        canPollDoc(): boolean;
        skipPoll(): boolean;
    }

    class MemoryDB extends DB { }

    // The DBs in `extraDbs` are only ever used for queries, so they don't need the other DB methods.
    interface ExtraDB {
        query: DBQueryMethod;
        close(callback?: BasicCallback): void;
    }

    type DBQueryMethod = (collection: string, query: any, fields: ProjectionFields, options: any, callback: DBQueryCallback) => void;
    type DBQueryCallback = (err: Error | null, snapshots: Snapshot[], extra?: any) => void;

    abstract class PubSub {
        private static shallowCopy(obj: any): any;
        protected prefix?: string;
        protected nextStreamId: number;
        protected streamsCount: number;
        protected streams: {
            [channel: string]: Stream;
        };
        protected subscribed: {
            [channel: string]: boolean;
        };
        protected constructor(options?: PubSubOptions);
        close(callback?: (err: Error|null) => void): void;
        publish(channels: string[], data: {[k: string]: any}, callback: (err: Error | null) => void): void;
        subscribe(channel: string, callback: (err: Error | null, stream?: Stream) => void): void;
        protected abstract _subscribe(channel: string, callback: (err: Error | null) => void): void;
        protected abstract _unsubscribe(channel: string, callback: (err: Error | null) => void): void;
        protected abstract _publish(channels: string[], data: any, callback: (err: Error | null) => void): void;
        protected _emit(channel: string, data: {[k: string]: any}): void;
        private _createStream(channel): void;
        private _removeStream(channel, stream): void;
    }

    abstract class MilestoneDB {
        close(callback?: BasicCallback): void;
        getMilestoneSnapshot(collection: string, id: string, version: number, callback?: BasicCallback): void;
        saveMilestoneSnapshot(collection: string, snapshot: Snapshot, callback?: BasicCallback): void;
        getMilestoneSnapshotAtOrBeforeTime(collection: string, id: string, timestamp: number, callback?: BasicCallback): void;
        getMilestoneSnapshotAtOrAfterTime(collection: string, id: string, timestamp: number, callback?: BasicCallback): void;
    }

    /**
     * @deprecated Use the `Connection` type from 'sharedb/lib/client' instead, as that's where it
     *   lives in the actual source code.
     */
    class Connection {
        constructor(socket: ShareDB.Socket);
        get(collectionName: string, documentID: string): ShareDB.Doc;
        createFetchQuery(collectionName: string, query: string, options: {results?: ShareDB.Query[]}, callback: (err: Error, results: any) => any): ShareDB.Query;
        createSubscribeQuery(collectionName: string, query: string, options: {results?: ShareDB.Query[]}, callback: (err: Error, results: any) => any): ShareDB.Query;
    }
    type Doc = ShareDB.Doc;
    type Snapshot = ShareDB.Snapshot;
    type Query = ShareDB.Query;
    type Error = ShareDB.Error;
    type Op = ShareDB.Op;
    type CreateOp = ShareDB.CreateOp;
    type DeleteOp = ShareDB.DeleteOp;
    type EditOp = ShareDB.EditOp;
    type AddNumOp = ShareDB.AddNumOp;
    type ListMoveOp = ShareDB.ListMoveOp;
    type ListInsertOp = ShareDB.ListInsertOp;
    type ListDeleteOp = ShareDB.ListDeleteOp;
    type ListReplaceOp = ShareDB.ListReplaceOp;
    type StringInsertOp = ShareDB.StringInsertOp;
    type StringDeleteOp = ShareDB.StringDeleteOp;
    type ObjectInsertOp = ShareDB.ObjectInsertOp;
    type ObjectDeleteOp = ShareDB.ObjectDeleteOp;
    type ObjectReplaceOp = ShareDB.ObjectReplaceOp;
    type SubtypeOp = ShareDB.SubtypeOp;

    type Path = ShareDB.Path;
    type ShareDBSourceOptions = ShareDB.ShareDBSourceOptions;

    namespace middleware {
        interface ActionContextMap {
            /**
             * @deprecated use 'afterWrite' instead
             */
            afterSubmit: SubmitContext;
            afterWrite: SubmitContext;
            apply: ApplyContext;
            commit: CommitContext;
            connect: ConnectContext;
            /**
             * @deprecated use 'readSnapshots' instead
             */
            doc: DocContext;
            op: OpContext;
            query: QueryContext;
            readSnapshots: ReadSnapshotsContext;
            receive: ReceiveContext;
            receivePresence: PresenceContext;
            reply: ReplyContext;
            sendPresence: PresenceContext;
            submit: SubmitContext;
        }

        interface BaseContext<TAgentCustom = any> {
            action: keyof ActionContextMap;
            agent: Agent<TAgentCustom>;
            backend: sharedb;
        }

        interface ApplyContext<TAgentCustom = any> extends BaseContext<TAgentCustom>, SubmitRequest {
        }

        interface CommitContext<TAgentCustom = any> extends BaseContext<TAgentCustom>, SubmitRequest {
        }

        interface ConnectContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            stream: any;
            req: any;  // Property always exists, value may be undefined
        }

        interface DocContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            collection: string;
            id: string;
            snapshot: Snapshot;
        }

        interface OpContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            collection: string;
            id: string;
            op: any;
        }

        interface PresenceContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            presence: PresenceMessage;
            collection?: string;
        }

        interface QueryContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            index: string;
            collection: string;
            projection: ReadonlyProjection;
            fields: ProjectionFields;
            channel: string;
            query: any;
            options?: {[key: string]: any};
            db: DB | null;
            snapshotProjection: ReadonlyProjection | null;
        }

        interface ReadSnapshotsContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            collection: string;
            snapshots: Snapshot[];
            snapshotType: SnapshotType;
        }

        interface ReceiveContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            data: {[key: string]: any};  // ClientRequest, but before any validation
        }

        interface ReplyContext<TAgentCustom = any> extends BaseContext<TAgentCustom> {
            request: ShareDB.ClientRequest;
            reply: {[key: string]: any};
        }

        type SnapshotType = 'current' | 'byVersion' | 'byTimestamp';

        interface SubmitContext<TAgentCustom = any> extends BaseContext<TAgentCustom>, SubmitRequest {
        }
    }
}

interface ReadonlyProjection {
    readonly target: Readonly<string>;
    readonly fields: Readonly<ProjectionFields>;
}

interface ProjectionFields {
    [propertyName: string]: true;
}

interface SubmitRequest {
    index: string;
    projection: ReadonlyProjection;
    collection: string;
    id: string;
    op: sharedb.CreateOp | sharedb.DeleteOp | sharedb.EditOp;
    options: any;
    start: number;
    extra: {
        source?: any;
    };

    saveMilestoneSnapshot: boolean | null;
    suppressPublish: boolean | null;
    maxRetries: number | null;
    retries: number;

    snapshot: sharedb.Snapshot | null;
    ops: any[];
    channels: string[] | null;
}

interface GetOpsOptions {
    opsOptions?: {
        metadata?: boolean;
    };
}

interface PresenceMessage {
    a: 'p';
    ch: string; // channel
    src: string; // client ID
    id: string; // presence ID
    p: any; // presence payload
    pv: number; // presence version
    c?: string; // document collection
    d?: string; // document ID
    v?: number; // document version
    t?: string; // document OT type
}

type BasicCallback = (err?: Error) => void;

type ErrorHandler<TAgentCustom = any> = (error: Error, context: ErrorHandlerContext<TAgentCustom>) => void;
interface ErrorHandlerContext<TAgentCustom = any> {
    agent?: Agent<TAgentCustom>;
}
