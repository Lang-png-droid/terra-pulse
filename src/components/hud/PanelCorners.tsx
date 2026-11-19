const HAIRLINE = '1px solid rgba(34,211,238,0.55)';

/**
 * Four 6x6 corner brackets drawn as border segments. Purely decorative, so it is
 * pointer-events-none and aria-hidden; the parent must be `relative`.
 */
export function PanelCorners() {
  const base = 'absolute w-[6px] h-[6px] pointer-events-none';
  return (
    <span aria-hidden="true">
      <span className={base} style={{ top: 0, left: 0, borderTop: HAIRLINE, borderLeft: HAIRLINE }} />
      <span className={base} style={{ top: 0, right: 0, borderTop: HAIRLINE, borderRight: HAIRLINE }} />
      <span className={base} style={{ bottom: 0, left: 0, borderBottom: HAIRLINE, borderLeft: HAIRLINE }} />
      <span className={base} style={{ bottom: 0, right: 0, borderBottom: HAIRLINE, borderRight: HAIRLINE }} />
    </span>
  );
}
