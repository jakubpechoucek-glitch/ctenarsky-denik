// Jednoduché testy výpočtů: node tests/test-stats.js
const S = require("../stats.js");
let chyb = 0;
function over(nazev, skutecne, ocekavane) {
  const ok = JSON.stringify(skutecne) === JSON.stringify(ocekavane);
  if (!ok) { chyb++; console.log(`✗ ${nazev}: vyšlo ${JSON.stringify(skutecne)}, čekáno ${JSON.stringify(ocekavane)}`); }
  else console.log(`✓ ${nazev}`);
}

const knihy = [
  { nazev: "A", pocet_stran: 300, datum_zahajeni: "2026-01-01", datum_dokonceni: "2026-01-10", stav: "doctena", odhad: false },
  { nazev: "B", pocet_stran: 100, datum_zahajeni: "2026-02-01", datum_dokonceni: "2026-02-01", stav: "doctena", odhad: false },
  { nazev: "C", pocet_stran: 200, datum_zahajeni: null, datum_dokonceni: "2026-02-15", stav: "doctena", odhad: true },
  { nazev: "D", pocet_stran: 400, datum_zahajeni: "2026-03-01", datum_dokonceni: null, stav: "rozečtena", odhad: false },
];

over("dny čtení A", S.dnyCteni(knihy[0]), 10);
over("dny čtení B (1 den)", S.dnyCteni(knihy[1]), 1);
over("dny čtení C bez začátku", S.dnyCteni(knihy[2]), null);
over("rychlost A", S.rychlost(knihy[0]), 30);
over("rychlost C bez začátku", S.rychlost(knihy[2]), null);

const s = S.souhrn(knihy);
over("souhrn počet knih", s.knih, 3);
over("souhrn strany", s.stran, 600);
over("souhrn prům. rychlost (400 stran / 11 dní)", Math.round(s.prumernaRychlost * 10) / 10, 36.4);
over("souhrn prům. doba čtení", Math.round(s.prumernaDobaCteni * 10) / 10, 5.5);

const p = S.prehledVCasu(knihy);
over("přehled 2026 knihy", p.roky["2026"].knih, 3);
over("přehled 2026-02 strany", p.mesice["2026-02"].stran, 300);

const e = S.extremy(knihy);
over("nejrychlejší je B", e.nejrychlejsi.nazev, "B");
over("nejpomalejší je A", e.nejpomalejsi.nazev, "A");
over("čtu D dní", S.ctuDni(knihy[3], "2026-03-11"), 11);

console.log(chyb ? `\n${chyb} testů selhalo` : "\nVše prošlo");
process.exit(chyb ? 1 : 0);
