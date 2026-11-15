# Čtenářský deník

Osobní webová aplikace pro evidenci čtení a čtenářské statistiky: u každé knihy
datum zahájení a dokončení čtení, rychlost čtení podle počtu stran a přehledy
po měsících a letech.

- Zadání a datový model: [`docs/zadani.md`](docs/zadani.md)
- Stav projektu: [`PROGRESS.md`](PROGRESS.md)
- Technologie dle globálních pravidel (repo `rozcestnik`, `CLAUDE-global.md`):
  statická stránka na GitHub Pages, Supabase + přihlášení přes Google.
- Historie se jednorázově naimportuje z Databáze knih; osobní data žijí
  v databázi za přihlášením, nikdy ne v tomto repozitáři.
