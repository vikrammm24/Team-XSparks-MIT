# SMC-KAVACH (Vikas Dashboard)

AI-assisted worker safety dashboard: **Tier 1** face recognition with **helmet / reflective-jacket** detection (YOLO), **SQLite** worker storage, and multi-tier monitoring UI (environment, biometrics, analytics). Python services handle PPE inference and optional model training; the web app is **React + Vite**.

## Features

- **Worker identification** in the browser with **face-api.js** (TinyFaceDetector + face descriptors stored in SQLite via `sql.js`)
- **PPE verification** via a local **Flask** API (`ppe_server.py`) using **Ultralytics YOLO** (`best.pt`: Safety-Helmet, Reflective-Jacket)
- **Live webcam** Tier 1 flow: periodic snapshots to `/verify_helmet`, green/red status for helmet and jacket (with optional face-geometry checks on the server)
- **SQLite** database (`vikas.sqlite`) synced through Vite middleware at `/api/db` (no Firebase in this repo)
- **Training pipeline**: `run_ppe_train.py`, notebook `ppe_helmet_jacket_training.ipynb`, dataset under `safety-Helmet-Reflective-Jacket/`
- **Dashboard tiers**: Tier 1 (gatekeeper / PPE), Tier 2 (environment), Tier 3 (biometrics + SOS), Tier 4 (supervisor analytics / incident log)

## Project Structure

```text
vikaas/
|-- public/
|   `-- models/                 # face-api.js weight shards (served to the browser)
|-- src/
|   |-- components/
|   |   `-- Layout.tsx
|   |-- context/
|   |   |-- AppContext.tsx
|   |   |-- AuthContext.tsx
|   |   `-- DatabaseContext.tsx
|   |-- pages/
|   |   |-- Home.tsx
|   |   |-- Login.tsx
|   |   |-- Register.tsx
|   |   |-- Tier1.tsx
|   |   |-- Tier2.tsx
|   |   |-- Tier3.tsx
|   |   `-- Tier4.tsx
|   |-- App.tsx
|   |-- main.tsx
|   `-- index.css
|-- safety-Helmet-Reflective-Jacket/   # YOLO dataset (train/val/test + data.yaml)
|-- ppe_training/
|   |-- yolov11_ppe/            # training run: weights, results.csv, args.yaml
|   |-- data_subset_train_700.yaml
|   `-- subset_train_700/       # symlinks to first N train images (when using fast train)
|-- scripts/
|   `-- run_ppe_training.sh
|-- ppe_server.py               # Flask: POST /verify_helmet (image base64 + optional face_box)
|-- run_ppe_train.py            # CLI training (matches notebook fast-train settings)
|-- train_ppe.py
|-- train_ppe_v2.py
|-- ppe_helmet_jacket_training.ipynb
|-- yolo11n.pt                  # default pretrained backbone for training
|-- vite.config.ts              # dev server + /api/db SQLite read/write
|-- vikas.sqlite                # local worker DB (created/updated by the app)
|-- package.json
|-- tsconfig.json
`-- index.html
```

## Requirements

- **Node.js** 18+ (for Vite / React)
- **Python** 3.10+ recommended (3.14 used in `training_env` on some setups)

### Python environment

This repo commonly uses a local venv at `training_env/` (or `.venv/`). Create one if needed:

```bash
cd /path/to/vikaas
python3 -m venv training_env
source training_env/bin/activate   # Windows: training_env\Scripts\activate
```

Install packages used by `ppe_server.py` and training:

```bash
pip install ultralytics torch opencv-python-headless flask flask-cors pyyaml numpy
```

(Optional) GPU: install a **CUDA-enabled** `torch` build from [pytorch.org](https://pytorch.org) before `ultralytics` for faster training/inference.

### Frontend

```bash
npm install
```

## Environment variables

**PPE server** (optional overrides):

| Variable | Purpose |
|----------|---------|
| `PPE_MODEL_PATH` | Path to `best.pt` (default: `ppe_training/yolov11_ppe/weights/best.pt`) |
| `PPE_HELMET_CONF`, `PPE_JACKET_CONF`, `PPE_INFER_CONF` | Confidence gates (see `ppe_server.py`) |
| `PPE_HELMET_FACE_IOU_REJECT`, `PPE_HELMET_MIN_EXTEND_ABOVE_FACE_FRAC` | Face-vs-helmet false-positive filters when `face_box` is sent |

No Firebase `.env` is required for the current app; keep any local secrets out of git (e.g. `.env.local`).

## Run

### 1. PPE inference API (required for Tier 1 YOLO)

From the repository root, with the Python venv active:

```bash
source training_env/bin/activate   # or your venv
python ppe_server.py
```

- Listens on **http://127.0.0.1:5000**
- **POST `/verify_helmet`** — JSON body: `{ "image": "<base64 jpeg>", "face_box"?: { "x","y","width","height" } }` (normalized 0–1)
- Returns: `helmet`, `vest`, `detections`, `status`

If port 5000 is busy:

```bash
fuser -k 5000/tcp   # Linux; or stop the other process
```

### 2. React dashboard (Vite)

```bash
npm run dev
```

Open the URL Vite prints (often **http://localhost:5173**). Tier 1 calls the PPE server at `http://localhost:5000` (CORS is enabled on Flask).

### 3. Train / refresh `best.pt`

```bash
source training_env/bin/activate
python run_ppe_train.py
```

Weights are written under `ppe_training/yolov11_ppe/weights/` (`best.pt`, `last.pt`). Restart `ppe_server.py` after replacing weights.

Optional:

```bash
bash scripts/run_ppe_training.sh   # runs train_ppe_v2.py via training_env
```

## Notes

- **`training_env/`**, **`.venv/`**, **`node_modules/`**, large datasets, and run artifacts are usually excluded from version control; keep them local.
- Place or train **YOLO weights** at `ppe_training/yolov11_ppe/weights/best.pt` (or set `PPE_MODEL_PATH`).
- **Face models** must exist under `public/models/` for Tier 1 face registration and matching.
- **Webcam + localhost**: use HTTPS or `localhost` as required by the browser for `getUserMedia`.
- Dataset layout is defined in `safety-Helmet-Reflective-Jacket/data.yaml` (classes: `Safety-Helmet`, `Reflective-Jacket`).

## Build for production

```bash
npm run build
npm run preview    # optional local preview of dist/
```

Serve `dist/` behind your HTTP server; you will still need **`ppe_server.py`** (or a production WSGI deployment) reachable from the client for live PPE checks unless you change Tier 1 to a different API URL.
