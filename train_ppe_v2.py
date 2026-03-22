from ultralytics import YOLO
import os
import torch
from pathlib import Path

def train():
    # Always anchor to this repo so runs never land under a random cwd (e.g. Jupyter / another clone)
    repo = Path(__file__).resolve().parent
    os.chdir(repo)

    device = "0" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    print(f"Repo / outputs: {repo}")

    data_path = repo / "safety-Helmet-Reflective-Jacket" / "data.yaml"

    model = YOLO("yolo11n.pt")

    results = model.train(
        data=str(data_path),
        epochs=50,
        imgsz=640,
        patience=0,
        device=device,
        project=str(repo / "ppe_training"),
        name="yolov11_ppe",
    )

if __name__ == "__main__":
    train()
