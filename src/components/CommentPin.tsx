interface Props {
  number: number;
  xPercent: number;
  yPercent: number;
  /** Called when the pin is clicked. Receives the MouseEvent so callers can stopPropagation. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** A numbered circular pin rendered at an absolute percentage position over the canvas. */
export default function CommentPin({ number, xPercent, yPercent, onClick }: Props) {
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
        transform: "translate(-50%, -50%)",
        zIndex: 10,
      }}
      className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
    >
      {number}
    </button>
  );
}
