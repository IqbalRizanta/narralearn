/**
 * NarraLearn PCM capture worklet.
 * Resamples the microphone stream to 16 kHz mono Float32 and posts ~256 ms
 * chunks to the main thread. The main thread forwards the ArrayBuffer over
 * WebSocket to the voice calibration endpoint.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = new Float32Array(0);
    this.port.onmessage = (event) => {
      if (event.data === "flush" && this.pending.length > 0) {
        const chunk = this.pending;
        this.pending = new Float32Array(0);
        this.port.postMessage(chunk, [chunk.buffer]);
      }
    };
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) {
      return true;
    }

    const ratio = sampleRate / 16000;
    const outLength = Math.max(1, Math.floor(input.length / ratio));
    const resampled = new Float32Array(outLength);

    for (let i = 0; i < outLength; i += 1) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      const next = input[Math.min(index + 1, input.length - 1)] || 0;
      resampled[i] = input[index] * (1 - fraction) + next * fraction;
    }

    const merged = new Float32Array(this.pending.length + resampled.length);
    merged.set(this.pending);
    merged.set(resampled, this.pending.length);

    if (merged.length >= 4096) {
      this.pending = new Float32Array(0);
      this.port.postMessage(merged, [merged.buffer]);
    } else {
      this.pending = merged;
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
