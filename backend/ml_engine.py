import numpy as np
from models.aasist_model import AASISTEngine
from models.ecapa_model import ECAPAEngine
from models.indic_model import IndicSpeechAnalyzer

class MLEngine:
    def __init__(self):
        print("[ML Engine] Initializing PyTorch AI Models (AASIST, ECAPA-TDNN, Indic Speech Analyzer)...")
        self.aasist = AASISTEngine()
        self.ecapa = ECAPAEngine()
        self.indic = IndicSpeechAnalyzer()
        print("[ML Engine] All AI models loaded successfully!")

    def register_speaker(self, waveform: np.ndarray, sr: int = 16000) -> dict:
        return self.ecapa.register_speaker(waveform, sr)

    def analyze_audio(self, waveform: np.ndarray, sr: int, duration_sec: float, audio_meta: dict) -> dict:
        """
        Runs ML pipeline:
        1. AASIST -> Audio deepfake/spoof probability %
        2. ECAPA-TDNN -> Speaker Verification Match %
        3. IndicSpeechAnalyzer -> Language & Pitch Analysis
        """
        # 1. AASIST Spoof Detection
        spoof_pct = self.aasist.predict_spoof_probability(waveform, sr)
        is_spoof = spoof_pct >= 50.0
        prediction_label = "SPOOF / FAKE" if is_spoof else "REAL / BONAFIDE"

        # 2. ECAPA-TDNN Speaker Verification
        speaker_match_pct, is_registered = self.ecapa.verify_speaker(waveform, sr)

        # 3. Indic Speech & Language Analysis
        indic_meta = self.indic.analyze_indic_speech(waveform, sr)

        # 4. Integrated Risk Engine & Decision Matrix
        # Higher spoof probability and lower speaker match increase the risk score
        unmatched_factor = (100.0 - speaker_match_pct) if is_registered else 20.0
        raw_risk = (spoof_pct * 0.75) + (unmatched_factor * 0.25)
        risk_score = int(round(np.clip(raw_risk, 0, 100)))

        if risk_score >= 70 or spoof_pct >= 75.0:
            status = "CRITICAL"
            decision = "BLOCK"
            risk_label = "High Risk (Deepfake Detected)"
        elif risk_score >= 35 or spoof_pct >= 40.0:
            status = "SUSPICIOUS"
            decision = "VERIFY"
            risk_label = "Medium Risk (Verification Required)"
        else:
            status = "SAFE"
            decision = "ALLOW"
            risk_label = "Low Risk (Authentic Voice)"

        return {
            "model_architecture": "Real PyTorch ML Models (AASIST + ECAPA-TDNN + IndicWav2Vec Engine)",
            "analysis_type": "REAL_ML_INFERENCE",
            "spoof_probability_pct": spoof_pct,
            "prediction": prediction_label,
            "is_spoof": is_spoof,
            "speaker_match_pct": speaker_match_pct,
            "speaker_registered": is_registered,
            "detected_language": indic_meta["detected_language"],
            "language_confidence_pct": indic_meta["confidence"],
            "pitch_mean_hz": indic_meta["pitch_mean_hz"],
            "speech_tempo_bpm": indic_meta["speech_tempo_bpm"],
            "risk_score": risk_score,
            "status": status,
            "decision": decision,
            "risk_label": risk_label,
            "audio_metadata": audio_meta
        }
