# Stav projektu

- 15. 11. 2026 – Zadání a datový model sepsány a schváleny Jakubem
  (`docs/zadani.md`). Rozhodnuto: přidávání podle ISBN s dohledáním
  v Google Books / Open Library, stavy rozečtená/dočtená/nedočtená,
  statistiky dle zadání, Databáze knih jen na jednorázový import.
- Repozitář `ctenarsky-denik` založen Jakubem 15. 11. 2026 a přidán
  do Muse GitHub App; zadání, README a CLAUDE.md nahrány.
- 15. 11. 2026 – Importní extrakce z Databáze knih hotová (společné
  přihlášení, profil jakub1107): 30 dočtených knih + 1 rozečtená,
  s obdobími čtení, počty stran a ISBN. Importní JSON je lokálně
  v `import/` (v `.gitignore`, do gitu nepatří); kontrolní přehled
  předán Jakubovi.
- 15. 11. 2026 – Rozhodnuto: tabulka vznikne ve stávajícím rodinném
  Supabase projektu. Aplikace v1 postavena (index.html, app.js, stats.js,
  styles.css): přehled a grafy, právě čtu s tlačítkem „Dočteno dnes",
  přidání knihy podle ISBN (Google Books / Open Library, i skenování
  čárového kódu), ruční zadání, úpravy a mazání, režim `?demo`.
  Výpočty otestovány (tests/test-stats.js, vše prošlo).
- 15. 11. 2026 – Tabulka `cteni` vytvořena v Supabase (společné
  přihlášení přes prohlížeč, Jakub se do Supabase hlásí přes GitHub)
  a import nahrán: ověřeno 31 záznamů pod Jakubovým účtem.
- 15. 11. 2026 – GitHub Pages zapnuto, aplikace běží na
  https://jakubpechoucek-glitch.github.io/ctenarsky-denik/
  (nepřihlášeného přesměruje na Rozcestník a po přihlášení vrátí zpět).
- 15. 11. 2026 – Úpravy dle Jakuba: základní údaje v Přehledu (dlaždice
  i nejrychlejší/nejpomalejší kniha) se filtrují podle vybraného roku,
  výběr roku přesunut nahoru do Přehledu; do hlavičky přidáno tlačítko
  „← Rozcestník". Souhrny za jednotlivé roky zůstávají dole jako řádka
  odznaků. Čeká se na Jakubovu ostrou kontrolu dat.
- 15. 11. 2026 – U hlavních metrik v Přehledu doplněn trend oproti
  předchozímu roku (šipka, rozdíl a procenta; u dní na knihu je zlepšení
  pokles). Výpočet `porovnani()` je ve stats.js, testy rozšířeny
  (21 kontrol).
- 15. 11. 2026 – Přidán jazyk knihy (`jazyk`: cs/en): ve formuláři výběr
  „Česky / Anglicky (originál)", u anglických knih vlajka UK u názvu.
  **Před nasazením spustit v Supabase SQL Editoru ALTER z `docs/supabase.sql`**
  (sloupec `jazyk`, výchozí `cs`, stávající záznamy zůstanou české).
