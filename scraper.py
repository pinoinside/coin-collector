import hashlib
import json
import os
import re
import time
import unicodedata
from datetime import datetime
import requests
from bs4 import BeautifulSoup

# Wikimedia richiede un User-Agent identificativo chiaro
HEADERS = {
    "User-Agent": "CoinCollectorBot/1.0 (https://github.com/pinoinside/coin-collector; educational-bot@example.com)"
}

CURRENT_YEAR = datetime.now().year
BASE_URL = "https://it.wikipedia.org"
IMAGES_DIR = "public/images"

def download_and_save_image(remote_url: str, coin_id: str, max_retries: int = 3) -> str:
    """
    Scarica l'immagine dall'URL remoto gestendo il rate-limiting (429) con retry ed un ritardo.
    Restituisce il percorso relativo locale (es. 'images/abc123456789.png').
    """
    if not remote_url:
        return ""
    
    os.makedirs(IMAGES_DIR, exist_ok=True)

    ext = ".jpg"
    clean_url = remote_url.split('?')[0].lower()
    if clean_url.endswith('.png'):
        ext = ".png"
    elif clean_url.endswith('.webp'):
        ext = ".webp"
    elif clean_url.endswith('.svg'):
        ext = ".svg"

    filename = f"{coin_id}{ext}"
    local_path = os.path.join(IMAGES_DIR, filename)
    relative_url = f"images/{filename}"

    # Se l'immagine esiste già ed è valida, saltiamo il download
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return relative_url

    backoff = 2
    for attempt in range(max_retries):
        try:
            # Piccola pausa prima di ogni download per non saturare il server
            time.sleep(0.3)
            
            res = requests.get(remote_url, headers=HEADERS, timeout=12)
            
            if res.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(res.content)
                return relative_url
            
            elif res.status_code == 429:
                print(f"  [!] Rate limit (429) per {coin_id}. Attesa di {backoff}s prima di riprovare (tentativo {attempt+1}/{max_retries})...")
                time.sleep(backoff)
                backoff *= 2 # Esponenziale
            else:
                print(f"  [!] Errore HTTP {res.status_code} scaricando immagine per {coin_id}")
                break
        except Exception as e:
            print(f"  [!] Eccezione per {coin_id}: {e}")
            time.sleep(backoff)
            backoff *= 2

    return ""
