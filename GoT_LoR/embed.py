"""
embed.py — compute sentence embeddings + UMAP for items.json

Install deps:
    pip install sentence-transformers umap-learn

Run:
    python embed.py

Outputs:
    data_embedded.json  (items.json + x, y coordinates appended)
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer
import umap

INPUT  = "items.json"
OUTPUT = "data_embedded.json"
MODEL  = "all-MiniLM-L6-v2"

items = json.load(open(INPUT))
texts = [f"{item['archetype']}. {item['text']}" for item in items]

print(f"Loading model: {MODEL}")
model = SentenceTransformer(MODEL)

print(f"Encoding {len(texts)} characters...")
embeddings = model.encode(texts, show_progress_bar=True)

print("Running UMAP...")
reducer = umap.UMAP(
    n_components=2,
    n_neighbors=8,
    min_dist=0.3,
    metric="cosine",
    random_state=42,
)
coords = reducer.fit_transform(embeddings)

for i, item in enumerate(items):
    item["x"] = float(coords[i][0])
    item["y"] = float(coords[i][1])

json.dump(items, open(OUTPUT, "w"), indent=2)
print(f"Done. Written to {OUTPUT}")
