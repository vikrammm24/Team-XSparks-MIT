#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec ./training_env/bin/python train_ppe_v2.py
