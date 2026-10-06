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
    """Recupera i link alle pagine dei singoli anni da Wikipedia."""
    main_url = f"{BASE_URL}/wiki/2_euro_commemorativi"
    print(f"Recupero l'indice degli anni da {main_url}...")
    try:
        res = requests.get(main_url, headers=HEADERS, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.content, "html.parser")
        
        urls = []
        for a in soup.select("a[href*='2_euro_commemorativi_del_']"):
            href = a.get("href")
            # Filtra solo link ad anni validi (es. 2004, 2024, ecc.)
            if re.search(r'2_euro_commemorativi_del_\d{4}', href):
                full_url = BASE_URL + href if href.startswith("/") else href
                if full_url not in urls:
                    urls.append(full_url)
        return sorted(urls)
    except Exception as e:
        print(f"Errore nel recupero indice anni: {e}")
        return []

def scrape_year_page(url):
    """Estrae le monete da una specifica sotto-pagina annuale."""
    # Estrai l'anno dall'URL
    year_match = re.search(r'\d{4}', url)
    year = int(year_match.group(0)) if year_match else CURRENT_YEAR
    
    print(f"Scraping anno {year} da {url}...")
    
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.content, "html.parser")
        
        content = soup.select_one("#mw-content-text .mw-parser-output")
        if not content:
            return []

        coins = []
        current_country = None

        # Cicliamo tra elementi per tracciare i titoli dei paesi e le relative tabelle
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
                    
                    # Salta le righe di intestazione della tabella
                    if "Soggetto" in row_text or "Paese" in row_text or "Tiratura" in row_text:
                        continue

                    # Determina il paese
                    row_country = detect_country(row_text)
                    coin_country = row_country if row_country else current_country
                    if not coin_country:
                        coin_country = "EU" # Fallback estremo se proprio irriconoscibile

                    # Estrai il titolo/motivo della moneta
                    title = ""
                    for col in cols:
                        cell_text = clean_text(col.get_text())
                        # Pulisci note tipo [1], [2]
                        cell_text = re.sub(r'\[\d+\]', '', cell_text)
                        
                        # Cerchiamo una colonna con descrizione significativa
                        if len(cell_text) > 8 and not cell_text.isdigit() and "euro" not in cell_text.lower():
                            # Evitiamo di prendere il nome del paese come titolo
                            if detect_country(cell_text) and len(cell_text) < 25:
                                continue
                            title = cell_text
                            break

                    if not title:
                        title = f"2€ Commemorativo {coin_country} {year}"

                    # Estrai la tiratura (mintage)
                    mintage = 0
                    numbers = re.findall(r'\b\d{1,3}(?:\.\d{3})+|\b\d{5,8}\b', row_text)
                    if numbers:
                        clean_num = re.sub(r'[^\d]', '', numbers[0])
                        if clean_num:
                            mintage = int(clean_num)

                    # Determina lo stato (issued vs announced)
                    is_future = year > CURRENT_YEAR
                    is_announced_kw = any(kw in row_text.lower() for kw in ["annunciata", "in emissione", "da emettere", "tba", "da definire"])
                    has_mintage = mintage > 0

                    status = "announced" if (is_future or is_announced_kw or (year == CURRENT_YEAR and not has_mintage)) else "issued"

                    # Generazione ID deterministico e pulito
                    slug = re.sub(r'[^a-zA-Z0-9]', '', title)[:12].upper()
                    coin_id = f"EU-{coin_country}-{year}-2E-{slug}"

                    if not any(c["id"] == coin_id for c in coins):
                        coins.append({
                            "id": coin_id,
                            "country": coin_country,
                            "year": year,
                            "denomination": "2.00",
                            "type": "commemorative",
                            "status": status,
                            "title": title[:150],
                            "mint_mark": "",
                            "mintage": mintage,
                            "designer": "",
                            "image_url": "",
                            "variants": []
                        })
        return coins
    except Exception as e:
        print(f"Errore nello scraping dell'URL {url}: {e}")
        return []

def main():
    os.makedirs("public", exist_ok=True)
    yearly_urls = get_yearly_page_urls()
    
    if not yearly_urls:
        print("Nessun URL annuale trovato! Verificare la struttura di Wikipedia.")
        return

    all_coins = []
    for url in yearly_urls:
        coins = scrape_year_page(url)
        all_coins.extend(coins)

    # Rimuovi eventuali duplicati di ID globali
    unique_coins = []
    seen_ids = set()
    for coin in all_coins:
        if coin["id"] not in seen_ids:
            seen_ids.add(coin["id"])
            unique_coins.append(coin)

    if unique_coins:
        output_path = "public/catalog.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(unique_coins, f, ensure_ascii=False, indent=2)
        print(f"\nCOMPLETATO: Salvate ben {len(unique_coins)} monete in '{output_path}'!")
    else:
        print("Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
