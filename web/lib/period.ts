export type PeriodoTipo = "dia" | "semana" | "mes" | "ano";

export function calcularPeriodo(
  tipo: PeriodoTipo,
  ref: Date = new Date()
): { inicio: Date; fim: Date } {
  const fim = new Date(ref);
  let inicio = new Date(ref);

  switch (tipo) {
    case "dia":
      // apenas hoje
      break;
    case "semana":
      inicio = new Date(ref);
      inicio.setDate(inicio.getDate() - 6);
      break;
    case "mes":
      inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
      break;
    case "ano":
      inicio = new Date(ref.getFullYear(), 0, 1);
      break;
  }

  return { inicio, fim };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Formato YYYY-MM-DD, usado por relatórios de campanha (discador, pausas, login/logoff) */
export function formatoYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Formato YYYY/MM/DD HH:MM:SS, usado por relatórios de tabulações/gravações/satisfação */
export function formatoYMDBarraHora(d: Date, horaFinal = false): string {
  const hora = horaFinal ? "23:59:59" : "00:00:00";
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${hora}`;
}

export const PERIODO_LABELS: Record<PeriodoTipo, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  ano: "Ano",
};
