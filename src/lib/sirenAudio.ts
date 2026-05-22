/** Generates a short looping siren WAV (singleton blob URL). */

let cachedUrl: string | null = null;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWav(samples: Int16Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i]!, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function buildSirenSamples(sampleRate: number, durationSec: number): Int16Array {
  const length = Math.floor(sampleRate * durationSec);
  const samples = new Int16Array(length);
  const cycle = 0.22;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const high = Math.floor(t / cycle) % 2 === 1;
    const freq = high ? 880 : 520;
    const amp = 0.32 * (high ? 1 : 0.92);
    samples[i] = Math.max(
      -32767,
      Math.min(32767, Math.floor(Math.sin(2 * Math.PI * freq * t) * amp * 32767))
    );
  }

  return samples;
}

export function getSirenAudioUrl(): string {
  if (cachedUrl) return cachedUrl;
  const sampleRate = 22050;
  const samples = buildSirenSamples(sampleRate, 2.4);
  cachedUrl = URL.createObjectURL(encodeWav(samples, sampleRate));
  return cachedUrl;
}
