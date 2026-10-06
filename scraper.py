import json
import os
import re
from datetime import datetime
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

CURRENT_YEAR = datetime.now().year
BASE_URL = "https://it.wikipedia.org"

# Mappatura completa dei paesi (Italiano/Inglese/Nomi comuni -> ISO)
COUNTRY_MAP = {
    "andorra": "AD", "austria": "AT", "belgio": "BE", "belgium": "BE",
    "cipro": "CY", "cyprus": "CY", "estonia": "EE", "finlandia": "FI", "finland": "FI",
    "francia": "FR", "france": "FR", "germania": "DE", "germany": "DE",
    "grecia": "GR", "greece": "GR", "irlanda": "IE", "ireland": "IE",
    "italia": "IT", "italy": "IT", "lettonia": "LV", "latvia": "LV",
    "lituania": "LT", "lithuania": "LT", "lussemburgo": "LU", "luxembourg": "LU",
    "malta": "MT", "monaco": "MC", "paesi bassi": "NL", "olanda": "NL", "netherlands": "NL",
    "portogallo": "PT", "portugal": "PT", "san marino": "SM", "slovacchia": "SK", "slovakia": "SK",
    "slovenia": "SI", "spagna": "ES", "spain": "ES", "vaticano": "VA", "città del vaticano": "VA", "vatican": "VA"
}

def clean_text(text):
    if not text:
        return ""
    return " ".join(text.strip().split())

def detect_country(text):
    """Identifica il codice ISO del paese da una stringa di testo."""
    if not text:
        return None
    text_lower = text.lower()
    
    for name, code in COUNTRY_MAP.items():
        if re.search(r'\b' + re.escape(name) + r'\b', text_lower):
            return code
    return None

def get_yearly_page_urls():
    """Recupera i link alle pagine dei singoli anni da Wikipedia o li genera dinamicamente."""
    main_url = f"{BASE_URL}/wiki/2_euro_commemorativi"
    print(f"Tentativo di recupero indice anni da {main_url}...")
    urls = []
    
    try:
        res = requests.get(main_url, headers=HEADERS, timeout=15)
        if res.status_code == 200:
            soup = BeautifulSoup(res.content, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "2_euro_commemorativi_emessi_nel_" in href:
                    full_url = BASE_URL + href if href.startswith("/") else href
                    if full_url not in urls:
                        urls.append(full_url)
    except Exception as e:
        print(f"Avviso: Impossibile scaricare l'indice principale ({e}). Passo alla generazione dinamica degli URL.")

    # FALLBACK: Se l'indice non restituisce URL, li generiamo col pattern corretto "emessi_nel_"
    if not urls:
        print("Generazione dinamica degli URL con il pattern 'emessi_nel_'...")
        for yr in range(2004, CURRENT_YEAR + 2):
            urls.append(f"{BASE_URL}/wiki/2_euro_commemorativi_emessi_nel_{yr}")

    return sorted(list(set(urls)))

def scrape_year_page(url):
    """Estrae le monete da una specifica sotto-pagina annuale."""
    year_match = re.search(r'\d{4}', url)
    year = int(year_match.group(0)) if year_match else CURRENT_YEAR
    
    print(f"Scraping anno {year} [{url}]...")
    
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            print(f"Pagina per l'anno {year} non trovata o non disponibile (HTTP {res.status_code}).")
            return []
            
        soup = BeautifulSoup(res.content, "html.parser")
        content = soup.select_one("#mw-content-text .mw-parser-output")
        if not content:
            return []

        coins = []
        current_country = None

        for elem in content.find_all(["h2", "h3", "h4", "table"]):
            if elem.name in ["h2", "h3", "h4"]:
                header_text = elem.get_text()
                detected = detect_country(header_text)
                if detected:
                    current_country = detected

            elif elem.name == "table" and "wikitable" in elem.get("class", []):
                rows = elem.select("tr")
                for row in rows:
                    cols = row.select("td, th")
                    if len(cols) < 2:
                        continue
                    
                    row_text = clean_text(row.get_text())
                    
                    # Salta le righe di intestazione
                    if "Soggetto" in row_text or "Paese" in row_text or "Tiratura" in row_text:
                        continue

                    # Determina il Paese
                    row_country = detect_country(row_text)
                    coin_country = row_country if row_country else current_country
                    if not coin_country:
                        coin_country = "EU"

                    # Estrai Titolo / Descrizione
                    title = ""
                    for col in cols:
                        cell_text = clean_text(col.get_text())
                        cell_text = re.sub(r'\[\d+\]', '', cell_text)
                        
                        if len(cell_text) > 8 and not cell_text.isdigit() and "euro" not in cell_text.lower():
                            if detect_country(cell_text) and len(cell_text) < 25:
                                continue
                            title = cell_text
                            break

                    if not title:
                        title = f"2€ Commemorativo {coin_country} {year}"

                    # Estrai Tiratura (Mintage)
                    mintage = 0
                    numbers = re.findall(r'\b\d{1,3}(?:\.\d{3})+|\b\d{5,8}\b', row_text)
                    if numbers:
                        clean_num = re.sub(r'[^\d]', '', numbers[0])
                        if
