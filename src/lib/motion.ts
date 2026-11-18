/** True when the system asks apps to reduce motion (macOS, Windows and GNOME accessibility settings). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/** Scroll behavior for `scrollIntoView`: jump instead of gliding when motion is reduced. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
