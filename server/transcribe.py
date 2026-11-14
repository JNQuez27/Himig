"""Auto-generated lyrics: Whisper (ONNX) run on the isolated vocals -> LRC text.

Used when LRCLIB has no synced lyrics for a song. Runs on onnxruntime + numpy
only, because Windows application control on the dev PC blocks faster-whisper,
whisper.cpp and sherpa-onnx.

Self-check:  .venv/Scripts/python transcribe.py path/to/vocals.mp3
"""
import os
from functools import lru_cache

import numpy as np

# base: ~30 s per song on the dev PC. "onnx-community/whisper-small" is more
# accurate (better for Tagalog) but about 1 GB and several times slower.
MODEL = os.environ.get("HIMIG_WHISPER", "onnx-community/whisper-base")
SR, N_FFT, HOP, N_MELS, WINDOW = 16000, 400, 160, 80, 30  # Whisper's fixed front end
MAX_TOKENS = 224


def _mel_filters():
    """Slaney-scale mel filterbank, as Whisper was trained with."""
    def hz_to_mel(f):
        f = np.asarray(f, dtype=np.float64)
        return np.where(f < 1000, f / (200 / 3), 15 + np.log(np.maximum(f, 1e-9) / 1000) / (np.log(6.4) / 27))

    def mel_to_hz(m):
        return np.where(m < 15, m * (200 / 3), 1000 * np.exp((np.log(6.4) / 27) * (m - 15)))

    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    pts = mel_to_hz(np.linspace(hz_to_mel(0), hz_to_mel(SR / 2), N_MELS + 2))
    fb = np.zeros((N_MELS, len(freqs)))
    for i in range(N_MELS):
        lo, mid, hi = pts[i:i + 3]
        fb[i] = np.maximum(0, np.minimum((freqs - lo) / (mid - lo), (hi - freqs) / (hi - mid)))
        fb[i] *= 2 / (hi - lo)
    return fb.astype(np.float32)


def _log_mel(audio):
    """30 s of 16 kHz mono -> (1, 80, 3000) log-mel features."""
    audio = np.pad(audio[:SR * WINDOW], (0, max(0, SR * WINDOW - len(audio))))
    x = np.pad(audio, N_FFT // 2, mode="reflect")
    window = np.hanning(N_FFT + 1)[:-1]
    frames = np.lib.stride_tricks.sliding_window_view(x, N_FFT)[::HOP][:-1]
    power = np.abs(np.fft.rfft(frames * window, axis=1)) ** 2
    mel = np.log10(np.maximum(_mel_filters() @ power.T, 1e-10))
    mel = (np.maximum(mel, mel.max() - 8) + 4) / 4
    return mel[None].astype(np.float32)


@lru_cache(maxsize=1)
def _load():
    import onnxruntime as ort
    from huggingface_hub import hf_hub_download
    from tokenizers import Tokenizer

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 8  # fastest on the dev PC (see Phase 0 notes)
    get = lambda name: hf_hub_download(MODEL, name)
    enc = ort.InferenceSession(get("onnx/encoder_model.onnx"), opts, providers=["CPUExecutionProvider"])
    dec = ort.InferenceSession(get("onnx/decoder_model.onnx"), opts, providers=["CPUExecutionProvider"])
    return enc, dec, Tokenizer.from_file(get("tokenizer.json"))


def transcribe(audio):
    """16 kHz mono float array -> [(start_seconds, text)]."""
    enc, dec, tok = _load()
    sot, eot = tok.token_to_id("<|startoftranscript|>"), tok.token_to_id("<|endoftext|>")
    task, ts0 = tok.token_to_id("<|transcribe|>"), tok.token_to_id("<|0.00|>")
    lang_lo, lang_hi = sot + 1, tok.token_to_id("<|translate|>")

    def logits(ids, hidden):
        out = dec.run(["logits"], {"input_ids": np.array([ids], dtype=np.int64),
                                   "encoder_hidden_states": hidden})[0]
        return out[0, -1].astype(np.float64)

    lines, lang, seek = [], None, 0.0
    total = len(audio) / SR
    while seek < total - 1:
        chunk = audio[int(seek * SR):int((seek + WINDOW) * SR)]
        # Whisper invents words over silence, so skip stretches with no singing.
        if np.sqrt(np.mean(chunk ** 2)) < 0.005:
            seek += WINDOW
            continue
        hidden = enc.run(None, {"input_features": _log_mel(chunk)})[0]
        if lang is None:  # detect the language once, from the first sung part
            lang = lang_lo + int(np.argmax(logits([sot], hidden)[lang_lo:lang_hi]))

        ids, n0 = [sot, lang, task], 3
        while len(ids) - n0 < MAX_TOKENS:
            lg = logits(ids, hidden)
            lg[eot + 1:ts0] = -np.inf  # no other special tokens
            out = ids[n0:]
            last_ts = bool(out) and out[-1] >= ts0
            prev_ts = len(out) < 2 or out[-2] >= ts0
            if not out:
                lg[:ts0] = -np.inf  # a segment must open with a timestamp
                lg[ts0 + 50 + 1:] = -np.inf  # ...within the first second
            elif last_ts and prev_ts:
                lg[ts0:] = -np.inf  # after a start stamp comes text
            elif last_ts:
                lg[:eot] = -np.inf  # after an end stamp: next start stamp or stop
            stamps = [t for t in out if t >= ts0]
            if stamps:
                lg[ts0:stamps[-1]] = -np.inf  # time never goes backwards
            p = np.exp(lg - lg.max())
            if p[ts0:].sum() > p[:ts0].max():
                lg[:ts0] = -np.inf  # timestamps collectively outweigh any word
            nxt = int(np.argmax(lg))
            if nxt == eot:
                break
            ids.append(nxt)

        # Tokens come as: <start> words <end> <start> words <end> ...
        out, start, words, end = ids[n0:], None, [], None
        for t in out + [ts0 + 1500]:
            if t < ts0:
                words.append(t)
                continue
            stamp = (t - ts0) * 0.02
            if words and start is not None:
                text = tok.decode(words).replace('♪', '').strip()
                if text[:1] in '([' and text[-1:] in ')]':
                    text = ''  # sound descriptions like (clears throat)
                if text and not (lines and lines[-1][1] == text):  # drop stuck repeats
                    lines.append((seek + start, text))
                end, words, start = stamp, [], None
            else:
                start = stamp
        # Continue from where the last finished line ended (or the next window).
        seek += end if end and 1 < end < WINDOW else WINDOW
    return lines


def to_lrc(lines):
    return "\n".join(f"[{int(t // 60):02d}:{t % 60:05.2f}] {text}" for t, text in lines)


def lyrics_from_vocals(path):
    """LRC text for a vocals audio file, or None if nothing was sung."""
    import demucs_onnx

    audio, _ = demucs_onnx.load_audio(path, target_sr=SR)
    lines = transcribe(np.asarray(audio, dtype=np.float32).mean(axis=0))
    return to_lrc(lines) if len(lines) >= 3 else None


if __name__ == "__main__":
    import sys
    import time

    assert _mel_filters().shape == (N_MELS, N_FFT // 2 + 1)
    assert _log_mel(np.zeros(SR, dtype=np.float32)).shape == (1, N_MELS, 3000)
    assert to_lrc([(65.5, "hi")]) == "[01:05.50] hi"
    if len(sys.argv) > 1:
        t = time.time()
        print(lyrics_from_vocals(sys.argv[1]))
        print(f"-- {time.time() - t:.0f} s with {MODEL}")
