# Čtenářský deník – zadání

Verze 1, 15. 11. 2026. Rozhodnutí schválena Jakubem 15. 11. 2026.
Globální pravidla: viz `CLAUDE-global.md` v repozitáři `rozcestnik` (statická stránka
na GitHub Pages, Supabase + Google přihlášení, žádná osobní data v gitu, režim `?demo`).

## Účel

Osobní webová aplikace pro evidenci čtení a statistiky: u každé knihy kdy jsem ji
začal číst a kdy dočetl, rychlost čtení podle počtu stran a celkové přehledy
v čase. Do budoucna použitelné i pro další členy rodiny (datový model je od
začátku víceuživatelský).

## Jak se kniha dostane dovnitř

- Knihu přidávám v okamžiku, kdy ji začínám číst. **Den přidání = datum zahájení čtení.**
- Přidání podle ISBN: ruční zadání, nebo naskenování čárového kódu mobilem.
  Detaily (název, autor, počet stran, obálka, rok vydání) se dohledají
  v Google Books / Open Library; všechna pole jdou před uložením ručně opravit.
- Při dočtení jedním kliknutím zapíšu datum dokončení. Datum zahájení i dokončení
  jdou zpětně upravit (kdybych zápis zapomněl udělat včas).

## Stavy knihy

- `rozečtená` – právě čtu (může jich být víc najednou)
- `dočtená` – má datum dokončení, počítá se do statistik
- `nedočtená` – odložil jsem ji; do statistik rychlosti se nepočítá, v přehledu je vidět

## Statistiky (v1)

- Přehled po měsících a letech: počet dočtených knih a počet stran.
- Průměrná rychlost čtení: stran za den (počet stran / počet dní čtení).
- Průměrná doba čtení jedné knihy (dny).
- Nejrychlejší a nejpomalejší kniha.
- Aktuálně rozečtené knihy (a jak dlouho už je čtu).
- Výpočty v samostatném souboru bez práce se stránkou (testovatelné).

## Datový model (Supabase, RLS zapnuté)

Tabulka `cteni`:

| sloupec | typ | poznámka |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | vlastník záznamu; RLS: každý vidí jen své |
| nazev | text | |
| autor | text | |
| isbn | text, null | |
| pocet_stran | int, null | bez počtu stran se rychlost nepočítá |
| rok_vydani | int, null | |
| obalka_url | text, null | odkaz na obálku ze zdroje |
| datum_zahajeni | date | den přidání, lze upravit |
| datum_dokonceni | date, null | |
| stav | text | `rozečtena` / `doctena` / `nedoctena` |
| hodnoceni | int, null | moje hodnocení (z importu i ručně) |
| zdroj | text | `import_dk` / `rucne` |
| vytvoreno | timestamptz | |

Odvozené (počítá aplikace, neukládá se): dny čtení = dokončení − zahájení + 1;
rychlost = počet stran / dny čtení.

## Import z Databáze knih (jednorázový)

- Databáze knih (databazeknih.cz) se využije jen jednou, na import historie
  (knihy přečtené letos, loni a dřív). Potom už vše běží jen v této aplikaci.
- Jakub se na Databázi knih přihlašuje přes Google účet – import proběhne
  společně: Jakub se přihlásí v prohlížeči, Muse z profilu přečte seznam
  přečtených knih (název, autor, počet stran, datum dočtení, hodnocení)
  a připraví importní data ke kontrole před nahráním do Supabase.
- U importovaných knih zůstane `datum_zahajeni` prázdné (neznáme ho) –
  rychlost čtení se u nich nepočítá, do přehledů počtu knih a stran ano.

## Mimo rozsah v1

- Sdílení mezi členy rodiny (jen připravený datový model, UI později).
- Backend – v1 je čistě statická stránka + Supabase.
- Dohledávání na Databázi knih při přidávání (CORS) – jen import výše.

## Otevřené body

1. Jakub založí repozitář `ctenarsky-denik` a přidá ho do Muse GitHub App
   (aplikace sama repozitář založit nemůže – GitHub to integraci nedovolí).
2. Společné přihlášení na Databázi knih a test, co z profilu půjde přečíst.
3. Ve kterém Supabase projektu tabulka vznikne (vlastní vs. sdílený s ostatními
   aplikacemi) – rozhodnout před stavbou.
