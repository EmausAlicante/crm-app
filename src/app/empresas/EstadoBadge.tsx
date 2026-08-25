import { contrastTextColor } from "@/lib/color";

// Fallback for the (rare) case a caller doesn't have the phase's saved color
// at hand yet — keeps badges from all going flat gray during rollout.
const FALLBACK_STYLES: Record<string, string> = {
  Pendiente: "bg-slate-100 text-slate-700",
  Contactado: "bg-sky-100 text-sky-700",
  "Visita programada": "bg-indigo-100 text-indigo-700",
  Visitado: "bg-amber-100 text-amber-700",
  Negociación: "bg-purple-100 text-purple-700",
  Cliente: "bg-emerald-100 text-emerald-700",
  Descartado: "bg-red-100 text-red-700",
};

export default function EstadoBadge({
  estado,
  color,
  className = "",
}: {
  estado: string;
  color?: string;
  className?: string;
}) {
  if (color) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}
        style={{ backgroundColor: color, color: contrastTextColor(color) }}
      >
        {estado}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
        FALLBACK_STYLES[estado] ?? "bg-slate-100 text-slate-700"
      } ${className}`}
    >
      {estado}
    </span>
  );
}
