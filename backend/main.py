import sys
import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from audio_processor import preprocess_audio_bytes
from ml_engine import MLEngine

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_engine
    ml_engine = MLEngine()
    yield

app = FastAPI(
    title="VoiceShield AI ML Backend",
    description="Real PyTorch Inference Engine for AASIST Deepfake Detection, ECAPA-TDNN Speaker Verification, and Indic Speech Analysis",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "VoiceShield AI Real ML Backend",
        "models_loaded": {
            "AASIST": "PyTorch RawNet2 anti-spoofing",
            "ECAPA_TDNN": "PyTorch Speaker Verification",
            "Indic_Speech": "Spectral & Formant Language Analyzer"
        }
    }

@app.post("/api/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file uploaded")
    
    try:
        content = await file.read()
        waveform, duration, audio_meta = preprocess_audio_bytes(content, target_sr=16000)
        
        if ml_engine is None:
            raise HTTPException(status_code=500, detail="ML Engine not initialized")

        results = ml_engine.analyze_audio(waveform, sample_rate=16000, duration_sec=duration, audio_meta=audio_meta)
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio analysis error: {str(e)}")

@app.post("/api/register_speaker")
async def register_speaker(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file uploaded for speaker enrollment")

    try:
        content = await file.read()
        waveform, duration, _ = preprocess_audio_bytes(content, target_sr=16000)

        if duration < 1.0:
            raise HTTPException(status_code=400, detail="Registration audio must be at least 1 second long")

        res = ml_engine.register_speaker(waveform, sr=16000)
        return res

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speaker registration error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
