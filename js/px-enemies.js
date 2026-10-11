"use strict";
/* =========================================================================
   GOLGOTHA — Pixel-Gegner (PX_ENEMY), Schlüssel = ETYPES-Typ
   Format und Regeln: js/px-core.js, PIXEL-STIL.md. Blick nach rechts, Anker = Körpermitte.
   PX_ENEMY[type]: { w,h,ax,ay, frames:{walk:[2–4], hit?:[1]} }
   ========================================================================= */

/* Verdammter: gebückter Ghul, Kopf vorgestreckt, Krallenarm */
PX_ENEMY.chaser={ w:16,h:12,ax:7,ay:6, frames:{ walk:[[
  ".........FFF....",
  "....RRR.FhhkF...",
  "..rRbbRRFhhhF...",
  ".rRbbbRRRF00F...",
  ".rRbRbRRRRFF....",
  ".rRRbRRRRRRR....",
  ".rrRRRRRRRRRR66.",
  "..rrRRRRRRR..6.6",
  "...rrRRRRr......",
  "...rR...rR......",
  "..rR.....rR.....",
  "..00.....00.....",
],[
  "................",
  ".........FFF....",
  "....RRR.FhhkF...",
  "..rRbbRRFhhhF...",
  ".rRbbbRRRF00F...",
  ".rRbRbRRRRFF.6..",
  ".rRRbRRRRRRRR66.",
  ".rrRRRRRRRRR..6.",
  "..rrRRRRRRR.....",
  "...rrRRRRr......",
  "....rRrR........",
  "....00.00.......",
]] }};
