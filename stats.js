// Statistiky čtení – čisté výpočty bez práce se stránkou (jde testovat v Node).
// Záznam knihy: { nazev, autor, pocet_stran, datum_zahajeni, datum_dokonceni, stav, odhad }
// Data jsou řetězce 'YYYY-MM-DD' nebo null.
(function (global) {
  "use strict";

  function denMs(d) {
    // Půlnoc UTC, ať rozdíl dní neovlivní časové pásmo
    const [r, m, dd] = d.split("-").map(Number);
    return Date.UTC(r, m - 1, dd);
  }

  // Počet dní čtení včetně prvního i posledního dne; null, když data chybí.
  function dnyCteni(k) {
    if (!k.datum_zahajeni || !k.datum_dokonceni) return null;
    const d = Math.round((denMs(k.datum_dokonceni) - denMs(k.datum_zahajeni)) / 86400000) + 1;
    return d >= 1 ? d : null;
  }

  // Stran za den; null, když nejde spočítat.
  function rychlost(k) {
    const d = dnyCteni(k);
    if (!d || !k.pocet_stran) return null;
    return k.pocet_stran / d;
  }

  function jeDoctena(k) { return k.stav === "doctena" && !!k.datum_dokonceni; }

  // Souhrn za všechny dočtené knihy.
  function souhrn(knihy) {
    const doc = knihy.filter(jeDoctena);
    const strany = doc.reduce((s, k) => s + (k.pocet_stran || 0), 0);
    const sRychlosti = doc.filter((k) => rychlost(k) !== null);
    const dnyCelkem = sRychlosti.reduce((s, k) => s + dnyCteni(k), 0);
    const stranySRychlosti = sRychlosti.reduce((s, k) => s + k.pocet_stran, 0);
    return {
      knih: doc.length,
      stran: strany,
      prumernaRychlost: dnyCelkem ? stranySRychlosti / dnyCelkem : null, // stran/den, váženě
      prumernaDobaCteni: sRychlosti.length ? dnyCelkem / sRychlosti.length : null, // dní na knihu
      knihSRychlosti: sRychlosti.length,
    };
  }

  // Počty knih a stran podle dokončení v letech / měsících.
  // Vrací { roky: {2025: {knih, stran}}, mesice: {'2025-03': {knih, stran}} }
  function prehledVCasu(knihy) {
    const roky = {}, mesice = {};
    for (const k of knihy.filter(jeDoctena)) {
      const rok = k.datum_dokonceni.slice(0, 4);
      const mesic = k.datum_dokonceni.slice(0, 7);
      for (const [mapa, klic] of [[roky, rok], [mesice, mesic]]) {
        mapa[klic] = mapa[klic] || { knih: 0, stran: 0 };
        mapa[klic].knih += 1;
        mapa[klic].stran += k.pocet_stran || 0;
      }
    }
    return { roky, mesice };
  }

  // Nejrychlejší a nejpomalejší kniha (z těch, u nichž jde rychlost spočítat).
  function extremy(knihy) {
    const s = knihy.filter((k) => jeDoctena(k) && rychlost(k) !== null);
    if (!s.length) return { nejrychlejsi: null, nejpomalejsi: null };
    const serazene = [...s].sort((a, b) => rychlost(b) - rychlost(a));
    return { nejrychlejsi: serazene[0], nejpomalejsi: serazene[serazene.length - 1] };
  }

  // Kolik dní už knihu čtu (k dnešnímu datu 'YYYY-MM-DD').
  function ctuDni(k, dnes) {
    if (!k.datum_zahajeni) return null;
    const d = Math.round((denMs(dnes) - denMs(k.datum_zahajeni)) / 86400000) + 1;
    return d >= 1 ? d : null;
  }

  // Porovnání dvou souhrnů (aktuální vs. předchozí období):
  // pro každou metriku rozdíl a procentuální změnu; chybějící hodnoty → null
  function porovnani(akt, pred) {
    function polozka(a, p) {
      if (a === null || a === undefined || p === null || p === undefined) return null;
      return { delta: a - p, pct: p !== 0 ? ((a - p) / Math.abs(p)) * 100 : null };
    }
    return {
      knih: polozka(akt.knih, pred.knih),
      stran: polozka(akt.stran, pred.stran),
      prumernaRychlost: polozka(akt.prumernaRychlost, pred.prumernaRychlost),
      prumernaDobaCteni: polozka(akt.prumernaDobaCteni, pred.prumernaDobaCteni),
    };
  }

  const api = { dnyCteni, rychlost, souhrn, prehledVCasu, extremy, ctuDni, porovnani };
  global.Statistiky = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
