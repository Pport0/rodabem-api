const CONECTIVOS = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

// Regra unica da inicial do usuario (#51): primeira e ultima palavra do nome,
// ignorando conectivos. "Ana Paula Lima" -> "AL"; "Joao da Silva" -> "JS".
export function getInitials(name?: string | null, fallback = "U"): string {
  const palavras = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return fallback;

  const significativas = palavras.filter((p) => !CONECTIVOS.has(p.toLowerCase()));
  const usadas = significativas.length > 0 ? significativas : palavras;

  const primeira = usadas[0].charAt(0);
  const ultima = usadas.length > 1 ? usadas[usadas.length - 1].charAt(0) : "";
  return (primeira + ultima).toUpperCase();
}
