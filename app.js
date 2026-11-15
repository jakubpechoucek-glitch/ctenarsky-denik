// Čtenářský deník – aplikace. Data: Supabase (tabulka cteni) přes společné
// rodinné přihlášení (rozcestnik/auth.js). Režim ?demo běží bez přihlášení
// s paměťovým úložištěm a smyšlenými daty.
(function () {
  "use strict";
  const DEMO = new URLSearchParams(location.search).has("demo");
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dnes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const fmt = (d) => { if (!d) return "–"; const [r, m, dd] = d.split("-").map(Number); return `${dd}. ${m}. ${r}`; };
  const S = window.Statistiky;

  const DEMO_KNIHY = [
    { id: "d1", nazev: "Ukázková detektivka", autor: "Jan Vzor", isbn: "9788000000001", pocet_stran: 320, rok_vydani: 2024, jazyk: "cs", obalka_url: "", datum_zahajeni: "2026-10-20", datum_dokonceni: "2026-11-02", stav: "doctena", hodnoceni: 4, odhad: false, poznamka: "" },
    { id: "d2", nazev: "Dlouhý román o moři", autor: "Ema Příkladová", isbn: "", pocet_stran: 512, rok_vydani: 2022, obalka_url: "", datum_zahajeni: "2026-09-01", datum_dokonceni: "2026-10-15", stav: "doctena", hodnoceni: null, odhad: true, poznamka: "" },
    { id: "d3", nazev: "Krátké povídky", autor: "Jan Vzor", isbn: "", pocet_stran: 160, rok_vydani: 2025, obalka_url: "", datum_zahajeni: "2026-11-10", datum_dokonceni: null, stav: "rozečtena", hodnoceni: null, odhad: false, poznamka: "" },
    { id: "d5", nazev: "An Example Novel in English", autor: "Jane Sample", isbn: "", pocet_stran: 360, rok_vydani: 2021, jazyk: "en", obalka_url: "", datum_zahajeni: "2026-10-01", datum_dokonceni: "2026-11-08", stav: "doctena", hodnoceni: 4, odhad: false, poznamka: "" },
    { id: "d4", nazev: "Naučná kniha o spánku", autor: "Petr Ukázka", isbn: "", pocet_stran: 280, rok_vydani: 2023, obalka_url: "", datum_zahajeni: null, datum_dokonceni: "2026-08-20", stav: "doctena", hodnoceni: 5, odhad: true, poznamka: "" },
  ];

  let knihy = [];
  let uloziste = null; // { pridej(zaznam), uprav(id, zaznam), smaz(id) }
  let userId = null;

  function demoUloziste() {
    let data = DEMO_KNIHY.map((k) => ({ ...k }));
    return {
      nacti: async () => data,
      pridej: async (z) => { z.id = "d" + Date.now(); data = [z, ...data]; return z; },
      uprav: async (id, z) => { data = data.map((k) => (k.id === id ? { ...z, id } : k)); },
      smaz: async (id) => { data = data.filter((k) => k.id !== id); },
    };
  }

  function supabaseUloziste(client) {
    return {
      nacti: async () => {
        const { data, error } = await client.from("cteni").select("*");
        if (error) throw new Error(error.message);
        return data;
      },
      pridej: async (z) => {
        const { data, error } = await client.from("cteni").insert({ ...z, user_id: userId }).select().single();
        if (error) throw new Error(error.message);
        return data;
      },
      uprav: async (id, z) => {
        const { error } = await client.from("cteni").update(z).eq("id", id);
        if (error) throw new Error(error.message);
      },
      smaz: async (id) => {
        const { error } = await client.from("cteni").delete().eq("id", id);
        if (error) throw new Error(error.message);
      },
    };
  }

  // ---------- Vykreslování ----------
  function rychlostText(k) {
    const r = S.rychlost(k);
    return r === null ? "" : ` · ${r.toFixed(1).replace(".", ",")} stran/den`;
  }

  // Vlajka UK jako inline SVG (emoji vlajky se na Windows nezobrazují)
  const VLAJKA_UK = `<svg class="vlajka" viewBox="0 0 60 30" role="img" aria-label="Anglicky (originál)"><title>Anglicky (originál)</title><clipPath id="vuk"><path d="M0 0h60v30H0z"/></clipPath><g clip-path="url(#vuk)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="3"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>`;

  function knihaHtml(k, akce) {
    const obalka = k.obalka_url ? `<img src="${esc(k.obalka_url)}" alt="">` : `<div class="bez-obalky">📖</div>`;
    const obdobi = k.stav === "rozečtena"
      ? `čtu od ${fmt(k.datum_zahajeni)}${k.datum_zahajeni ? ` (${S.ctuDni(k, dnes())} dní)` : ""}`
      : `${fmt(k.datum_zahajeni)} → ${fmt(k.datum_dokonceni)}`;
    const meta = [
      k.autor, k.pocet_stran ? `${k.pocet_stran} stran` : null, obdobi,
      k.hodnoceni ? "★".repeat(k.hodnoceni) : null,
    ].filter(Boolean).join(" · ");
    return `<div class="kniha" data-id="${esc(k.id)}">
      ${obalka}
      <div><h4>${esc(k.nazev)}${k.jazyk === "en" ? ` ${VLAJKA_UK}` : ""}</h4><div class="meta">${esc(meta)}${esc(rychlostText(k))}</div>
      ${k.odhad ? `<span class="odznak">odhad dat</span>` : ""} ${k.poznamka ? `<div class="meta">${esc(k.poznamka)}</div>` : ""}</div>
      <div class="akce">${akce}</div></div>`;
  }

  // Trend metriky oproti předchozímu roku: šipka, rozdíl a procenta.
  // obracene = true znamená, že pokles je zlepšení (dní na knihu).
  function trendHtml(p, formatuj, obracene, predRok) {
    if (!p) return `<em class="trend">bez srovnání s rokem ${predRok}</em>`;
    if (Math.abs(p.delta) < 1e-9) return `<em class="trend">→ beze změny oproti ${predRok}</em>`;
    const nahoru = p.delta > 0;
    const dobre = obracene ? !nahoru : nahoru;
    const pct = p.pct === null ? "" : ` (${p.delta > 0 ? "+" : "−"}${Math.abs(p.pct).toFixed(0)} %)`;
    const delta = formatuj(p.delta).replace("-", "−");
    return `<em class="trend ${dobre ? "dobre" : "spatne"}">${nahoru ? "▲" : "▼"} ${delta}${pct} oproti ${predRok}</em>`;
  }

  function renderPrehled() {
    const { roky, mesice } = S.prehledVCasu(knihy);
    const rokyList = Object.keys(roky).sort().reverse();
    const sel = $("graf-rok");
    const zvoleny = rokyList.includes(sel.value) ? sel.value : rokyList[0];
    sel.innerHTML = rokyList.map((r) => `<option ${r === zvoleny ? "selected" : ""}>${r}</option>`).join("");

    // Základní údaje i extrémy se počítají jen z knih dočtených ve vybraném roce
    const proRok = zvoleny ? knihy.filter((k) => k.datum_dokonceni && k.datum_dokonceni.startsWith(zvoleny)) : [];
    const s = S.souhrn(proRok);
    // Trend oproti předchozímu roku
    const predRok = zvoleny ? String(Number(zvoleny) - 1) : "";
    const ps = S.souhrn(knihy.filter((k) => k.datum_dokonceni && k.datum_dokonceni.startsWith(predRok)));
    const por = ps.knih ? S.porovnani(s, ps) : { knih: null, stran: null, prumernaRychlost: null, prumernaDobaCteni: null };
    const dlaz = [
      [s.knih, "dočtených knih", trendHtml(por.knih, (d) => (d > 0 ? "+" : "") + d, false, predRok)],
      [s.stran.toLocaleString("cs-CZ"), "stran celkem", trendHtml(por.stran, (d) => (d > 0 ? "+" : "") + d.toLocaleString("cs-CZ"), false, predRok)],
      [s.prumernaRychlost === null ? "–" : s.prumernaRychlost.toFixed(1).replace(".", ","), "stran/den průměrně", trendHtml(por.prumernaRychlost, (d) => (d > 0 ? "+" : "") + d.toFixed(1).replace(".", ","), false, predRok)],
      [s.prumernaDobaCteni === null ? "–" : s.prumernaDobaCteni.toFixed(1).replace(".", ","), "dní na knihu průměrně", trendHtml(por.prumernaDobaCteni, (d) => (d > 0 ? "+" : "") + d.toFixed(1).replace(".", ","), true, predRok)],
    ];
    $("souhrn-dlazdice").innerHTML = dlaz.map(([v, t, tr]) => `<div class="cislo"><b>${v}</b>${tr}<span>${t}</span></div>`).join("");

    const e = S.extremy(proRok);
    $("extremy").innerHTML = e.nejrychlejsi
      ? `Nejrychleji: <b>${esc(e.nejrychlejsi.nazev)}</b> (${S.rychlost(e.nejrychlejsi).toFixed(1).replace(".", ",")} stran/den) · Nejpomaleji: <b>${esc(e.nejpomalejsi.nazev)}</b> (${S.rychlost(e.nejpomalejsi).toFixed(1).replace(".", ",")} stran/den)`
      : "V tomto roce zatím žádná kniha s oběma daty a počtem stran.";
    const max = Math.max(1, ...Object.entries(mesice).filter(([k]) => k.startsWith(zvoleny)).map(([, v]) => v.stran));
    const nazvyMesicu = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
    $("graf").innerHTML = nazvyMesicu.map((n, i) => {
      const klic = `${zvoleny}-${String(i + 1).padStart(2, "0")}`;
      const v = mesice[klic] || { knih: 0, stran: 0 };
      return `<div class="radek"><span>${n}</span><span class="sloupec"><i style="width:${Math.round((v.stran / max) * 100)}%"></i></span><span class="hodnota">${v.stran ? `${v.stran} str. · ${v.knih} kn.` : ""}</span></div>`;
    }).join("");
    $("roky-souhrn").innerHTML = rokyList.map((r) => `<span class="rok"><b>${r}</b>: ${roky[r].knih} knih · ${roky[r].stran.toLocaleString("cs-CZ")} stran</span>`).join("");
  }

  function renderRozectene() {
    const roz = knihy.filter((k) => k.stav === "rozečtena");
    $("rozečtene-seznam").innerHTML = roz.length
      ? roz.map((k) => knihaHtml(k, `<button class="btn btn-maly" data-akce="docist" data-id="${esc(k.id)}">Dočteno dnes</button><button class="btn btn-maly btn-svetly" data-akce="upravit" data-id="${esc(k.id)}">Upravit</button>`)).join("")
      : `<p class="stav-text">Právě nic nečteš. Přidej knihu níže.</p>`;
  }

  function renderSeznam() {
    const dotaz = $("hledat").value.trim().toLowerCase();
    const stav = $("filtr-stav").value;
    const serazene = [...knihy].sort((a, b) => (b.datum_dokonceni || b.datum_zahajeni || "").localeCompare(a.datum_dokonceni || a.datum_zahajeni || ""));
    const viditelne = serazene.filter((k) =>
      (!stav || k.stav === stav) &&
      (!dotaz || `${k.nazev} ${k.autor || ""}`.toLowerCase().includes(dotaz)));
    $("knihy-seznam").innerHTML = viditelne.length
      ? viditelne.map((k) => knihaHtml(k, `<button class="btn btn-maly btn-svetly" data-akce="upravit" data-id="${esc(k.id)}">Upravit</button><button class="btn btn-maly btn-svetly" data-akce="smazat" data-id="${esc(k.id)}">Smazat</button>`)).join("")
      : `<p class="stav-text">Nic tu není.</p>`;
  }

  function render() { renderPrehled(); renderRozectene(); renderSeznam(); }

  // ---------- Formulář ----------
  function vyplnForm(k) {
    $("f-id").value = k.id || "";
    $("f-nazev").value = k.nazev || "";
    $("f-autor").value = k.autor || "";
    $("f-strany").value = k.pocet_stran || "";
    $("f-rok").value = k.rok_vydani || "";
    $("f-isbn").value = k.isbn || "";
    $("f-obalka").value = k.obalka_url || "";
    $("f-jazyk").value = k.jazyk || "cs";
    $("f-stav").value = k.stav || "rozečtena";
    $("f-zahajeni").value = k.datum_zahajeni || dnes();
    $("f-dokonceni").value = k.datum_dokonceni || "";
    $("f-hodnoceni").value = k.hodnoceni || "";
    $("f-odhad").checked = !!k.odhad;
    $("f-poznamka").value = k.poznamka || "";
    $("form-nadpis").textContent = k.id ? "Upravit knihu" : "Přidat knihu";
    $("form-zrusit").hidden = !k.id;
  }

  function zaznamZFormu() {
    const cislo = (id) => { const v = $(id).value.trim(); return v ? Number(v) : null; };
    return {
      nazev: $("f-nazev").value.trim(),
      autor: $("f-autor").value.trim() || null,
      pocet_stran: cislo("f-strany"),
      rok_vydani: cislo("f-rok"),
      isbn: $("f-isbn").value.trim() || null,
      obalka_url: $("f-obalka").value.trim() || null,
      jazyk: $("f-jazyk").value,
      stav: $("f-stav").value,
      datum_zahajeni: $("f-zahajeni").value || null,
      datum_dokonceni: $("f-dokonceni").value || null,
      hodnoceni: cislo("f-hodnoceni"),
      odhad: $("f-odhad").checked,
      poznamka: $("f-poznamka").value.trim() || null,
      zdroj: "rucne",
    };
  }

  // ---------- Dohledání podle ISBN ----------
  function cisteIsbn(v) { return v.replace(/[^0-9Xx]/g, "").toUpperCase(); }

  // Volitelný API klíč ke Google Books (zdarma, v Google Cloud omezit na adresu
  // aplikace). Bez klíče se používá sdílená kvóta, která bývá vyčerpaná (HTTP 429).
  const GOOGLE_BOOKS_KEY = "";

  // Vrací { nalez, chyby }: nalez je objekt nebo null, chyby popisují, co selhalo.
  async function dohledatIsbn(isbn) {
    const chyby = [];
    try {
      const klic = GOOGLE_BOOKS_KEY ? `&key=${encodeURIComponent(GOOGLE_BOOKS_KEY)}` : "";
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${klic}`);
      if (!r.ok) chyby.push(r.status === 429 ? "Google Books: vyčerpaná kvóta (429)" : `Google Books: chyba ${r.status}`);
      else {
        const j = await r.json();
        const info = j.items?.[0]?.volumeInfo;
        if (info) return { nalez: {
          nazev: info.title || "", autor: (info.authors || []).join(", "),
          pocet_stran: info.pageCount || null,
          rok_vydani: info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) || null : null,
          obalka_url: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
          jazyk: String(info.language || "").toLowerCase().startsWith("en") ? "en" : "cs",
        }, chyby };
        chyby.push("Google Books: kniha tam není");
      }
    } catch (e) { chyby.push("Google Books: nedostupné"); }
    try {
      const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`);
      if (!r.ok) chyby.push(`Open Library: chyba ${r.status}`);
      else {
        const j = await r.json();
        const info = j[`ISBN:${isbn}`];
        if (info) return { nalez: {
          nazev: info.title || "", autor: (info.authors || []).map((a) => a.name).join(", "),
          pocet_stran: info.number_of_pages || null,
          rok_vydani: info.publish_date ? Number(String(info.publish_date).match(/\d{4}/)?.[0]) || null : null,
          obalka_url: info.cover?.medium || "",
        }, chyby };
        chyby.push("Open Library: kniha tam není");
      }
    } catch (e) { chyby.push("Open Library: nedostupné"); }
    return { nalez: null, chyby };
  }

  let skenStream = null;
  async function skenovat() {
    const video = $("skener");
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      $("dohledani-stav").textContent = "Tento prohlížeč skenování kódu neumí – zadej ISBN ručně.";
      return;
    }
    try {
      skenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = skenStream; video.hidden = false; await video.play();
      const detektor = new BarcodeDetector({ formats: ["ean_13", "ean_8"] });
      $("dohledani-stav").textContent = "Namiř kameru na čárový kód knihy…";
      const hlidka = setInterval(async () => {
        try {
          const kody = await detektor.detect(video);
          if (kody.length) {
            clearInterval(hlidka); zastavSken();
            $("isbn").value = kody[0].rawValue;
            $("dohledat").click();
          }
        } catch (e) { /* další pokus */ }
      }, 400);
      setTimeout(() => { clearInterval(hlidka); if (skenStream) { zastavSken(); $("dohledani-stav").textContent = "Kód se nepodařilo načíst – zadej ISBN ručně."; } }, 30000);
    } catch (e) {
      $("dohledani-stav").textContent = "Kameru se nepodařilo spustit – zadej ISBN ručně.";
    }
  }
  function zastavSken() {
    if (skenStream) { skenStream.getTracks().forEach((t) => t.stop()); skenStream = null; }
    $("skener").hidden = true;
  }

  // ---------- Události ----------
  function vazby() {
    $("graf-rok").addEventListener("change", renderPrehled);
    $("hledat").addEventListener("input", renderSeznam);
    $("filtr-stav").addEventListener("change", renderSeznam);

    $("dohledat").addEventListener("click", async () => {
      const isbn = cisteIsbn($("isbn").value);
      if (!isbn) { $("dohledani-stav").textContent = "Nejdřív zadej ISBN."; return; }
      $("dohledani-stav").textContent = "Hledám…";
      const { nalez, chyby } = await dohledatIsbn(isbn);
      if (!nalez) { $("dohledani-stav").textContent = `Knihu jsem podle ISBN nenašel (${chyby.join("; ")}) – vyplň údaje ručně.`; $("f-isbn").value = isbn; return; }
      vyplnForm({ ...nalez, isbn, stav: "rozečtena", datum_zahajeni: dnes() });
      $("dohledani-stav").textContent = "Našel jsem – zkontroluj údaje a ulož.";
    });
    $("skenovat").addEventListener("click", skenovat);

    $("form-kniha").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const z = zaznamZFormu();
      if (z.stav === "doctena" && !z.datum_dokonceni) z.datum_dokonceni = dnes();
      if (z.stav !== "doctena") z.datum_dokonceni = z.stav === "rozečtena" ? null : z.datum_dokonceni;
      const id = $("f-id").value;
      try {
        if (id) { await uloziste.uprav(id, z); knihy = knihy.map((k) => (k.id === id ? { ...z, id } : k)); }
        else { const novy = await uloziste.pridej(z); knihy = [novy, ...knihy]; }
        vyplnForm({});
        $("form-stav").textContent = "Uloženo.";
        render();
      } catch (e) { $("form-stav").textContent = "Uložení se nezdařilo: " + e.message; }
    });
    $("form-zrusit").addEventListener("click", () => vyplnForm({}));

    document.addEventListener("click", async (ev) => {
      const tl = ev.target.closest("[data-akce]");
      if (!tl) return;
      const id = tl.dataset.id;
      const k = knihy.find((x) => x.id === id);
      if (!k) return;
      if (tl.dataset.akce === "upravit") { vyplnForm(k); $("pridat").scrollIntoView({ behavior: "smooth" }); }
      if (tl.dataset.akce === "smazat") {
        if (!confirm(`Smazat „${k.nazev}"?`)) return;
        await uloziste.smaz(id); knihy = knihy.filter((x) => x.id !== id); render();
      }
      if (tl.dataset.akce === "docist") {
        const z = { ...k, stav: "doctena", datum_dokonceni: dnes() };
        delete z.id; delete z.user_id; delete z.vytvoreno;
        await uloziste.uprav(id, z);
        knihy = knihy.map((x) => (x.id === id ? { ...z, id } : x));
        render();
      }
    });

    $("odhlasit").addEventListener("click", () => { if (window.RodinaAuth) RodinaAuth.odhlasit(); });
  }

  // ---------- Start ----------
  (async function init() {
    vazby();
    vyplnForm({});
    if (DEMO) {
      document.documentElement.classList.remove("auth-ceka");
      $("jmeno-uzivatele").textContent = "Režim DEMO (smyšlená data)";
      uloziste = demoUloziste();
      knihy = await uloziste.nacti();
      render();
      return;
    }
    if (!window.RodinaAuth || !RodinaAuth.nastaveno) {
      document.documentElement.classList.remove("auth-ceka");
      $("souhrn-dlazdice").innerHTML = "<p>Přihlášení není dostupné. Zkus to z Rozcestníku, nebo otevři <a href='?demo'>demo</a>.</p>";
      return;
    }
    const s = await RodinaAuth.vyzadujPrihlaseni();
    if (!s) return; // přesměrování / hláška řeší auth.js
    userId = s.session.user.id;
    $("jmeno-uzivatele").textContent = s.jmeno || s.email || "";
    $("odhlasit").hidden = false;
    uloziste = supabaseUloziste(RodinaAuth.client);
    try {
      knihy = await uloziste.nacti();
    } catch (e) {
      $("souhrn-dlazdice").innerHTML = `<p>Data se nepodařilo načíst (${esc(e.message)}). Možná ještě není vytvořená tabulka cteni v Supabase – viz docs/supabase.sql.</p>`;
      return;
    }
    render();
  })();
})();
