"""
ingrandisci-fermi.py — ingrandisce con l'AI i soli fotogrammi che vengono
ingranditi davvero: i dodici fermi-immagine dei raccordi.

Perche' solo dodici: il film si vede a grandezza naturale, e li' la qualita'
non dipende dal WebP ma dalla compressione H.264 della clip sorgente
(misurato: q62 e q82 indistinguibili a 3x). I raccordi invece zoomano fino a
2,6x su un fermo immagine — li' un modello che RICOSTRUISCE il dettaglio
cambia le cose davvero, mentre ricodificare non serve a niente.

Modello: Real-ESRGAN x4plus (fp16, ONNX). Gira su CPU perche' su questa
macchina Vulkan non si inizializza (Radeon 520 con driver del 2019):
vkEnumeratePhysicalDevices fallisce, quindi realesrgan-ncnn-vulkan e
QualityScaler non partono proprio.

Uscita: gli stessi fotogrammi a 2560 px di larghezza (2x dell'originale,
non 4x: oltre non serve, il raccordo piu' stretto e' 2,6x). Lo shader legge
la dimensione vera della texture, quindi li usa senza modifiche.

Uso: python lab/ingrandisci-fermi.py [--prova]
"""
import json
import os
import sys
import time

import cv2
import numpy as np
import onnxruntime as ort

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELLO = os.path.join(
    os.environ.get("TEMP", "."),
    "claude", "c--Users-loren-Desktop-lorenzovault",
    "abd719fa-82f6-4586-b07e-b97106f24782", "scratchpad", "resrgan-x4.onnx",
)
FILM = os.path.join(RADICE, "public", "frames", "film")
ARCHIVIO = os.path.join(RADICE, "_sorgenti", "fermi-prima-dell-ingrandimento")
TASSELLO = 480          # lato del tassello: pochi tasselli grandi rendono molto piu di tanti piccoli su CPU
BORDO = 24              # sovrapposizione, per non lasciare cuciture
LARGHEZZA_FINALE = 2560

os.makedirs(ARCHIVIO, exist_ok=True)


def fermi_dei_raccordi():
    with open(os.path.join(RADICE, "public", "dati", "ponti.json"), encoding="utf-8") as f:
        ponti = json.load(f)["ponti"]
    numeri = sorted({p["frameA"] for p in ponti} | {p["frameB"] for p in ponti})
    return numeri


def ingrandisci(sessione, img):
    """4x a tasselli sovrapposti: la memoria resta bassa e non si vedono giunzioni."""
    ingresso = sessione.get_inputs()[0].name
    h, w = img.shape[:2]
    fuori = np.zeros((h * 4, w * 4, 3), dtype=np.float32)
    pesi = np.zeros((h * 4, w * 4, 1), dtype=np.float32)

    y = 0
    while y < h:
        x = 0
        while x < w:
            y0, x0 = max(0, y - BORDO), max(0, x - BORDO)
            y1, x1 = min(h, y + TASSELLO + BORDO), min(w, x + TASSELLO + BORDO)
            tass = img[y0:y1, x0:x1, :]
            dato = np.transpose(tass, (2, 0, 1))[None, ...].astype(np.float32)
            res = sessione.run(None, {ingresso: dato})[0]
            res = np.transpose(res[0], (1, 2, 0))
            # finestra di fusione morbida sui bordi del tassello
            th, tw = res.shape[:2]
            maschera = np.ones((th, tw, 1), dtype=np.float32)
            sfuma = BORDO * 4
            if sfuma > 0:
                rampa = np.linspace(0.0, 1.0, sfuma, dtype=np.float32)
                if y0 > 0:
                    maschera[:sfuma, :, 0] *= rampa[:, None]
                if x0 > 0:
                    maschera[:, :sfuma, 0] *= rampa[None, :]
                if y1 < h:
                    maschera[-sfuma:, :, 0] *= rampa[::-1, None]
                if x1 < w:
                    maschera[:, -sfuma:, 0] *= rampa[None, ::-1]
            fuori[y0 * 4:y1 * 4, x0 * 4:x1 * 4, :] += res * maschera
            pesi[y0 * 4:y1 * 4, x0 * 4:x1 * 4, :] += maschera
            x += TASSELLO
        y += TASSELLO

    return np.clip(fuori / np.maximum(pesi, 1e-6), 0.0, 1.0)


def main():
    prova = "--prova" in sys.argv
    if not os.path.exists(MODELLO):
        print("modello non trovato:", MODELLO)
        return 1

    opzioni = ort.SessionOptions()
    opzioni.intra_op_num_threads = os.cpu_count() or 4
    opzioni.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sessione = ort.InferenceSession(MODELLO, sess_options=opzioni, providers=["CPUExecutionProvider"])
    numeri = fermi_dei_raccordi()
    if prova:
        numeri = numeri[:1]
    print(f"{len(numeri)} fermi da ingrandire | modello Real-ESRGAN x4plus su CPU")

    for n in numeri:
        nome = f"{n:04d}.webp"
        percorso = os.path.join(FILM, nome)
        if not os.path.exists(percorso):
            print(f"  {nome}: assente, saltato")
            continue

        avvio = time.time()
        img = cv2.imread(percorso, cv2.IMREAD_COLOR)
        if img.shape[1] >= LARGHEZZA_FINALE:
            print(f"  {nome}: gia a {img.shape[1]} px, saltato")
            continue
        prima_kb = os.path.getsize(percorso) // 1024
        if not os.path.exists(os.path.join(ARCHIVIO, nome)):
            cv2.imwrite(os.path.join(ARCHIVIO, nome), img, [cv2.IMWRITE_WEBP_QUALITY, 95])

        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        grande = ingrandisci(sessione, rgb)

        alt = int(round(LARGHEZZA_FINALE * grande.shape[0] / grande.shape[1]))
        finale = cv2.resize(grande, (LARGHEZZA_FINALE, alt), interpolation=cv2.INTER_AREA)
        finale = cv2.cvtColor((finale * 255.0).round().astype(np.uint8), cv2.COLOR_RGB2BGR)
        cv2.imwrite(percorso, finale, [cv2.IMWRITE_WEBP_QUALITY, 92])

        dopo_kb = os.path.getsize(percorso) // 1024
        print(f"  {nome}: {img.shape[1]}x{img.shape[0]} -> {LARGHEZZA_FINALE}x{alt} | "
              f"{prima_kb} -> {dopo_kb} KB | {time.time() - avvio:.0f}s", flush=True)

    print("\nfatto. Originali in _sorgenti/fermi-prima-dell-ingrandimento/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
