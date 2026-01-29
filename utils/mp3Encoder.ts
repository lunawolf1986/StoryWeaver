
// A client-side LAME MP3 encoder optimized for streaming and performance.

export class Mp3Encoder {
  private sampleRate: number;
  private numChannels: number;
  private worker: Worker | null = null;
  private isBusy: boolean = false;
  private resolveFinal: ((blobs: Uint8Array[]) => void) | null = null;
  private rejectFinal: ((err: Error) => void) | null = null;
  private encodedChunks: Uint8Array[] = [];

  private readonly LAME_WORKER_SCRIPT = `
    self.lame = null;
    self.queue = [];
    importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

    function process(command, payload) {
      switch(command) {
        case 'init': {
          self.lame = new lamejs.Mp3Encoder(payload.channels, payload.sampleRate, payload.bitRate);
          self.postMessage({ command: 'init-complete' });
          // Process queued chunks
          while(self.queue.length > 0) {
            const next = self.queue.shift();
            process(next.command, next.payload);
          }
          break;
        }
        case 'encode-chunk': {
          if (!self.lame) {
              self.queue.push({ command, payload });
              return;
          }
          const int16Buffer = new Int16Array(payload.buffer, payload.byteOffset, payload.byteLength / 2);
          const mp3buf = self.lame.encodeBuffer(int16Buffer);
          if (mp3buf.length > 0) {
            self.postMessage({ command: 'data', buffer: mp3buf }, [mp3buf.buffer]);
          }
          break;
        }
        case 'flush': {
          if (!self.lame) {
              self.postMessage({ command: 'end' });
              return;
          }
          const mp3buf = self.lame.flush();
          if (mp3buf.length > 0) {
            self.postMessage({ command: 'data', buffer: mp3buf }, [mp3buf.buffer]);
          }
          self.postMessage({ command: 'end' });
          break;
        }
      }
    }

    self.onmessage = function(e) {
      const { command, payload } = e.data;
      process(command, payload);
    };
  `;
  
  constructor(sampleRate: number, numChannels: number) {
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
  }

  public async init(): Promise<void> {
    if (this.worker) return;

    return new Promise((resolve, reject) => {
      try {
        const blob = new Blob([this.LAME_WORKER_SCRIPT], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);

        this.worker.onmessage = (e) => {
          const { command, buffer } = e.data;
          if (command === 'init-complete') {
            resolve();
          } else if (command === 'data') {
            this.encodedChunks.push(buffer);
          } else if (command === 'end') {
            this.isBusy = false;
            if (this.resolveFinal) this.resolveFinal(this.encodedChunks);
          }
        };

        this.worker.onerror = (e) => {
          console.error('MP3 Worker Error:', e);
          if (this.rejectFinal) this.rejectFinal(new Error("Worker failed"));
          reject(e);
        };

        this.worker.postMessage({
          command: 'init',
          payload: {
            channels: this.numChannels,
            sampleRate: this.sampleRate,
            bitRate: 128,
          },
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  /**
   * Pushes a new raw PCM chunk (Uint8Array) to the encoder.
   * This uses Transferables for zero-copy performance when possible.
   */
  public push(chunk: Uint8Array) {
    if (!this.worker) return;
    
    // Check if the chunk occupies its entire buffer
    if (chunk.byteOffset === 0 && chunk.byteLength === chunk.buffer.byteLength) {
        this.worker.postMessage({ command: 'encode-chunk', payload: chunk }, [chunk.buffer]);
    } else {
        // Otherwise, copy to a new buffer to safely transfer
        const bufferToTransfer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
        this.worker.postMessage({ command: 'encode-chunk', payload: new Uint8Array(bufferToTransfer) }, [bufferToTransfer]);
    }
  }

  /**
   * Flushes the encoder and returns the final MP3 chunks.
   */
  public async finalize(): Promise<Uint8Array[]> {
    if (!this.worker) return [];
    this.isBusy = true;
    return new Promise((resolve, reject) => {
      this.resolveFinal = resolve;
      this.rejectFinal = reject;
      this.worker?.postMessage({ command: 'flush' });
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.encodedChunks = [];
    }
  }
}
