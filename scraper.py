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

# Mappatura dei paesi (Italiano / Nomi comuni -> ISO 3166-1 alpha-2)
COUNTRY_MAP = {
    "andorra": "AD", "austria": "AT", "belgio": "BE", "belgium": "BE",
    "cipro": "CY", "cyprus": "CY", "croazia": "HR", "croatia": "HR",
    "estonia": "EE", "finlandia": "FI", "finland": "FI",
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
    # Rimuove note tipo [1], [2] e spazi multipli/non-breaking
    text = re.sub(r'\[\d+\]', '', text)
    return " ".join(text.replace('\xa0', ' ').strip().split())

def detect_country(text):
    """Identifica il codice ISO del paese dal testo."""
    if not text:
        return None
    text_lower = text.lower()
    for name, code in COUNTRY_MAP.items():
        if re.search(r'\b' + re.escape(name) + r'\b', text_lower):
            return code
    return None

def parse_mintage(text):
    """Converte stringhe come '35 000 000' o '35.000.000' in un intero."""
    if not text:
        return 0
    clean_num = re.sub(r'[^\d]', '', text)
    return int(clean_num) if clean_num else 0

def get_yearly_page_urls():
    """Genera gli URL per tutte le pagine annuali dal 2004 al futuro."""
    urls = []
    main_url = f"{BASE_URL}/wiki/2_euro_commemorativi"
    
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
        print(f"Avviso durante il recupero dell'indice: {e}")

    # Fallback deterministico
    if not urls:
        for yr in range(2004, CURRENT_YEAR + 2):
            urls.append(f"{BASE_URL}/wiki/2_euro_commemorativi_emessi_nel_{yr}")

    return sorted(list(set(urls)))

def scrape_year_page(url):
    year_match = re.search(r'\d{4}', url)
    year = int(year_match.group(0)) if year_match else CURRENT_YEAR
    
    print(f"Scraping anno {year} [{url}]...")
    
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code != 200:
            return []
            
        soup = BeautifulSoup(res.content, "html.parser")
        content = soup.select_one("#mw-content-text .mw-parser-output")
        if not content:
            return []

        coins = []

        # Troviamo tutte le tabelle "wikitable"
        tables = content.select("table.wikitable")
        for table in tables:
            rows = table.select("tr")
            i = 0
            while i < len(rows):
                row = rows[i]
                cols = row.select("td")
                
                # Una riga principale valida ha almeno 5 celle (Immagine, Paese, Tema, Tiratura, Emissione, [Disegnatore])
                if len(cols) >= 5:
                    # Se la prima colonna ha l'immagine (o rowspan), analizziamo i campi per posizione
                    first_col_text = clean_text(cols[0].get_text())
                    
                    # Se la prima cella è l'immagine, spostiamo gli indici di 1
                    offset = 1 if (cols[0].find("img") or cols[0].has_attr("rowspan")) else 0
                    
                    if len(cols) > offset + 3:
                        raw_country = clean_text(cols[offset].get_text())
                        raw_theme = clean_text(cols[offset + 1].get_text())
                        raw_mintage = clean_text(cols[offset + 2].get_text())
                        raw_issue_date = clean_text(cols[offset + 3].get_text())
                        raw_designer = clean_text(cols[offset + 4].get_text()) if len(cols) > offset + 4 else ""

                        country_code = detect_country(raw_country)
                        if not country_code:
                            # Tentativo di recupero se il testo contiene altro
                            country_code = detect_country(row.get_text()) or "EU"

                        mintage = parse_mintage(raw_mintage)
                        
                        # Cerca se la riga SUCCESSIVA contiene la descrizione
                        description = ""
                        if i + 1 < len(rows):
                            next_row = rows[i + 1]
                            next_cols = next_row.select("td")
                            # La riga della descrizione di solito ha 1 sola colonna con colspan
                            if len(next_cols) == 1 and ("Descrizione:" in next_row.get_text() or next_cols[0].has_attr("colspan")):
                                description = clean_text(next_row.get_text())
                                # Rimuovi il prefisso "Descrizione:" se presente
                                description = re.sub(r'^Descrizione:\s*', '', description, flags=re.IGNORECASE)
                                i += 1 # Saltiamo la riga della descrizione al prossimo ciclo

                        # Calcolo dello stato
                        is_future = year > CURRENT_YEAR
                        is_announced_kw = any(kw in row.get_text().lower() for kw in ["annunciata", "in emissione", "da emettere", "tba", "da definire"])
                        has_mintage = mintage > 0

                        status = "announced" if (is_future or is_announced_kw or (year == CURRENT_YEAR and not has_mintage)) else "issued"

                        coins.append({
                            "country": country_code,
                            "year": year,
                            "denomination": "2.00",
                            "type": "commemorative",
                            "status": status,
                            "title": raw_theme[:150],
                            "mint_mark": "",
                            "mintage": mintage,
                            "issue_date": raw_issue_date,
                            "designer": raw_designer,
                            "description": description,
                            "image_url": "",
                            "variants": []
                        })
                i += 1

        return coins

    except Exception as e:
        print(f"Errore nello scraping di {url}: {e}")
        return []

def main():
    os.makedirs("public", exist_ok=True)
    yearly_urls = get_yearly_page_urls()
    print(f"Analisi di {len(yearly_urls)} pagine annuali...")

    raw_coins = []
    for url in yearly_urls:
        coins = scrape_year_page(url)
        raw_coins.extend(coins)

    # Rimuovi duplicati e assegna ID progressivi (1, 2, 3...)
    final_coins = []
    seen = set()
    current_id = 1

    for coin in raw_coins:
        identifier = (coin["country"], coin["year"], coin["title"].lower())
        if identifier not in seen:
            seen.add(identifier)
            coin["id"] = str(current_id)
            current_id += 1
            final_coins.append(coin)

    if final_coins:
        output_path = "public/catalog.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_coins, f, ensure_ascii=False, indent=2)
        print(f"\nCOMPLETATO: Salvate {len(final_coins)} monete con ID progressivo (1-{len(final_coins)}) in '{output_path}'!")
    else:
        print("ATTENZIONE: Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
