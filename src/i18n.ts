// Minimal i18n for the study tool. Two languages: en (default) and pt
// (Portuguese — PT-PT terminology: "perda" not "estol", "a subir" /
// "a descer", "planeamento", etc.). Letters L/W/T/D and acronyms
// IAS/AoA/Vs are kept in English in both because that's how pilots learn
// the formulas. Force NAMES are translated and the English term is kept
// in parens for cross-reference: "Sustentação (Lift)", "Peso (Weight)",
// "Tração (Thrust)", "Resistência Aerodinâmica (Drag)" — note: drag is
// "Resistência Aerodinâmica", NOT "arrasto" (which is BR usage).

import { createContext, useContext } from 'react';

export type Lang = 'en' | 'pt';

const en = {
  // Header / frontispiece
  headerSubtitle: 'AERODYNAMIC STUDY SUPPLEMENT · CESSNA 152',
  titlePrinciples: 'Principles',
  titleOf: 'of',
  titleFlight: 'Flight',
  disclaimer: 'Study aid · simplified model · may contain inaccuracies',
  configStamp: '1670 lb · normal cat.',

  // Card titles
  fig1a: 'Fig 1·A — Side profile',
  fig1b: 'Fig 1·B — Aft view',
  fig2: 'Fig 2 — Lift coefficient Cₗ vs α',
  fig3: 'Fig 3 — Drag curves D vs V',

  // Card asides
  clean: 'CLEAN',
  flapsAside: 'FLAPS',

  // Side-view legend — letter + full force name + brief description
  legendL: 'L · Lift ⟂ flight path',
  legendW: 'W · Weight ↓',
  legendT: 'T · Thrust along fuselage',
  legendD: 'D · Drag opp. flight path',

  // Aft-view legend
  legendLAft: 'L · Lift tilts with wings',
  legendWAft: 'W · Weight stays vertical',
  legendLcosphi: 'L cos φ, L sin φ',
  legendTurnDir: 'turn direction',

  // Diagram annotations (drawn inside the SVGs)
  horizon: 'HORIZON',
  flightPath: 'FLIGHT PATH',
  turn: 'TURN',

  // Drag chart inline
  parasiteLegend: 'parasite ∝ V²',
  inducedLegend: 'induced ∝ 1/V²',
  totalLegend: 'total',
  totalDragAtTrim: 'Total drag at trim',
  offTrim: 'Off-trim',
  outsideTrimBand: 'outside steady-trim band',
  airspeedAxis: 'Airspeed (kt)',
  dragAxis: 'Drag (N)',
  alphaAxis: 'Angle of attack α (°)',
  clAxis: 'Lift coefficient CL',
  // Pedagogical annotations on the CL chart
  stallRegion: 'stall',
  alphaCritical: 'α critical',
  vsLabel: 'Vs',
  vsHint: 'min flight speed',
  pedagogyTitle: 'How this chart answers "what is the minimum flight speed?"',
  pedagogyL1: 'In level flight, lift equals weight: L = W.',
  pedagogyL2: 'Since L = ½ρV²·S·CL, isolating V gives:',
  pedagogyFormula: 'V = √(2W / (ρ·S·CL))',
  pedagogyL3: 'Higher CL → lower minimum speed.',
  pedagogyL4: 'The peak of the curve (CL max) is therefore the slowest level flight — Vs. Past the peak the wing stalls.',

  // Console cartouche
  consoleTitle: 'CONSOLE · PILOT INPUTS',
  step: 'STEP',
  attitude: 'ATTITUDE',
  nudge: 'NUDGE',
  throttle: 'THROTTLE',
  flaps: 'FLAPS',
  scenario: 'SCENARIO',
  stateDerived: 'STATE · DERIVED',
  bankPresets: 'BANK φ — PRESETS · STEP 5°',
  pitchLabel: 'PITCH θ',
  stepPitchLabel: 'STEP 2.5°',
  percent: 'PERCENT',
  expand: 'EXPAND',
  collapse: 'COLLAPSE',
  reset: 'reset',

  // Keyboard
  keyboard: 'KEYBOARD',
  keyboardOn: 'KEYBOARD ON',
  keyboardOff: 'KEYBOARD OFF',
  keyboardModeLabel: 'KEYBOARD MODE',
  keyboardUnbound: 'Unbound key. Press',
  keyboardToDisable: 'to disable keyboard control.',

  // Status
  statusLevel: 'level',
  statusClimbing: 'climbing',
  statusDescending: 'descending',
  statusNearStall: 'near stall',
  statusStalled: 'stalled',
  statusPullUp: 'pull-up',
  statusUnloaded: 'unloaded',

  // Status (uppercase for the stall stamp)
  stalledStamp: 'STALLED',

  // Readouts
  ias: 'IAS',
  aoa: 'α — AoA',
  gammaFlightPath: 'γ — flight path',
  nLoad: 'n — load',
  vs: 'Vs',
  margin: 'margin V−Vs',
  ld: 'L/D',
  status: 'STATUS',
  alphaStallRatio: 'α/α_stall',

  // Scenarios (must match keys against PRESETS by .name)
  scenarioCruise: 'Cruise',
  scenarioVyClimb: 'Vy climb',
  scenarioApproach: 'Approach',
  scenarioEngineOut: 'Engine out (glide)',
  scenarioStall: 'Stall',

  // Force tags (rendered next to the L/W/T/D letter)
  forceL: 'Lift',
  forceW: 'Weight',
  forceT: 'Thrust',
  forceD: 'Drag',

  // Theme switcher (kept lowercase keywords)
  themeAuto: 'auto',
  themeLight: 'light',
  themeDark: 'dark',

  // Footer
  footer: 'Educational tool — not for flight planning.',
};

const pt: typeof en = {
  headerSubtitle: 'SUPLEMENTO DE ESTUDO AERODINÂMICO · CESSNA 152',
  titlePrinciples: 'Princípios',
  titleOf: 'do',
  titleFlight: 'Voo',
  disclaimer: 'Material de estudo · modelo simplificado · pode conter imprecisões',
  configStamp: '1670 lb · cat. normal',

  fig1a: 'Fig 1·A — Perfil lateral',
  fig1b: 'Fig 1·B — Vista traseira',
  fig2: 'Fig 2 — Coeficiente de sustentação Cₗ vs α',
  fig3: 'Fig 3 — Curvas de Resistência Aerodinâmica D vs V',

  clean: 'LIMPO',
  flapsAside: 'FLAPES',

  // Letter + Portuguese name + (English in parens) + descrição breve.
  legendL: 'L · Sustentação (Lift) ⟂ trajetória',
  legendW: 'W · Peso (Weight) ↓',
  legendT: 'T · Tração (Thrust) pela fuselagem',
  legendD: 'D · Resistência Aerodinâmica (Drag) oposto à trajetória',

  legendLAft: 'L · Sustentação (Lift) acompanha as asas',
  legendWAft: 'W · Peso (Weight) permanece vertical',
  legendLcosphi: 'L cos φ, L sin φ',
  legendTurnDir: 'direção da curva',

  horizon: 'HORIZONTE',
  flightPath: 'TRAJETÓRIA',
  turn: 'CURVA',

  parasiteLegend: 'Resist. parasita ∝ V²',
  inducedLegend: 'Resist. induzida ∝ 1/V²',
  totalLegend: 'total',
  totalDragAtTrim: 'Resistência aerodinâmica total trimada',
  offTrim: 'Fora do trim',
  outsideTrimBand: 'fora da faixa de trim estável',
  airspeedAxis: 'Velocidade (kt)',
  dragAxis: 'Resistência aerodinâmica (N)',
  alphaAxis: 'Ângulo de ataque α (°)',
  clAxis: 'Coef. de sustentação CL',
  stallRegion: 'perda',
  alphaCritical: 'α crítico',
  vsLabel: 'Vs',
  vsHint: 'velocidade mínima',
  pedagogyTitle: 'Como este gráfico responde a "qual é a velocidade mínima de voo?"',
  pedagogyL1: 'Em voo nivelado, sustentação = peso: L = W.',
  pedagogyL2: 'Como L = ½ρV²·S·CL, isolando V obtemos:',
  pedagogyFormula: 'V = √(2W / (ρ·S·CL))',
  pedagogyL3: 'Maior CL → menor velocidade mínima.',
  pedagogyL4: 'O pico da curva (CL max) é portanto a velocidade mais baixa em voo nivelado — Vs. Passar o pico = perda.',

  consoleTitle: 'CONSOLE · COMANDOS DO PILOTO',
  step: 'PASSO',
  attitude: 'ATITUDE',
  nudge: 'AJUSTE FINO',
  throttle: 'POTÊNCIA',
  flaps: 'FLAPES',
  scenario: 'CENÁRIO',
  stateDerived: 'ESTADO · DERIVADO',
  bankPresets: 'INCL. φ — AJUSTES · PASSO 5°',
  pitchLabel: 'ARFAGEM θ',
  stepPitchLabel: 'PASSO 2.5°',
  percent: 'PERCENTO',
  expand: 'EXPANDIR',
  collapse: 'RECOLHER',
  reset: 'reset',

  keyboard: 'TECLADO',
  keyboardOn: 'TECLADO LIGADO',
  keyboardOff: 'TECLADO DESLIGADO',
  keyboardModeLabel: 'MODO TECLADO',
  keyboardUnbound: 'Tecla sem função. Pressione',
  keyboardToDisable: 'para desativar o teclado.',

  statusLevel: 'nivelado',
  statusClimbing: 'a subir',
  statusDescending: 'a descer',
  statusNearStall: 'quase em perda',
  statusStalled: 'em perda',
  statusPullUp: 'a cabrar',
  statusUnloaded: 'aliviado',

  stalledStamp: 'EM PERDA',

  ias: 'IAS',
  aoa: 'α — ângulo',
  gammaFlightPath: 'γ — trajetória',
  nLoad: 'n — carga',
  vs: 'Vs',
  margin: 'margem V−Vs',
  ld: 'L/D',
  status: 'ESTADO',
  alphaStallRatio: 'α/α_perda',

  scenarioCruise: 'Cruzeiro',
  scenarioVyClimb: 'Subida Vy',
  scenarioApproach: 'Aproximação',
  scenarioEngineOut: 'Pane motor (planeio)',
  scenarioStall: 'Perda',

  // PT keeps the English term in parens so students learn both:
  // letter stays English (formulas), name is translated, English in parens.
  forceL: 'Sustentação (Lift)',
  forceW: 'Peso (Weight)',
  forceT: 'Tração (Thrust)',
  forceD: 'Resistência Aerodinâmica (Drag)',

  themeAuto: 'auto',
  themeLight: 'claro',
  themeDark: 'escuro',

  footer: 'Ferramenta educativa — não usar para planeamento de voo.',
};

export const translations = { en, pt };
export type Translations = typeof en;

export const I18nContext = createContext<{
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
}>({
  lang: 'en',
  t: en,
  setLang: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

// Helper to translate a preset .name string from the physics module.
export function translatePresetName(name: string, t: Translations): string {
  switch (name) {
    case 'Cruise': return t.scenarioCruise;
    case 'Vy climb': return t.scenarioVyClimb;
    case 'Approach': return t.scenarioApproach;
    case 'Engine out (glide)': return t.scenarioEngineOut;
    case 'Stall': return t.scenarioStall;
    default: return name;
  }
}

// Translate a FlightStatus enum value to its display string.
export function translateStatus(
  status: 'level' | 'climbing' | 'descending' | 'near-stall' | 'stalled' | 'pull-up' | 'unloaded',
  t: Translations,
): string {
  switch (status) {
    case 'level': return t.statusLevel;
    case 'climbing': return t.statusClimbing;
    case 'descending': return t.statusDescending;
    case 'near-stall': return t.statusNearStall;
    case 'stalled': return t.statusStalled;
    case 'pull-up': return t.statusPullUp;
    case 'unloaded': return t.statusUnloaded;
  }
}
