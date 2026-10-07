import hashlib
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
    
    element_copy = BeautifulSoup(str(element), "html.parser")
    for br in element_copy.find_all("br"):
        br.replace_with(" ")
        
    text = element_copy.get_text()
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

def generate_coin_id(country: str, year: int, title: str) -> str:
    """Genera un ID deterministico univoco SHA-256 per garantire che non cambi mai nelle future esecuzioni."""
    raw_key = f"{country.strip().lower()}_{year}_{title.strip().lower()}"
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()[:12]

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
                
                if len(cols) >= 4:
                    has_img_col = bool(cols[0].find("img") or cols[0].has_attr("rowspan"))
                    common_img_url = extract_image_url(cols[0]) if has_img_col else ""
                    offset = 1 if has_img_col else 0

                    raw_country_text = clean_element_text(cols[offset])
                    
                    # VERIFICA EMISSIONE CONGIUNTA / UNIONE EUROPEA
                    if "unione europea" in raw_country_text.lower() or "ue" == raw_country_text.lower():
                        common_theme = clean_element_text(cols[offset + 1])
                        
                        # Estrai Data emissione e Disegnatore se presenti nelle colonne con rowspan
                        common_issue_date = clean_element_text(cols[offset + 3]) if len(cols) > offset + 3 else ""
                        common_designer = clean_element_text(cols[offset + 4]) if len(cols) > offset + 4 else ""

                        # La riga successiva di solito contiene la Descrizione comune
                        common_description = ""
                        if i + 1 < len(rows):
                            next_row = rows[i + 1]
                            next_cols = next_row.select("td")
                            if len(next_cols) >= 1 and "Descrizione:" in next_row.get_text():
                                common_description = clean_element_text(next_cols[0])
                                common_description = re.sub(r'^Descrizione:\s*', '', common_description, flags=re.IGNORECASE)
                                i += 1 # Salta la riga della descrizione

                        # Ora scorriamo le sottorighe dei singoli paesi partecipanti
                        i += 1
                        while i < len(rows):
                            sub_row = rows[i]
                            sub_cols = sub_row.select("td")
                            
                            # Se incontriamo una nuova moneta standard o una tabella nuova, interrompiamo
                            if not sub_cols or len(sub_cols) < 3 or "Descrizione:" in sub_row.get_text():
                                break

                            # Le sottorighe dei paesi nell'emissione comune hanno: [Immagine Paese, Paese, Iscrizioni locali, Tiratura]
                            sub_img_col = sub_cols[0] if sub_cols[0].find("img") else None
                            country_img_url = extract_image_url(sub_img_col) if sub_img_col else common_img_url

                            sub_country_idx = 1 if sub_img_col else 0
                            if len(sub_cols) <= sub_country_idx:
                                i += 1
                                continue

                            country_name_text = clean_element_text(sub_cols[sub_country_idx])
                            sub_country_code = detect_country(country_name_text)

                            # Se non riusciamo a rilevare un paese valido, siamo usciti dal blocco congiunto
                            if not sub_country_code:
                                break

                            # Dettagli specifici del paese
                            local_inscriptions = clean_element_text(sub_cols[sub_country_idx + 1]) if len(sub_cols) > sub_country_idx + 1 else ""
                            raw_mintage = clean_element_text(sub_cols[sub_country_idx + 2]) if len(sub_cols) > sub_country_idx + 2 else ""
                            mintage = parse_mintage(raw_mintage)

                            title = f"{common_theme}"
                            if local_inscriptions and len(local_inscriptions) < 100:
                                title += f" ({local_inscriptions})"

                            is_future = year > CURRENT_YEAR
                            has_mintage = mintage > 0
                            status = "announced" if (is_future or (year == CURRENT_YEAR and not has_mintage)) else "issued"

                            coin_id = generate_coin_id(sub_country_code, year, title)

                            coins.append({
                                "id": coin_id,
                                "country": sub_country_code,
                                "year": year,
                                "denomination": "2.00",
                                "type": "commemorative",
                                "status": status,
                                "title": title[:150],
                                "mint_mark": "",
                                "mintage": mintage,
                                "issue_date": common_issue_date,
                                "designer": common_designer,
                                "description": common_description,
                                "image_url": country_img_url or common_img_url,
                                "variants": []
                            })

                            i += 1
                        continue # Continua il ciclo principale per le prossime tabelle/monete

                    # EMISSIONE SINGOLA STANDARD
                    else:
                        if len(cols) > offset + 3:
                            raw_theme = clean_element_text(cols[offset + 1])
                            raw_mintage = clean_element_text(cols[offset + 2])
                            raw_issue_date = clean_element_text(cols[offset + 3])
                            raw_designer = clean_element_text(cols[offset + 4]) if len(cols) > offset + 4 else ""

                            country_code = detect_country(raw_country_text)
                            if not country_code:
                                country_code = detect_country(row.get_text()) or "EU"

                            mintage = parse_mintage(raw_mintage)
                            
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

                            coin_id = generate_coin_id(country_code, year, raw_theme)

                            coins.append({
                                "id": coin_id,
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
                                "image_url": common_img_url,
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

    for coin in raw_coins:
        if coin["id"] not in seen:
            seen.add(coin["id"])
            final_coins.append(coin)

    if final_coins:
        output_path = "public/catalog.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_coins, f, ensure_ascii=False, indent=2)
        print(f"\nCOMPLETATO: Salvate {len(final_coins)} monete con ID deterministici e gestione delle emissioni congiunte in '{output_path}'!")
    else:
        print("ATTENZIONE: Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
