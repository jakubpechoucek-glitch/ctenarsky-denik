-- Čtenářský deník – tabulka cteni ve stávajícím rodinném Supabase projektu.
-- Spustit jednou v Supabase Dashboard → SQL Editor. Bez osobních dat.
-- Import historie z Databáze knih je zvlášť (lokální soubor import/import-sql.sql).

create table if not exists public.cteni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nazev text not null,
  autor text,
  isbn text,
  pocet_stran int,
  rok_vydani int,
  obalka_url text,
  datum_zahajeni date,          -- null u nejstarších importů (začátek neznámý)
  datum_dokonceni date,
  stav text not null default 'rozečtena'
    check (stav in ('rozečtena', 'doctena', 'nedoctena')),
  hodnoceni int check (hodnoceni between 1 and 5),
  odhad boolean not null default false,  -- data jsou odhadovaná (měsíční intervaly, ruční odhad)
  zdroj text not null default 'rucne',   -- import_dk / rucne
  poznamka text,
  vytvoreno timestamptz not null default now()
);

alter table public.cteni enable row level security;

-- Každý uživatel vidí a mění jen svoje záznamy. Přístup do aplikace navíc
-- hlídá rodinné přihlášení (tabulka clenove v rozcestnik/auth.js).
drop policy if exists "cteni vlastni cteni" on public.cteni;
drop policy if exists "cteni vlastni zapis" on public.cteni;
drop policy if exists "cteni vlastni uprava" on public.cteni;
drop policy if exists "cteni vlastni mazani" on public.cteni;

create policy "cteni vlastni cteni" on public.cteni
  for select using (user_id = auth.uid());
create policy "cteni vlastni zapis" on public.cteni
  for insert with check (user_id = auth.uid());
create policy "cteni vlastni uprava" on public.cteni
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cteni vlastni mazani" on public.cteni
  for delete using (user_id = auth.uid());

-- Jazyk knihy (přidáno později): cs = česky, en = anglický originál.
-- Pro už existující tabulku spustit jednou v SQL Editoru.
alter table public.cteni
  add column if not exists jazyk text not null default 'cs'
  check (jazyk in ('cs', 'en'));
