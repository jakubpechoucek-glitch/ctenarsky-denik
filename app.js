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
    { id: "d1", nazev: "Ukázková detektivka", autor: "Jan Vzor", isbn: "9788000000001", pocet_stran: 320, rok_vydani: 2024, obalka_url: "", datum_zahajeni: "2026-10-20", datum_dokonceni: "2026-11-02", stav: "doctena", hodnoceni: 4, odhad: false, poznamka: "" },
    { id: "d2", nazev: "Dlouhý román o moři", autor: "Ema Příkladová", isbn: "", pocet_stran: 512, rok_vydani: 2022, obalka_url: "", datum_zahajeni: "2026-09-01", datum_dokonceni: "2026-10-15", stav: "doctena", hodnoceni: null, odhad: true, poznamka: "" },
    { id: "d3", nazev: "Krátké povídky", autor: "Jan Vzor", isbn: "", pocet_stran: 160, rok_vydani: 2025, obalka_url: "", datum_zahajeni: "2026-11-10", datum_dokonceni: null, stav: "rozečtena", hodnoceni: null, odhad: false, poznamka: "" },
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
      <div><h4>${esc(k.nazev)}</h4><div class="meta">${esc(meta)}${esc(rychlostText(k))}</div>
      ${k.odhad ? `<span class="odznak">odhad dat</span>` : ""} ${k.poznamka ? `<div class="meta">${esc(k.poznamka)}</div>` : ""}</div>
      <div class="akce">${akce}</div></div>`;
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
    const dlaz = [
      [s.knih, "dočtených knih"],
      [s.stran.toLocaleString("cs-CZ"), "stran celkem"],
      [s.prumernaRychlost === null ? "–" : s.prumernaRychlost.toFixed(1).replace(".", ","), "stran/den průměrně"],
      [s.prumernaDobaCteni === null ? "–" : s.prumernaDobaCteni.toFixed(1).replace(".", ","), "dní na knihu průměrně"],
    ];
    $("souhrn-dlazdice").innerHTML = dlaz.map(([v, t]) => `<div class="cislo"><b>${v}</b><span>${t}</span></div>`).join("");

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

  async function dohledatIsbn(isbn) {
    // Google Books
    try {
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`);
      const j = await r.json();
      const info = j.items?.[0]?.volumeInfo;
      if (info) return {
        nazev: info.title || "", autor: (info.authors || []).join(", "),
        pocet_stran: info.pageCount || null,
        rok_vydani: info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) || null : null,
        obalka_url: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
      };
    } catch (e) { /* zkusí se druhý zdroj */ }
    // Open Library
    try {
      const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`);
      const j = await r.json();
      const info = j[`ISBN:${isbn}`];
      if (info) return {
        nazev: info.title || "", autor: (info.authors || []).map((a) => a.name).join(", "),
        pocet_stran: info.number_of_pages || null,
        rok_vydani: info.publish_date ? Number(String(info.publish_date).match(/\d{4}/)?.[0]) || null : null,
        obalka_url: info.cover?.medium || "",
      };
    } catch (e) { /* nic */ }
    return null;
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
      const nalez = await dohledatIsbn(isbn);
      if (!nalez) { $("dohledani-stav").textContent = "Knihu jsem podle ISBN nenašel – vyplň údaje ručně."; $("f-isbn").value = isbn; return; }
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
