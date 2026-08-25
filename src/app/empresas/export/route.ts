import { NextRequest } from "next/server";
import { listCompanies } from "@/lib/companies";
import { ESPECIALIZACIONES, MARCAS, computeScoreTotal } from "@/lib/constants";

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  "Empresa", "Nombre comercial", "Dirección", "Municipio", "Código Postal", "Provincia",
  "Web", "Email", "Teléfono", "Contacto", "Cargo",
  "Clasificación", "Especialización", "Marcas",
  "Desglose (0-100)", "Valoración (0-5)",
  "Estado", "Fecha última visita", "Próxima visita",
  "Competidor actual", "Objeciones", "Observaciones",
  "Producto recomendado", "Argumentario", "Zona de ruta",
];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const companies = await listCompanies({
    search: sp.get("q") || undefined,
    estado: sp.get("estado") || undefined,
    zonaRuta: sp.get("zona") || undefined,
    provincia: sp.get("provincia") || undefined,
    municipio: sp.get("municipio") || undefined,
  });

  const lines = [HEADERS.map(csvCell).join(",")];
  for (const c of companies) {
    const especializacion = ESPECIALIZACIONES.filter(({ key }) => c[key]).map(({ label }) => label).join("; ");
    const marcas = MARCAS.filter(({ key }) => c[key]).map(({ label }) => label).join("; ");
    lines.push(
      [
        c.empresa, c.nombreComercial, c.direccion, c.municipio, c.codigoPostal, c.provincia,
        c.web, c.email, c.telefono, c.contacto, c.cargo,
        c.clasificacion, especializacion, marcas,
        computeScoreTotal(c), c.valoracion,
        c.estado, c.fechaUltimaVisita, c.proximaVisita,
        c.competidorActual, c.objeciones, c.observaciones,
        c.productoRecomendado, c.argumentario, c.zonaRuta,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM for Excel to detect UTF-8

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm_matic_empresas_${stamp}.csv"`,
    },
  });
}
