"""prova-ponte.py — mostra l'apice di un raccordo prima di aprire il browser.

Rifa' esattamente il conto dello shader:
    s = (p - 0.5 - pan) * zoom + 0.5          (sample() in src/shader.js)
    pan = clamp(ancora - 0.5, +/- ((1 - 1/zoom)*0.5 - 0.002))
e salva tre immagini: il lato A all'apice, il lato B all'apice, e i due
fusi al 50%. Se nella terza i due soggetti non stanno nello stesso punto,
il raccordo non tiene — e si vede qui, non dopo un build.

Uso: python lab/prova-ponte.py <id-ponte> [z-max]
"""
import json
import os
import sys

import cv2
import numpy as np

RAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILM = os.path.join(RAD, "public", "frames", "film")
USCITA = os.path.join(RAD, "lab", "guerriero")
LARG, ALT = 1280, 720


def inquadra(percorso, ancora, z, zmax):
    """Ritaglia come lo shader, alla scala piena del raccordo."""
    img = cv2.imread(percorso)
    h, w = img.shape[:2]
    z = min(z, zmax)
    maxpan = max(0.0, (1 - 1 / z) * 0.5 - 0.002)
    pan = [float(np.clip(ancora[0] - 0.5, -maxpan, maxpan)),
           float(np.clip((1 - ancora[1]) - 0.5, -maxpan, maxpan))]
    # dallo schermo alla sorgente: p = (s - 0.5)/z + 0.5 + pan
    xs = (np.linspace(0, 1, LARG) - 0.5) / z + 0.5 + pan[0]
    # la riga 0 dello schermo e' uv_y = 1: lo shader ha y verso l'alto
    ys_up = ((1 - np.linspace(0, 1, ALT)) - 0.5) / z + 0.5 + pan[1]
    ys = 1 - ys_up                      # e si torna in riga d'immagine
    mx = np.clip(xs * w, 0, w - 1).astype(np.float32)
    my = np.clip(ys * h, 0, h - 1).astype(np.float32)
    mapx = np.tile(mx, (ALT, 1))
    mapy = np.tile(my[:, None], (1, LARG))
    return cv2.remap(img, mapx, mapy, cv2.INTER_LANCZOS4)


def main():
    quale = sys.argv[1] if len(sys.argv) > 1 else "enotro-nave"
    zmax = float(sys.argv[2]) if len(sys.argv) > 2 else 2.568
    ponti = json.load(open(os.path.join(RAD, "public", "dati", "ponti.json"), encoding="utf-8"))["ponti"]
    p = next((x for x in ponti if x["id"] == quale), None)
    if p is None:
        print("raccordo non trovato:", quale)
        return 1

    a = inquadra(os.path.join(FILM, f"{p['frameA']:04d}.webp"), (p["A"]["px"], p["A"]["py"]), p["A"]["z"], zmax)
    b = inquadra(os.path.join(FILM, f"{p['frameB']:04d}.webp"), (p["B"]["px"], p["B"]["py"]), p["B"]["z"], zmax)
    fuso = cv2.addWeighted(a, 0.5, b, 0.5, 0)

    for nome, im in (("A", a), ("B", b), ("fuso", fuso)):
        via = os.path.join(USCITA, f"apice-{quale}-{nome}.png")
        cv2.imwrite(via, im)
        print(" ", os.path.relpath(via, RAD))
    print(f"\n{quale}: A z={min(p['A']['z'], zmax):.2f} su {p['frameA']:04d} · "
          f"B z={min(p['B']['z'], zmax):.2f} su {p['frameB']:04d}  (tetto {zmax})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
