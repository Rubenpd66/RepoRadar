import type { Opportunity, Search } from "./domain";
export const demoOpportunities: Opportunity[] = [
  {
    id: 10001,
    owner: "demo-labs",
    repo: "accessible-ui",
    number: 42,
    title: "Mejorar la navegación por teclado del selector de fechas",
    body: "EJEMPLO FICTICIO. El selector no mantiene el foco al cambiar de mes. Investiga el patrón de teclado, añade una prueba y documenta el comportamiento esperado.\n\nTecnologías: React, TypeScript, accesibilidad.",
    url: "https://github.com/demo-labs/accessible-ui/issues/42",
    labels: ["good first issue", "accessibility", "React"],
    updatedAt: "2026-10-20T10:00:00Z",
    comments: 3,
    language: "TypeScript",
    source: "demo",
  },
  {
    id: 10002,
    owner: "demo-labs",
    repo: "python-toolkit",
    number: 18,
    title: "Documentar los ejemplos de configuración del cliente",
    body: "EJEMPLO FICTICIO. Añadir ejemplos reproducibles para comenzar a usar el cliente de Python. Revisar las instrucciones de contribución antes de comenzar.",
    url: "https://github.com/demo-labs/python-toolkit/issues/18",
    labels: ["help wanted", "documentation"],
    updatedAt: "2026-10-18T10:00:00Z",
    comments: 1,
    language: "Python",
    source: "demo",
  },
  {
    id: 10003,
    owner: "demo-labs",
    repo: "tiny-api",
    number: 73,
    title: "Añadir pruebas para la paginación de resultados",
    body: "EJEMPLO FICTICIO. Comprobar los límites de página y el caso sin resultados. Tecnologías: Go, API REST y pruebas.",
    url: "https://github.com/demo-labs/tiny-api/issues/73",
    labels: ["good first issue", "testing"],
    updatedAt: "2026-10-16T10:00:00Z",
    comments: 5,
    language: "Go",
    source: "demo",
  },
];
export function searchDemo(f: Search) {
  const min = f.days ? Date.now() - Number(f.days) * 86400000 : 0;
  const all = demoOpportunities
    .filter(
      (i) =>
        (!f.language || i.language === f.language) &&
        (!f.label || i.labels.includes(f.label)) &&
        (!f.q ||
          `${i.title} ${i.body}`.toLowerCase().includes(f.q.toLowerCase())) &&
        Date.parse(i.updatedAt) >= min,
    )
    .sort((a, b) =>
      f.sort === "comments"
        ? b.comments - a.comments
        : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );
  return {
    items: all.slice((f.page - 1) * 20, f.page * 20),
    total: all.length,
    incomplete: false,
  };
}
