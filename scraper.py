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
    
    # Cerca corrispondenze esatte delle parole chiave dei paesi
    for name, code in COUNTRY_MAP.items():
        # Match di parola intera per evitare falsi positivi
        if re.search(r'\b' + re.escape(name) + r'\b', text_lower):
            return code
    return None

def scrape_wikipedia_commemoratives():
    url = "https://it.wikipedia.org/wiki/2_euro_commemorativi"
    print(f"Scraping in corso da: {url}...")
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        coins = []
        
        # Cerchiamo sia i titoli delle sezioni (per capire il paese) che le tabelle
        content = soup.select_one("#mw-content-text .mw-parser-output")
        if not content:
            print("Errore: Impossibile trovare il contenuto principale della pagina.")
            return []

        current_country = "IT" # Default
        
        # Scorriamo gli elementi del DOM (Intestazioni h2/h3 e tabelle)
        for elem in content.find_all(["h2", "h3", "h4", "table"]):
            # Se incontriamo un'intestazione, proviamo a ricavarne il paese
            if elem.name in ["h2", "h3", "h4"]:
                header_text = elem.get_text()
                detected = detect_country(header_text)
                if detected:
                    current_country = detected

            # Se incontriamo una tabella wikitable
            elif elem.name == "table" and "wikitable" in elem.get("class", []):
                rows = elem.select("tr")
                
                for row in rows:
                    cols = row.select("td, th")
                    if not cols or len(cols) < 2:
                        continue
                    
                    row_text = clean_text(row.get_text())
                    
                    # 1. Trova l'Anno
                    year_match = re.search(r'\b(200[4-9]|20[1-2][0-9])\b', row_text)
                    if not year_match:
                        continue
                    year = int(year_match.group(1))

                    # 2. Verifica/Raffina il Paese dalla riga (se presente esplicitamente)
                    row_country = detect_country(row_text)
                    coin_country = row_country if row_country else current_country

                    # 3. Estrai Titolo / Motivo
                    title = ""
                    for col in cols:
                        cell_text = clean_text(col.get_text())
                        # Ignoriamo celle corte, solo numeri o date
                        if len(cell_text) > 8 and not cell_text.isdigit() and "euro" not in cell_text.lower():
                            # Rimuovi eventuali note tipo [1], [2]
                            cell_text = re.sub(r'\[\d+\]', '', cell_text)
                            title = cell_text
                            break
                    
                    if not title:
                        title = f"2€ Commemorativo {coin_country} {year}"

                    # 4. Estrai Tiratura (Mintage)
                    mintage = 0
                    numbers = re.findall(r'\b\d{1,3}(?:\.\d{3})+|\b\d{5,8}\b', row_text)
                    if numbers:
                        clean_num = re.sub(r'[^\d]', '', numbers[0])
                        if clean_num:
                            mintage = int(clean_num)

                    # 5. FLAG EMESSA VS ANNUNCIATA
                    # Una moneta è considerata "annunciata" se l'anno è futuro o se è segnata come da emettere
                    is_future = year > CURRENT_YEAR
                    has_mintage = mintage > 0
                    is_announced_keyword = any(kw in row_text.lower() for kw in ["annunciata", "in emissione", "da emettere", "tba", "da definire"])
                    
                    status = "announced" if (is_future or is_announced_keyword or (year == CURRENT_YEAR and not has_mintage)) else "issued"

                    # 6. ID Unico Deterministico
                    slug = re.sub(r'[^a-zA-Z0-9]', '', title)[:10].upper()
                    coin_id = f"EU-{coin_country}-{year}-2E-{slug}"

                    # Aggiungi se non è un duplicato esatto
                    if not any(c["id"] == coin_id for c in coins):
                        coins.append({
                            "id": coin_id,
                            "country": coin_country,
                            "year": year,
                            "denomination": "2.00",
                            "type": "commemorative",
                            "status": status, # "issued" oppure "announced"
                            "title": title[:120],
                            "mint_mark": "",
                            "mintage": mintage,
                            "designer": "",
                            "image_url": "",
                            "variants": []
                        })

        print(f"Estratte con successo {len(coins)} monete commmorative!")
        return coins

    except Exception as e:
        print(f"Errore durante lo scraping: {e}")
        return []

def main():
    os.makedirs("public", exist_ok=True)
    coins = scrape_wikipedia_commemoratives()
    
    if coins:
        output_path = "public/catalog.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(coins, f, ensure_ascii=False, indent=2)
        print(f"SUCCESS: Catalogo salvato in '{output_path}' con {len(coins)} monete!")
    else:
        print("ATTENZIONE: Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
