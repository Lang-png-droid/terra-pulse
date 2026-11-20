export interface CalloutBox {
  cursorX: number;
  cursorY: number;
  width: number;
  height: number;
  viewportW: number;
  viewportH: number;
  rectLeft: number;
  rectTop: number;
  topStripBottom?: number | null;
  bottomStripTop?: number | null;
}

// Place the callout beside the cursor, flip it when it would leave the
// viewport, then clamp. Sizes are measured, never assumed: the node is
// whitespace-pre with a content-dependent line count. When the band between
// the two HUD strips is shorter than the callout, the top edge wins and the
// bottom is allowed to clip - a cut foot beats an unreadable top edge.
export function clampCallout(b: CalloutBox): { left: number; top: number } {
  const gap = 12;
  let left = b.rectLeft + b.cursorX + gap;
  if (left + b.width > b.viewportW) left = b.rectLeft + b.cursorX - b.width - gap;
  left = Math.min(Math.max(0, left), Math.max(0, b.viewportW - b.width));

  let top = b.rectTop + b.cursorY + gap;
  if (top + b.height > b.viewportH) top = b.rectTop + b.cursorY - b.height - gap;

  const topMin = b.topStripBottom != null ? b.topStripBottom + 4 : 0;
  const topMax = b.bottomStripTop != null ? b.bottomStripTop - 4 - b.height : b.viewportH - b.height;
  top = topMax < topMin ? topMin : Math.min(Math.max(top, topMin), topMax);

  return { left, top };
}
