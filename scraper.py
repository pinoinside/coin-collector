import json
import os
import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

COUNTRY_MAP = {
    "Italia": "IT", "Germania": "DE", "Francia": "FR", "Spagna": "ES",
    "Austria": "AT", "Belgio": "BE", "Grecia": "GR", "Portogallo": "PT",
    "Finlandia": "FI", "Olanda": "NL", "Paesi Bassi": "NL", "Lussemburgo": "LU",
    "Irlanda": "IE", "Slovacchia": "SK", "Slovenia": "SI", "Estonia": "EE",
    "Lettonia": "LV", "Lituania": "LT", "Malta": "MT", "Cipro": "CY",
    "San Marino": "SM", "Vaticano": "VA", "Monaco": "MC", "Andorra": "AD"
}

def clean_text(text):
    if not text:
        return ""
    return " ".join(text.strip().split())

def scrape_wikipedia_commemoratives():
    """
    Estrae le monete da 2 Euro Commemorative dalle tabelle strutturate di Wikipedia IT/EN.
    """
    url = "https://it.wikipedia.org/wiki/2_euro_commemorativi"
    print(f"Scraping in corso da: {url}...")
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        coins = []
        tables = soup.select("table.wikitable")
        print(f"Trovate {len(tables)} tabelle di monete sul portale.")

        for table in tables:
            rows = table.select("tr")
            current_country = "EU"
            
            for row in rows:
                cols = row.select("td, th")
                if not cols or len(cols) < 3:
                    continue
                
                text_content = row.get_text()
                
                # Cerca il paese nel testo o nella cella
                for name, code in COUNTRY_MAP.items():
                    if name.lower() in text_content.lower():
                        current_country = code
                        break

                # Cerca l'anno (es. 2004 - 2026)
                year_match = re.search(r'\b(200[4-9]|20[1-2][0-9])\b', text_content)
                if not year_match:
                    continue
                year = int(year_match.group(1))

                # Estrazione titolo/motivo
                title = ""
                for col in cols:
                    cell_text = clean_text(col.get_text())
                    if len(cell_text) > 10 and not cell_text.isdigit() and "euro" not in cell_text.lower():
                        title = cell_text
                        break
                
                if not title:
                    title = f"2€ Commemorativo {year}"

                # Cerca la tiratura (numeri > 10.000)
                mintage = 0
                numbers = re.findall(r'\b\d{1,3}(?:\.\d{3})+|\b\d{5,8}\b', text_content)
                if numbers:
                    clean_num = re.sub(r'[^\d]', '', numbers[0])
                    if clean_num:
                        mintage = int(clean_num)

                # Genera ID univoco (es. EU-IT-2004-2E-50ANNIV)
                slug = re.sub(r'[^a-zA-Z0-9]', '', title)[:8].upper()
                coin_id = f"EU-{current_country}-{year}-2E-{slug}"

                # Evita duplicati nella lista
                if not any(c["id"] == coin_id for c in coins):
                    coins.append({
                        "id": coin_id,
                        "country": current_country,
                        "year": year,
                        "denomination": "2.00",
                        "type": "commemorative",
                        "title": title[:100], # Tronca titoli troppo lunghi
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
    
    # Se lo scraping ha estratto le monete, salva il catalogo reale
    if coins:
        output_path = "public/catalog.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(coins, f, ensure_ascii=False, indent=2)
        print(f"SUCCESS: Catalogo salvato in '{output_path}' con {len(coins)} monete!")
    else:
        print("ATTENZIONE: Nessuna moneta estratta. Mantengo il file esistente.")

if __name__ == "__main__":
    main()
