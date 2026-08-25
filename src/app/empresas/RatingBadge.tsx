import { ratingStyle, starRating } from "@/lib/constants";

export default function RatingBadge({
  valoracion,
  className = "",
}: {
  valoracion: number | null;
  className?: string;
}) {
  const label = starRating(valoracion);
  if (!label) {
    return <span className={`text-slate-300 ${className}`}>—</span>;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${ratingStyle(valoracion)} ${className}`}
    >
      {label}
    </span>
  );
}
