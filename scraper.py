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

# Mappatura completa e pulita dei paesi dell'Eurozona
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
    return " ".join(text.strip().split())

def detect_country(text):
    """Riconosce il codice ISO a 2 lettere dal testo del Paese o dell'intestazione."""
    if not text:
        return None
    text_lower = text.lower()
    for name, code in COUNTRY_MAP.items():
        if re.search(r'\b' + re.escape(name) + r'\b', text_lower):
            return code
    return None

def get_yearly_page_urls():
    """Genera ed esplora gli URL per tutti gli anni dal 2004 ad oggi."""
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

    # Fallback per garantire che tutti gli anni vengano scansionati
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
        current_country = None

        # Scorriamo il DOM per catturare il Paese dalle sezioni h2/h3/h4 o dalle tabelle
        for elem in content.find_all(["h2", "h3", "h4", "table"]):
            if elem.name in ["h2", "h3", "h4"]:
                detected = detect_country(elem.get_text())
                if detected:
                    current_country = detected

            elif elem.name == "table" and "wikitable" in elem.get("class", []):
                rows = elem.select("tr")
                for row in rows:
                    cols = row.select("td, th")
                    if len(cols) < 2:
                        continue
                    
                    row_text = clean_text(row.get_text())
                    
                    # Salta righe di intestazione della tabella
                    if any(header in row_text for header in ["Soggetto", "Tiratura", "Data di emissione", "Immagine"]):
                        continue

                    # 1. Identificazione Paese
                    row_country = detect_country(row_text)
                    coin_country = row_country if row_country else current_country
                    if not coin_country:
                        # Se ancora non trovato, cerca nella prima/seconda colonna
                        for col in cols[:2]:
                            found = detect_country(col.get_text())
                            if found:
                                coin_country = found
                                break
                    
                    if not coin_country:
                        coin_country = "EU"

                    # 2. Estrazione Titolo
                    title = ""
                    # Cerca prima link o testo significativo nelle colonne
                    for col in cols:
                        # Se la colonna contiene un link interno, spesso è il soggetto
                        a_tag = col.find("a")
                        if a_tag and a_tag.get_text():
                            candidate = clean_text(a_tag.get_text())
                            candidate = re.sub(r'\[\d+\]', '', candidate)
                            if len(candidate) > 3 and not candidate.isdigit() and not detect_country(candidate):
                                title = candidate
                                break

                    # Se non trovato tramite link, estrai dal testo puro della riga
                    if not title:
                        for col in cols:
                            cell_text = clean_text(col.get_text())
                            cell_text = re.sub(r'\[\d+\]', '', cell_text)
                            if len(cell_text) > 4 and not cell_text.isdigit() and "euro" not in cell_text.lower():
                                if not detect_country(cell_text):
                                    title = cell_text
                                    break

                    # Fallback estremo per il titolo
                    if not title:
                        title = f"2€ Commemorativo {coin_country} {year}"

                    # 3. Estrazione Tiratura
                    mintage = 0
                    numbers = re.findall(r'\b\d{1,3}(?:\.\d{3})+|\b\d{5,8}\b', row_text)
                    if numbers:
                        clean_num = re.sub(r'[^\d]', '', numbers[0])
                        if clean_num:
                            mintage = int(clean_num)

                    # 4. Stato (issued vs announced)
                    is_future = year > CURRENT_YEAR
                    is_announced_kw = any(kw in row_text.lower() for kw in ["annunciata", "in emissione", "da emettere", "tba", "da definire"])
                    has_mintage = mintage > 0

                    status = "announced" if (is_future or is_announced_kw or (year == CURRENT_YEAR and not has_mintage)) else "issued"

                    coins.append({
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

    # Rimuovi eventuali duplicati esatti basandoci su (paese, anno, titolo)
    final_coins = []
    seen = set()

    # Assegnazione di ID progressivi (1, 2, 3...)
    current_id = 1

    for coin in raw_coins:
        identifier = (coin["country"], coin["year"], coin["title"].lower())
        if identifier not in seen:
            seen.add(identifier)
            
            # Assegna l'ID numerico come stringa o intero
            coin["id"] = str(current_id)
            current_id += 1
            
            final_coins.append(coin)

    if final_coins:
        output_path = "public/catalog.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_coins, f, ensure_ascii=False, indent=2)
        print(f"\nCOMPLETATO: Salvate {len(final_coins)} monete con ID progressivo da 1 a {len(final_coins)} in '{output_path}'!")
    else:
        print("ATTENZIONE: Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
