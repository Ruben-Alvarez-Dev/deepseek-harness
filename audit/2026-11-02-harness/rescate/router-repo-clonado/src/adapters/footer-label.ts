/**
 * Footer label shown next to Pi's model indicator: `#<account>/<total> <model>`.
 * The text colour is a continuous green → yellow → orange → red ramp driven by the RPM usage of
 * the account in use (truecolor, not a fixed handful of steps). Anomaly glyphs are appended only
 * when present. Model truncation targets 24 code points; wide glyphs and large extras can exceed it.
 */
export interface FooterLabelInput {
  /** 1-based index of the account in use (or next), undefined when nothing can dispatch. */
  index?: number;
  total: number;
  model: string;
  /** Rolling-window usage of that account's pool in [0,1]. */
  usage: number;
  waiting: number;
  cooldownMs: number;
  disabled: number;
  /** Number of in-flight shadow regenerations (L3). */
  shadowing?: number;
}

export const FOOTER_MAX_WIDTH = 24;

/** Continuous HSL hue ramp 145° (green) → 0° (red); lightness lifted mid-ramp for legibility. */
export function gradientRgb(usage: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, Number.isFinite(usage) ? usage : 1));
  const hue = 145 * (1 - u) ** 0.85;
  const saturation = 0.78;
  const lightness = 0.52 + 0.06 * Math.sin(Math.PI * u);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const h = hue / 60;
  const x = chroma * (1 - Math.abs((h % 2) - 1));
  const [r, g, b] =
    h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0] : h < 3 ? [0, chroma, x] : [0, x, chroma];
  const m = lightness - chroma / 2;
  return [r, g, b].map((c) => Math.round((c + m) * 255)) as [number, number, number];
}

const paint = (text: string, [r, g, b]: [number, number, number]) =>
  `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;

export function footerLabel(input: FooterLabelInput): { text: string; plain: string } {
  const prefix = `#${input.index ?? "–"}/${input.total}`;
  const extras = [
    input.waiting > 0 ? `⏳${input.waiting}` : "",
    input.cooldownMs > 0 ? `❄${Math.ceil(input.cooldownMs / 1000)}s` : "",
    input.disabled > 0 ? `⚠${input.disabled}` : "",
    input.shadowing && input.shadowing > 0 ? `S${input.shadowing}` : "",
  ].filter(Boolean);
  const tail = extras.length ? ` ${extras.join("")}` : "";
  const room = FOOTER_MAX_WIDTH - [...prefix].length - 1 - [...tail].length;
  let model = input.model;
  if (room < [...model].length)
    model = room > 1 ? `${[...model].slice(0, room - 1).join("")}…` : "";
  const plain = `${prefix}${model ? ` ${model}` : ""}${tail}`;
  const color = input.index === undefined ? gradientRgb(1) : gradientRgb(input.usage);
  return { text: paint(plain, color), plain };
}
