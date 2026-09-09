import io
import numpy as np
import librosa
import soundfile as sf
import torch

def preprocess_audio_bytes(audio_bytes: bytes, target_sr: int = 16000) -> tuple[np.ndarray, float, dict]:
    """
    Decodes input audio bytes into 16kHz mono float32 numpy array.
    Returns: (waveform_1d_float32, duration_sec, metadata_dict)
    """
    try:
        waveform, sr = librosa.load(io.BytesIO(audio_bytes), sr=target_sr, mono=True)
    except Exception as e:
        # Fallback to soundfile if librosa loader fails
        try:
            data, sr = sf.read(io.BytesIO(audio_bytes))
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            if sr != target_sr:
                waveform = librosa.resample(data, orig_sr=sr, target_sr=target_sr)
            else:
                waveform = data
        except Exception as inner_e:
            raise ValueError(f"Failed to decode audio file: {e} | {inner_e}")

    waveform = waveform.astype(np.float32)
    duration = len(waveform) / target_sr

    # Audio metrics calculation
    rms = np.sqrt(np.mean(waveform ** 2)) if len(waveform) > 0 else 0.0
    peak = np.max(np.abs(waveform)) if len(waveform) > 0 else 0.0

    # Basic Voice Activity Detection (VAD) via energy threshold
    frame_length = int(target_sr * 0.025)  # 25ms frames
    hop_length = int(target_sr * 0.010)    # 10ms hop
    if len(waveform) >= frame_length:
        frames = librosa.util.frame(waveform, frame_length=frame_length, hop_length=hop_length)
        frame_energies = np.sqrt(np.mean(frames ** 2, axis=0))
        silence_thresh = max(0.005, np.percentile(frame_energies, 20) * 1.5)
        active_frames = np.sum(frame_energies > silence_thresh)
        vad_ratio = active_frames / max(1, len(frame_energies))
    else:
        vad_ratio = 1.0

    # Quality heuristic
    snr_est = 20 * np.log10((peak + 1e-6) / (rms + 1e-6))
    if rms > 0.03 and snr_est > 12.0:
        quality = "Studio / High Clarity"
    elif rms > 0.01:
        quality = "Clean Speech"
    elif rms > 0.002:
        quality = "Low Volume / Noisy"
    else:
        quality = "Near Silence"

    meta = {
        "sample_rate": target_sr,
        "duration_sec": round(duration, 2),
        "num_samples": len(waveform),
        "rms_energy": float(round(rms, 4)),
        "peak_amplitude": float(round(peak, 4)),
        "vad_activity_pct": float(round(vad_ratio * 100, 1)),
        "estimated_quality": quality
    }

    return waveform, duration, meta
