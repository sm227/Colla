// types/simple-peer.d.ts

declare module 'simple-peer' {
    import { EventEmitter } from 'events';
  
    interface SimplePeer extends EventEmitter {
      signal(data: string | object): void;
      send(data: string | Uint8Array | ArrayBuffer | Buffer): void;
      destroy(err?: string | Error): void;
      
      readonly connected: boolean;
      readonly destroyed: boolean;
    }
  
    interface SimplePeerOptions {
      initiator?: boolean;
      channelConfig?: object;
      channelName?: string;
      config?: object;
      offerOptions?: object;
      answerOptions?: object;
      sdpTransform?: (sdp: string) => string;
      stream?: MediaStream;
      streams?: MediaStream[];
      trickle?: boolean;
      allowHalfTrickle?: boolean;
      wrtc?: object;
      objectMode?: boolean;
    }
  
    interface SimplePeerConstructor {
      new (opts?: SimplePeerOptions): SimplePeer;
      (opts?: SimplePeerOptions): SimplePeer;
    }
  
    const SimplePeer: SimplePeerConstructor;
    export = SimplePeer;
  }