#!/usr/bin/env python3
"""One-shot PPE training (same logic as ppe_helmet_jacket_training.ipynb training cell)."""
import os
import shutil
from pathlib import Path

import torch
import yaml
from ultralytics import YOLO

REPO_ROOT = Path(__file__).resolve().parent
os.chdir(REPO_ROOT)

DATA_YAML = REPO_ROOT / "safety-Helmet-Reflective-Jacket" / "data.yaml"
assert DATA_YAML.is_file(), f"Missing {DATA_YAML}"

FAST_TRAIN = True
FAST_TRAIN_N = 700
EPOCHS = 10 if FAST_TRAIN else 50
IMGSZ = 416 if FAST_TRAIN else 640
PRETRAINED = REPO_ROOT / "yolo11n.pt"

_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _build_first_n_train_yaml(repo_root: Path, data_yaml: Path, n: int) -> Path:
    with open(data_yaml) as f:
        cfg = yaml.safe_load(f)
    base = Path(cfg.get("path", data_yaml.parent))
    train_img_dir = (base / cfg["train"]).resolve()
    labels_dir = train_img_dir.parent / "labels"
    imgs = sorted(
        [p for p in train_img_dir.glob("*") if p.suffix.lower() in _EXT],
        key=lambda p: p.name,
    )
    take = imgs[:n]
    if len(take) < n:
        raise ValueError(f"Only {len(take)} train images found; need at least {n}")

    sub_root = repo_root / "ppe_training" / f"subset_train_{n}"
    sub_img = sub_root / "images"
    sub_lbl = sub_root / "labels"
    if sub_root.exists():
        shutil.rmtree(sub_root)
    sub_img.mkdir(parents=True)
    sub_lbl.mkdir(parents=True)

    for img_path in take:
        stem = img_path.stem
        (sub_img / img_path.name).symlink_to(img_path.resolve())
        src_l = labels_dir / f"{stem}.txt"
        if not src_l.is_file():
            raise FileNotFoundError(f"Missing label for {img_path.name}: {src_l}")
        (sub_lbl / f"{stem}.txt").symlink_to(src_l.resolve())

    out = repo_root / "ppe_training" / f"data_subset_train_{n}.yaml"
    rel_ds = "safety-Helmet-Reflective-Jacket"
    yml = {
        "path": str(repo_root),
        "train": f"ppe_training/subset_train_{n}/images",
        "val": f"{rel_ds}/valid/images",
        "test": f"{rel_ds}/test/images",
        "names": cfg.get("names", {0: "Safety-Helmet", 1: "Reflective-Jacket"}),
        "nc": int(cfg.get("nc", 2)),
    }
    with open(out, "w") as f:
        yaml.safe_dump(yml, f, sort_keys=False, allow_unicode=True)
    print(f"Subset: {len(take)} images → {sub_root}")
    return out


def main() -> None:
    train_data_yaml = (
        _build_first_n_train_yaml(REPO_ROOT, DATA_YAML, FAST_TRAIN_N)
        if FAST_TRAIN
        else DATA_YAML
    )

    device = "0" if torch.cuda.is_available() else "cpu"
    print("Device:", device)
    print(f"FAST_TRAIN={FAST_TRAIN} | train_yaml={train_data_yaml.name} epochs={EPOCHS} imgsz={IMGSZ}")

    run_weights = REPO_ROOT / "ppe_training" / "yolov11_ppe" / "weights"
    last_pt = run_weights / "last.pt"
    resume = last_pt.is_file()
    if resume:
        print("Resuming from:", last_pt)
        model = YOLO(str(last_pt))
    else:
        assert PRETRAINED.is_file(), f"Missing {PRETRAINED}"
        model = YOLO(str(PRETRAINED))

    model.train(
        data=str(train_data_yaml),
        epochs=EPOCHS,
        imgsz=IMGSZ,
        patience=0,
        device=device,
        project=str(REPO_ROOT / "ppe_training"),
        name="yolov11_ppe",
        exist_ok=True,
        resume=resume,
    )
    print("Done. Weights:", run_weights / "best.pt")


if __name__ == "__main__":
    main()
