/**
 * "[SCROLL TO MOVE FORWARD]" with even spacing. The parent's wide tracking also spaces the
 * brackets, so "[ S" and "D ]" get the same gap as the letters, but there is no trailing
 * letter-space after "]" (so it sits flush when right-aligned and truly centred when centred).
 */
export function ScrollHintLabel({ children = "Scroll to move forward" }: { children?: string }) {
  return (
    <>
      [{children}
      <span className="tracking-normal">]</span>
    </>
  );
}
