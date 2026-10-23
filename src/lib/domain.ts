import { z } from "zod";
export const sourceSchema = z.enum(["github", "demo"]);
export type Source = z.infer<typeof sourceSchema>;
export const identifier = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,100}$/)
  .refine((v) => v !== "." && v !== "..");
export const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  language: z
    .enum([
      "",
      "TypeScript",
      "JavaScript",
      "Python",
      "Go",
      "Rust",
      "Java",
      "Ruby",
    ])
    .default(""),
  label: z
    .enum(["", "good first issue", "help wanted", "documentation", "bug"])
    .default("good first issue"),
  days: z.enum(["", "7", "30", "90"]).default(""),
  sort: z.enum(["updated", "created", "comments"]).default("updated"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  source: sourceSchema.default("github"),
});
export type Search = z.infer<typeof searchSchema>;
export type Opportunity = {
  id: number;
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  url: string;
  labels: string[];
  updatedAt: string;
  comments: number;
  language: string | null;
  source: Source;
};
export const statusLabels = {
  PENDING: "Pendiente",
  INVESTIGATING: "Investigando",
  IN_PROGRESS: "En progreso",
  PR_SENT: "PR enviada",
  COMPLETED: "Completada",
} as const;
export const statusSchema = z.enum([
  "PENDING",
  "INVESTIGATING",
  "IN_PROGRESS",
  "PR_SENT",
  "COMPLETED",
]);
export const prSchema = z
  .string()
  .trim()
  .max(250)
  .refine((v) => {
    if (v === "") return true;
    const m =
      /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/[1-9]\d*$/.exec(
        v,
      );
    return (
      !!m &&
      identifier.safeParse(m[1]).success &&
      identifier.safeParse(m[2]).success
    );
  }, "Usa una URL https://github.com/owner/repo/pull/123");
export const updateSchema = z.object({
  id: z.string().min(1).max(100),
  status: statusSchema,
  notes: z.string().max(10000),
  prUrl: prSchema,
});
export const preferencesSchema = z.object({
  languages: z.array(z.string().trim().min(1).max(40)).max(15),
  technologies: z.array(z.string().trim().min(1).max(40)).max(15),
  interests: z.array(z.string().trim().min(1).max(40)).max(15),
});
export const initialTasks = [
  "Leer las normas de contribución y el contexto del issue",
  "Preparar el entorno y reproducir el problema",
  "Identificar los archivos y conocimientos necesarios",
  "Proponer el cambio y añadir pruebas",
  "Revisar las instrucciones y preparar la pull request",
];
export function assess(
  item: Pick<Opportunity, "labels" | "language" | "title" | "body">,
  preferences?: {
    languages: string[];
    technologies: string[];
    interests: string[];
  } | null,
) {
  const labels = item.labels.map((x) => x.toLowerCase());
  const beginner = labels.includes("good first issue");
  const text = [item.title, item.body, ...item.labels, item.language ?? ""]
    .join(" ")
    .toLowerCase();
  const matches = [
    ...(preferences?.languages ?? []),
    ...(preferences?.technologies ?? []),
    ...(preferences?.interests ?? []),
  ].filter((x) => text.includes(x.toLowerCase()));
  return {
    difficulty: beginner
      ? "Primeros pasos"
      : labels.includes("help wanted")
        ? "Necesita investigación"
        : "Sin estimación suficiente",
    reasons: [
      ...(beginner ? ["El proyecto la etiqueta como good first issue."] : []),
      ...(labels.includes("help wanted")
        ? ["El proyecto solicita ayuda."]
        : []),
      ...Array.from(new Set(matches)).map(
        (x) => `Coincide con tu interés: ${x}.`,
      ),
    ],
    rank: (beginner ? 1 : 0) + matches.length,
  };
}
export function buildQuery(filters: Search, now = new Date()) {
  // Quotes and escapes prevent free text from overriding mandatory search qualifiers.
  const parts = ["is:issue", "is:open", "archived:false"];
  if (filters.q) parts.push(`"${filters.q.replace(/["\\\r\n]/g, " ")}"`);
  if (filters.language) parts.push(`language:${filters.language}`);
  if (filters.label) parts.push(`label:"${filters.label}"`);
  if (filters.days) {
    const d = new Date(now.getTime() - Number(filters.days) * 86400000);
    parts.push(`updated:>=${d.toISOString().slice(0, 10)}`);
  }
  return parts.join(" ");
}
