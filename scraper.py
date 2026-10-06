import json
import re
import requests
from bs4 import BeautifulSoup

# Headers per simulare un browser reale ed evitare blocchi 403
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Mappatura dei paesi (Italiano -> ISO 2 lettere)
COUNTRY_MAP = {
    "Italia": "IT", "Germania": "DE", "Francia": "FR", "Spagna": "ES",
    "Austria": "AT", "Belgio": "BE", "Grecia": "GR", "Portogallo": "PT",
    "Finlandia": "FI", "Olanda": "NL", "Paesi Bassi": "NL", "Lussemburgo": "LU",
    "Irlanda": "IE", "Slovacchia": "SK", "Slovenia": "SI", "Estonia": "EE",
    "Lettonia": "LV", "Lituania": "LT", "Malta": "MT", "Cipro": "CY",
    "San Marino": "SM", "Vaticano": "VA", "Monaco": "MC", "Andorra": "AD"
}

def clean_text(text):
    """Pulisce gli spazi e i caratteri speciali dalle stringhe estratte."""
    if not text:
        return ""
    return " ".join(text.strip().split())

def scrape_euro_commemoratives():
    """
    Esempio di scraper che estrae le monete da 2 Euro Commemorative.
    Adatta la struttura dei selettori (.select / .find) in base all'HTML target.
    """
    # URL di esempio (es. portale numismatico o BCE)
    url = "https://ec.europa.eu/info/about-european-commission/euro/coins/two-euro-commemorative-coins_it"
    
    print(f"Fetch in corso da: {url}...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Errore nella richiesta HTTP: {e}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    coins = []
    
    # Cerchiamo tutti i blocchi/schede delle monete (adatta il selettore CSS)
    cards = soup.select(".coin-card, .coin-item, article") 
    
    print(f"Trovate {len(cards)} schede moneta. Inizio parsing...")

    for card in cards:
        try:
            # 1. Paese e Anno
            raw_country = card.select_one(".country-name, h3").get_text() if card.select_one(".country-name, h3") else ""
            country_clean = clean_text(raw_country)
            country_code = COUNTRY_MAP.get(country_clean, "EU") # Fallback EU se multinazionale

            year_match = re.search(r'\b(200[4-9]|20[1-9][0-9])\b', card.get_text())
            year = int(year_match.group(1)) if year_match else 2026

            # 2. Titolo / Descrizione
            title_el = card.select_one(".coin-title, h4, .title")
            title = clean_text(title_el.get_text()) if title_el else "2€ Commemorativo"

            # 3. Tiratura (Mintage) - Cerca numeri tipo "1.500.000" o "1500000"
            mintage_text = card.get_text()
            mintage_match = re.search(r'Tiratura:\s*([\d\.\s]+)', mintage_text, re.IGNORECASE)
            mintage = 0
            if mintage_match:
                mintage_clean = re.sub(r'[^\d]', '', mintage_match.group(1))
                mintage = int(mintage_clean) if mintage_clean else 0

            # 4. URL Immagine Dritto
            img_el = card.select_one("img")
            img_url = img_el["src"] if img_el and "src" in img_el.attrs else ""
            if img_url and not img_url.startswith("http"):
                img_url = f"https://ec.europa.eu{img_url}"

            # 5. Generazione ID Unico Deterministico (es: EU-IT-2024-2E-C01)
            # Puliamo il titolo per creare uno slug
            slug = re.sub(r'[^a-zA-Z0-9]', '', title)[:10].upper()
            coin_id = f"EU-{country_code}-{year}-2E-{slug}"

            coin_data = {
                "id": coin_id,
                "country": country_code,
                "year": year,
                "denomination": "2.00",
                "type": "commemorative",
                "title": title,
                "mint_mark": "",
                "mintage": mintage,
                "designer": "",
                "image_url": img_url,
                "variants": []
            }

            coins.append(coin_data)

        except Exception as err:
            print(f"Errore nel parsing di una scheda: {err}")
            continue

    return coins

def main():
    extracted_coins = scrape_euro_commemoratives()
    
    if not extracted_coins:
        print("ATTENZIONE: Nessuna moneta estratta. Verifica i selettori CSS dell'HTML!")
        return

    # Salva il risultato nel file JSON per il frontend PWA
    output_path = "public/catalog.json"
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(extracted_coins, f, ensure_ascii=False, indent=2)

    print(f"SUCCESS: Salvate {len(extracted_coins)} monete in '{output_path}'!")

if __name__ == "__main__":
    main()