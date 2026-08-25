"use server";

import ExcelJS from "exceljs";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { createCompany, enrichCompanyFromImport, getCompany, updateCompany } from "@/lib/companies";
import { diffForUpdate, findExistingCompanies, matchRow } from "@/lib/importMatch";
import { inferZona } from "@/lib/zoneMap";
import { parseEspecializacion, parseMarcas } from "@/lib/importParse";
import { calculateNetelScore, netelPrioridadFromScore } from "@/lib/constants";
import { createContact, listContacts } from "@/lib/contacts";
import type { ImportPreviewItem, MappedRow, ParsedFile } from "@/lib/importFields";

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined) return String(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    return "";
  }
  return String(value).trim();
}

export async function parseFileAction(formData: FormData): Promise<ParsedFile> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No se recibió ningún archivo.");

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let table: string[][] = [];

  if (name.endsWith(".csv")) {
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    table = parsed.data;
  } else {
    const workbook = new ExcelJS.Workbook();
    // exceljs's Buffer type predates Node's newer typed-array Buffer generics; runtime value is a real Buffer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("El archivo no tiene hojas.");
    sheet.eachRow((row) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1); // index 0 is unused by ExcelJS
      table.push(values.map(cellToString));
    });
    table = table.filter((r) => r.some((c) => c !== ""));
  }

  if (table.length === 0) throw new Error("El archivo está vacío.");

  const headers = table[0].map((h, i) => (h ? h.trim() : `Columna ${i + 1}`));
  const rows = table.slice(1).filter((r) => r.some((c) => c && c.trim() !== ""));

  return { headers, rows };
}

function buildMappedRows(rows: string[][], mapping: Record<number, string>): MappedRow[] {
  return rows.map((row) => {
    const mapped: MappedRow = {};
    for (const [colIndexStr, field] of Object.entries(mapping)) {
      if (!field || field === "__ignore__") continue;
      const colIndex = Number(colIndexStr);
      const value = row[colIndex]?.trim();
      if (value) mapped[field as keyof MappedRow] = value;
    }
    return mapped;
  });
}

export async function previewImportAction(
  rows: string[][],
  mapping: Record<number, string>
): Promise<ImportPreviewItem[]> {
  const mappedRows = buildMappedRows(rows, mapping);
  const existing = await findExistingCompanies();

  return mappedRows.map((data, rowIndex) => {
    if (!data.empresa) {
      return { rowIndex, data, action: "skip", matchedId: null, matchedName: null, reason: "sin nombre de empresa", conflicts: [] };
    }
    const match = matchRow(data, existing);
    if (match) {
      const existingCompany = existing.find((e) => e.id === match.id)!;
      return {
        rowIndex,
        data,
        action: "update",
        matchedId: match.id,
        matchedName: match.name,
        reason: match.reason,
        conflicts: diffForUpdate(data, existingCompany),
      };
    }
    return { rowIndex, data, action: "new", matchedId: null, matchedName: null, reason: "sin coincidencia", conflicts: [] };
  });
}

// Crea el contacto de decisor/prescriptor si se importó un nombre y todavía no
// existe uno con ese rol para la empresa — evita duplicar en reimportaciones.
async function ensureNetelContact(companyId: number, nombre: string | undefined, rolNetel: string): Promise<void> {
  if (!nombre?.trim()) return;
  const existentes = await listContacts(companyId);
  if (existentes.some((c) => c.rolNetel === rolNetel)) return;
  await createContact({
    companyId,
    nombre: nombre.trim(),
    cargo: null,
    email: null,
    telefono: null,
    fotoUrl: null,
    esPrincipal: false,
    notas: null,
    rolNetel,
    linkedinUrl: null,
  });
}

export async function commitImportAction(
  items: ImportPreviewItem[],
  overwriteConflicts: boolean = false
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    if (item.action === "skip") continue;
    const d = item.data;
    const zonaRuta = inferZona(d.municipio, d.provincia);

    if (item.action === "update" && item.matchedId) {
      const forceOverwrite = overwriteConflicts ? item.conflicts.map((c) => c.field) : [];
      await enrichCompanyFromImport(
        item.matchedId,
        {
          nombreComercial: d.nombreComercial,
          direccion: d.direccion,
          municipio: d.municipio,
          codigoPostal: d.codigoPostal,
          provincia: d.provincia,
          web: d.web,
          email: d.email,
          telefono: d.telefono,
          contacto: d.contacto,
          cargo: d.cargo,
          zonaRuta: zonaRuta ?? undefined,
          clasificacion: d.clasificacion,
          observaciones: d.observaciones ? `Importado ${new Date().toLocaleDateString("es-ES")}: ${d.observaciones}` : undefined,
          // --- Módulo NETEL ---
          netelPrioridad: d.netelPrioridad,
          netelEstrategiaEntrada: d.netelEstrategiaEntrada,
          netelArgumento: d.netelArgumento,
          netelObjecionProbable: d.netelObjecionProbable,
          netelRespuestaSugerida: d.netelRespuestaSugerida,
          netelPreguntaRecepcion: d.netelPreguntaRecepcion,
          nivelInvestigacion: d.nivelInvestigacion,
          fuenteInvestigacion: d.fuenteInvestigacion,
          fechaVerificacionInvestigacion: d.fechaVerificacionInvestigacion,
        },
        forceOverwrite
      );

      // esp_*/marca_* son booleanos: solo activamos las detectadas, sin tocar
      // las que ya estuvieran a true (el parser nunca devuelve false explícito).
      const espDetectada = parseEspecializacion(`${d.clasificacion ?? ""} ${d.especializacion ?? ""}`);
      const marcasDetectadas = parseMarcas(d.marcas ?? "");
      if (Object.keys(espDetectada).length > 0 || Object.keys(marcasDetectadas).length > 0) {
        await updateCompany(item.matchedId, { ...espDetectada, ...marcasDetectadas });
      }

      // Score NETEL: si el CSV ya trae uno (viene de una investigación previa),
      // se respeta tal cual; si no, se calcula a partir de lo que ya sabemos.
      if (!d.netelScore) {
        const current = await getCompany(item.matchedId);
        if (current) {
          const marcasActivas = Object.entries(current)
            .filter(([k, v]) => k.startsWith("marca") && k !== "marcaOtras" && v === true).length;
          const score = calculateNetelScore(current, marcasActivas);
          await updateCompany(item.matchedId, { netelScore: score, netelPrioridad: netelPrioridadFromScore(score) });
        }
      } else {
        const score = Number(d.netelScore);
        await updateCompany(item.matchedId, {
          netelScore: score,
          netelPrioridad: d.netelPrioridad || netelPrioridadFromScore(score),
        });
      }

      await ensureNetelContact(item.matchedId, d.decisorEconomico, "decisor_economico");
      await ensureNetelContact(item.matchedId, d.prescriptorTecnico, "prescriptor_tecnico");

      updated++;
    } else if (item.action === "new") {
      const espDetectada = parseEspecializacion(`${d.clasificacion ?? ""} ${d.especializacion ?? ""}`);
      const marcasDetectadas = parseMarcas(d.marcas ?? "");
      const marcasActivas = Object.keys(marcasDetectadas).length;
      const netelScoreValue = d.netelScore
        ? Number(d.netelScore)
        : calculateNetelScore(
            {
              clasificacion: d.clasificacion ?? null,
              espComunidades: !!espDetectada.espComunidades,
              espControlAccesos: !!espDetectada.espControlAccesos,
              espBarreras: !!espDetectada.espBarreras,
              espParking: !!espDetectada.espParking,
              espLpr: !!espDetectada.espLpr,
              scoreMantenimiento: null,
            },
            marcasActivas
          );
      const netelPrioridadValue = d.netelPrioridad || netelPrioridadFromScore(netelScoreValue);

      const newId = await createCompany({
        empresa: d.empresa!,
        nombreComercial: d.nombreComercial ?? null,
        direccion: d.direccion ?? null,
        municipio: d.municipio ?? null,
        codigoPostal: d.codigoPostal ?? null,
        provincia: d.provincia ?? "Madrid",
        latitud: null,
        longitud: null,
        web: d.web ?? null,
        email: d.email ?? null,
        telefono: d.telefono ?? null,
        whatsapp: null,
        contacto: d.contacto ?? null,
        cargo: d.cargo ?? null,
        logoUrl: null,
        clasificacion: d.clasificacion ?? null,
        espComunidades: !!espDetectada.espComunidades,
        espIndustrial: !!espDetectada.espIndustrial,
        espParking: !!espDetectada.espParking,
        espBarreras: !!espDetectada.espBarreras,
        espControlAccesos: !!espDetectada.espControlAccesos,
        espRfid: !!espDetectada.espRfid,
        espLpr: !!espDetectada.espLpr,
        espAutomatismos: !!espDetectada.espAutomatismos,
        espGarajes: !!espDetectada.espGarajes,
        espEmpresas: !!espDetectada.espEmpresas,
        espAdministradores: !!espDetectada.espAdministradores,
        espResidencial: !!espDetectada.espResidencial,
        marcaNice: !!marcasDetectadas.marcaNice,
        marcaFaac: !!marcasDetectadas.marcaFaac,
        marcaBft: !!marcasDetectadas.marcaBft,
        marcaCame: !!marcasDetectadas.marcaCame,
        marcaHormann: !!marcasDetectadas.marcaHormann,
        marcaMotorline: !!marcasDetectadas.marcaMotorline,
        marcaErreka: !!marcasDetectadas.marcaErreka,
        marcaGibidi: !!marcasDetectadas.marcaGibidi,
        marcaBeninca: !!marcasDetectadas.marcaBeninca,
        marcaRoger: !!marcasDetectadas.marcaRoger,
        marcaDea: !!marcasDetectadas.marcaDea,
        marcaOtras: !!marcasDetectadas.marcaOtras,
        scoreMantenimiento: null,
        scoreComunidades: null,
        scoreControlAccesos: null,
        scoreSatPropio: null,
        scoreTamano: null,
        scoreDelegaciones: null,
        scoreMarcas: null,
        estado: "Pendiente",
        fechaUltimaVisita: null,
        proximaVisita: null,
        proximaVisitaHora: null,
        competidorActual: null,
        objeciones: null,
        observaciones: d.observaciones ?? null,
        productoRecomendado: null,
        argumentario: null,
        zonaRuta,
        jornada: null,
        cif: null,
        razonSocialFiscal: null,
        iban: null,
        banco: null,
        titularCuenta: null,
        formaPago: null,
        plazoPago: null,
        limiteCredito: null,
        documentoBancarioUrl: null,
        lopdFirmado: false,
        lopdFechaFirma: null,
        lopdDocumentoUrl: null,
        valoracion: null,
        scoreEstimadoIa: false,
        // --- Módulo NETEL ---
        netelScore: netelScoreValue,
        netelPrioridad: netelPrioridadValue,
        netelEstrategiaEntrada: d.netelEstrategiaEntrada ?? null,
        netelArgumento: d.netelArgumento ?? null,
        netelObjecionProbable: d.netelObjecionProbable ?? null,
        netelRespuestaSugerida: d.netelRespuestaSugerida ?? null,
        netelPreguntaRecepcion: d.netelPreguntaRecepcion ?? null,
        nivelInvestigacion: d.nivelInvestigacion ?? null,
        fuenteInvestigacion: d.fuenteInvestigacion ?? null,
        fechaVerificacionInvestigacion: d.fechaVerificacionInvestigacion ?? null,
      });

      await ensureNetelContact(newId, d.decisorEconomico, "decisor_economico");
      await ensureNetelContact(newId, d.prescriptorTecnico, "prescriptor_tecnico");

      created++;
    }
  }

  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  revalidatePath("/rutas");
  return { created, updated };
}
