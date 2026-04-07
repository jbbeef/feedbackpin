"use client";

interface Props {
  number: number;
  xPercent: number;
  yPercent: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  resolved?: boolean;
}

/**
 * A numbered circular pin rendered at an absolute percentage position over
 * the canvas. Plays a spring entry animation on mount.
 */
export default function CommentPin({
  number,
  xPercent,
  yPercent,
  onClick,
  resolved = false,
}: Props) {
  return (
    <button
      data-pin
      data-testid={`comment-pin-${number}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      style={{
        position: "absolute",
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: resolved ? "var(--color-text-tertiary)" : "var(--color-accent)",
        opacity: resolved ? 0.6 : 1,
        border: "2px solid rgba(255,255,255,0.9)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        color: "white",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        // Spring entry — only plays on first mount (React reuses keyed elements)
        animation: "pin-drop 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        // Hover/active transitions via CSS scale property (composes with transform)
        transition: "scale 150ms ease-out, box-shadow 150ms ease-out",
      }}
      // Tailwind v4: CSS `scale` property composes independently with transform
      className="hover:[scale:1.1] active:[scale:0.93]"
    >
      {number}
    </button>
  );
}
