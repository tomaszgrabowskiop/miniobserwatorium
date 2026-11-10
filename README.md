# Miniobserwatorium heksagonalne

Dokumentacja CAD i wykonawcza zdejmowalnej czapy oraz bazy dla montażu ZWO AM3 + RedCat 61. Sześciokąt foremny **R = 500 mm**, posadowienie bez fundamentu: obudowa na XPS/gumie, słup niezależny od bryły (wibracje oddzielone).

Główne wejście: **[budowa.html](budowa.html)** — instrukcja z osadzonymi modelami 3D.

## Podgląd lokalny

Modele ładują Three.js z CDN — wystarczy lokalny serwer HTTP (otwarcie plików przez `file://` zwykle blokuje skrypty).

```bash
cd /Users/wdrodze/Public/miniobserwatorium
python3 -m http.server 8080
```

Potem:

- instrukcja: http://localhost:8080/budowa.html  
- złożenie: http://localhost:8080/modele/zlozenie.html  

## Struktura

| Ścieżka | Opis |
| --- | --- |
| `budowa.html` | Instrukcja wykonania (układ, materiały, montaż, zasilanie) |
| `modele/_silnik.js` | Silnik Three.js r128 — geometria, stałe HEX/ROOF/PARAMS |
| `modele/zlozenie.html` | Pełne złożenie (przełączniki widoków) |
| `modele/slupek.html` | Gwiazda + kolumna + przedłużka + AM3 |
| `modele/obudowa.html` | Baza heksagonalna |
| `modele/dach.html` | Czapa (kasety, tropik, pająk) |
| `modele/konstrukcja.html` | Szkielet Alu |
| `modele/elektronika.html` | MPPT, LiFePO4, Pi, Wi‑Fi |
| `modele/cad.html` | Widok CAD / wymiarowanie |
| `Przedłużenie/` | Zdjęcia referencyjne przedłużki AliExpress |

## Założenia konstrukcyjne

- **Słup i obudowa** — dwa osobne trójnogi (0°/120°/240° vs 60°/180°/300°), bez połączenia sztywnego; szczelina podłogi z Armaflexem.
- **Baza** Z = 0–860 mm — Dibond **3 mm** na zewnątrz, PIR, sklejka wewnątrz.
- **Dach** Z = 825–1388 mm — cały w Dibondzie **2 mm**, kasety 30×30×1,5 klejone 2K, masa ≈ **21,3 kg**; zdejmowanie dwoma rączkami SE 150° / NW 330° (ściany bez ekranów).
- **Ekrany** — tylko ściany S 270° i SW 210°, Dibond 2 mm na tulejkach PA6/PTFE Ø20×24 + M6.
- **Sprzęt** — ZWO AM3, WO RedCat 61, ASI2600MC Pro, EFW, AstroLink 4 Pi; dach składać wyłącznie w pozycji park.
- **Zasilanie** — panel bifacial **450 W** → Victron SmartSolar **MPPT 100/30** → **1× LiFePO4 12,8 V 100 Ah** (BMS self-heating). Mikroklimat i sesja astro się wykluczają.

## Współrzędne

Środek (0, 0, 0) w osi słupa na gumie. **+Y** północ, **−Y** południe, **+X** wschód, **−X** zachód. Wszystkie rzędne **Z** od gumy. W silniku 3D: `P3(x,y,z) = (x, z, −y)`.

## Uwaga

Źródłem prawdy są `budowa.html` i `modele/_silnik.js`. Starsze kopie / duplikaty poza tym drzewem nie są utrzymywane.
