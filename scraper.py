import hashlib
import json
import os
import re
import time
import unicodedata
from datetime import datetime
import requests
from bs4 import BeautifulSoup

# User-Agent strictly compliant with Wikimedia User-Agent policy
HEADERS = {
    "User-Agent": "EuroCoinCollectorBot/1.0 (https://github.com/pinoinside/coin-collector; contact@example.com)"
}

CURRENT_YEAR = datetime.now().year
BASE_URL = "https://it.wikipedia.org"

# Percorsi aggiornati per Opzione A (Root diretta del progetto, senza sottocartella public)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
CATALOG_PATH = os.path.join(BASE_DIR, "catalog.json")

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
    if not element:
        return ""
    element_copy = BeautifulSoup(str(element), "html.parser")
    for br in element_copy.find_all("br"):
        br.replace_with(" ")
    text = element_copy.get_text()
    text = re.sub(r'\[\d+\]', '', text)
    return " ".join(text.replace('\xa0', ' ').strip().split())

def detect_country(text):
    if not text:
        return None
    text_lower = text.lower()
    for name, code in COUNTRY_MAP.items():
        if re.search(r'\b' + re.escape(name) + r'\b', text_lower):
            return code
    return None

def parse_mintage(text):
    if not text:
        return 0
    clean_num = re.sub(r'[^\d]', '', text)
    return int(clean_num) if clean_num else 0

def normalize_title_for_id(title: str) -> str:
    if not title:
        return ""
    text = title.lower().strip()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9]', '', text)
    return text

def generate_coin_id(country: str, year: int, title: str) -> str:
    clean_country = country.strip().upper()
    clean_title = normalize_title_for_id(title)
    raw_key = f"{clean_country}_{year}_{clean_title}"
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()[:12]

def extract_image_url(cell):
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
    
    # Rimuovi parametri di tracciamento o trasformazione URL
    clean_src = src.split('?')[0]
    return clean_src

def download_and_save_image(remote_url: str, coin_id: str, max_retries: int = 3) -> str:
    if not remote_url:
        return ""
    
    os.makedirs(IMAGES_DIR, exist_ok=True)

    # Pulizia URL
    clean_url = remote_url.split('?')[0]
    ext = ".jpg"
    if clean_url.lower().endswith('.png'):
        ext = ".png"
    elif clean_url.lower().endswith('.webp'):
        ext = ".webp"
    elif clean_url.lower().endswith('.svg'):
        ext = ".svg"

    filename = f"{coin_id}{ext}"
    local_path = os.path.join(IMAGES_DIR, filename)
    relative_url = f"images/{filename}"

    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return relative_url

    backoff = 2
    for attempt in range(max_retries):
        try:
            time.sleep(0.3)
            res = requests.get(clean_url, headers=HEADERS, timeout=15)
            
            if res.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(res.content)
                print(f"   [+] Scaricata immagine per {coin_id} -> {filename}")
                return relative_url
            elif res.status_code in [403, 429]:
                print(f"   [!] HTTP {res.status_code} per {coin_id}. Retry tra {backoff}s...")
                time.sleep(backoff)
                backoff *= 2
            else:
                print(f"   [!] HTTP {res.status_code} per {clean_url}")
                break
        except Exception as e:
            print(f"   [!] Errore per {coin_id}: {e}")
            time.sleep(backoff)
            backoff *= 2

    return ""

def get_yearly_page_urls():
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
        print(f"Avviso indice: {e}")

    if not urls:
        for yr in range(2004, CURRENT_YEAR + 2):
            urls.append(f"{BASE_URL}/wiki/2_euro_commemorativi_emessi_nel_{yr}")

    return sorted(list(set(urls)))

def scrape_year_page(url):
    year_match = re.search(r'\d{4}', url)
    year = int(year_match.group(0)) if year_match else CURRENT_YEAR
    
    print(f"Scraping anno {year}...")
    
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
                    remote_common_img_url = extract_image_url(cols[0]) if has_img_col else ""
                    offset = 1 if has_img_col else 0

                    raw_country_text = clean_element_text(cols[offset])
                    
                    if "unione europea" in raw_country_text.lower() or "ue" == raw_country_text.lower():
                        common_theme = clean_element_text(cols[offset + 1])
                        common_issue_date = clean_element_text(cols[offset + 3]) if len(cols) > offset + 3 else ""
                        common_designer = clean_element_text(cols[offset + 4]) if len(cols) > offset + 4 else ""

                        common_description = ""
                        if i + 1 < len(rows):
                            next_row = rows[i + 1]
                            next_cols = next_row.select("td")
                            if len(next_cols) >= 1 and "Descrizione:" in next_row.get_text():
                                common_description = clean_element_text(next_cols[0])
                                common_description = re.sub(r'^Descrizione:\s*', '', common_description, flags=re.IGNORECASE)
                                i += 1

                        i += 1
                        while i < len(rows):
                            sub_row = rows[i]
                            sub_cols = sub_row.select("td")
                            
                            if not sub_cols or len(sub_cols) < 3 or "Descrizione:" in sub_row.get_text():
                                break

                            sub_img_col = sub_cols[0] if sub_cols[0].find("img") else None
                            remote_country_img_url = extract_image_url(sub_img_col) if sub_img_col else remote_common_img_url

                            sub_country_idx = 1 if sub_img_col else 0
                            if len(sub_cols) <= sub_country_idx:
                                i += 1
                                continue

                            country_name_text = clean_element_text(sub_cols[sub_country_idx])
                            sub_country_code = detect_country(country_name_text)

                            if not sub_country_code:
                                break

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
                            local_image_path = download_and_save_image(
                                remote_country_img_url or remote_common_img_url, 
                                coin_id
                            )

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
                                "image_url": local_image_path,
                                "variants": []
                            })

                            i += 1
                        continue

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
                            local_image_path = download_and_save_image(remote_common_img_url, coin_id)

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
                                "image_url": local_image_path,
                                "variants": []
                            })
                i += 1

        return coins

    except Exception as e:
        print(f"Errore nello scraping di {url}: {e}")
        return []

def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

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
        with open(CATALOG_PATH, "w", encoding="utf-8") as f:
            json.dump(final_coins, f, ensure_ascii=False, indent=2)
        print(f"\nCOMPLETATO: Salvate {len(final_coins)} monete in '{CATALOG_PATH}'")
        print(f"Cartella immagini: '{IMAGES_DIR}'")
    else:
        print("ATTENZIONE: Nessuna moneta estratta.")

if __name__ == "__main__":
    main()
