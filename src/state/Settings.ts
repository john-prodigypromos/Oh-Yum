// ── Player Settings (persisted to localStorage) ──

// Y-Axis preference:
// false = "standard" — push up → nose goes up
// true  = "inverted" — push up → nose goes down (flight-sim style)
let invertY: boolean = localStorage.getItem('oh-yum-invertY') === 'true';

export function getInvertY(): boolean { return invertY; }
export function setInvertY(val: boolean): void {
  invertY = val;
  localStorage.setItem('oh-yum-invertY', String(val));
}
