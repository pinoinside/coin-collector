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

def clean_element_text(element):
    """Sostituisce i tag <br> con uno spazio nell'elemento BS4 prima di estrarne il testo."""
    if not element:
        return ""
    
    # Crea una copia per non alterare distruttivamente altri passaggi se riutilizzati
    element_copy = BeautifulSoup(str(element), "html.parser")
    
    # Sostituisce qualsiasi tag <br> (indipendentemente da id, class o attributi) con uno spazio
    for br in element_copy.find_all("br"):
        br.replace_with(" ")
        
    text = element_copy.get_text()
    
    # Rimuove le note numeriche di Wikipedia tipo [1], [2]
    text = re.sub(r'\[\d+\]', '', text)
    # Pulisce spazi multipli, a capo rimanenti e non-breaking spaces
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

def extract_image_url(cell):
    """Estrae l'URL dell'immagine della moneta dalla cella HTML."""
    if not cell:
        return ""
    img_tag = cell.find("img")
    if not img_tag:
        return ""
    
    src = img_tag.get("src") or img_tag.get("data-src") or ""
    
    if src:
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = BASE_URL + src
            
    return src

def get_yearly_page_urls():
    """Genera gli URL per tutte le pagine annuali dal 2004 ad oggi."""
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

        tables = content.select("table.wikitable")
        for table in tables:
            rows = table.select("tr")
            i = 0
            while i < len(rows):
                row = rows[i]
                cols = row.select("td")
                
                if len(cols) >= 5:
                    has_img_col = bool(cols[0].find("img") or cols[0].has_attr("rowspan"))
                    image_url = extract_image_url(cols[0]) if has_img_col else ""
                    
                    offset = 1 if has_img_col else 0
                    
                    if len(cols) > offset + 3:
                        raw_country = clean_element_text(cols[offset])
                        raw_theme = clean_element_text(cols[offset + 1])
                        raw_mintage = clean_element_text(cols[offset + 2])
                        raw_issue_date = clean_element_text(cols[offset + 3])
                        raw_designer = clean_element_text(cols[offset + 4]) if len(cols) > offset + 4 else ""

                        country_code = detect_country(raw_country)
                        if not country_code:
                            country_code = detect_country(clean_element_text(row)) or "EU"

                        mintage = parse_mintage(raw_mintage)
                        
                        # Recupera la descrizione dalla riga successiva
                        description = ""
                        if i + 1 < len(rows):
                            next_row = rows[i + 1]
                            next_cols = next_row.select("td")
                            if len(next_cols) == 1 and ("Descrizione:" in next_row.get_text() or next_cols[0].has_attr("colspan")):
                                description = clean_element_text(next_cols[0])
                                description = re.sub(r'^Descrizione:\s*', '', description, flags=re.IGNORECASE)
                                i += 1

                        is_future = year > CURRENT_YEAR
                        is_announced_kw = any(kw in clean_element_text(row).lower() for kw in ["annunciata", "in emissione", "da emettere", "tba", "da definire"])
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
                            "image_url": image_url,
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
        print(f"\nCOMPLETATO: Salvate {len(final_coins)} monete in '{output_path}'!")
    else:
        print("ATTENZIONE: Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
