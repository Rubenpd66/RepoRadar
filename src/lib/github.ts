import { z } from "zod";
import {
  buildQuery,
  identifier,
  type Search,
  type Opportunity,
} from "./domain";
const issueSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable().optional(),
  html_url: z.url(),
  repository_url: z.url(),
  labels: z.array(z.union([z.string(), z.object({ name: z.string() })])),
  updated_at: z.string(),
  comments: z.number(),
  pull_request: z.unknown().optional(),
});
export class GithubError extends Error {
  constructor(
    public kind: "rate" | "network" | "missing" | "upstream" | "busy",
    message: string,
    public retryAt?: number,
  ) {
    super(message);
  }
}
export class GithubClient {
  private cache = new Map<
    string,
    { expires: number; fetchedAt: number; data: unknown }
  >();
  private pending = new Map<string, Promise<unknown>>();
  private blockedUntil = 0;
  private budgets = new Map<string, { count: number; until: number }>();
  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => number = Date.now,
    private wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
    private timeoutMs = 8000,
  ) {}
  async get(path: string): Promise<unknown> {
    if (!/^\/(search\/issues\?|repos\/)/.test(path))
      throw new Error("Ruta de GitHub no permitida");
    const cached = this.cache.get(path);
    if (cached && cached.expires > this.now()) return cached.data;
    const existing = this.pending.get(path);
    if (existing) return existing;
    if (this.blockedUntil > this.now())
      throw new GithubError(
        "rate",
        "GitHub ha limitado las consultas. Inténtalo más tarde.",
        this.blockedUntil,
      );
    if (this.pending.size >= 8)
      throw new GithubError(
        "busy",
        "Hay varias búsquedas en curso. Espera un momento.",
      );
    const promise = this.request(path)
      .then((data) => {
        if (this.cache.size >= 300)
          this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(path, {
          data,
          expires: this.now() + 120000,
          fetchedAt: this.now(),
        });
        return data;
      })
      .finally(() => this.pending.delete(path));
    this.pending.set(path, promise);
    return promise;
  }
  private async request(path: string) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const resource = path.startsWith("/search/") ? "search" : "core";
      const budget = this.budgets.get(resource),
        max = resource === "search" ? 8 : 40;
      if (budget && budget.until > this.now()) {
        if (budget.count >= max)
          throw new GithubError(
            "rate",
            "Se ha alcanzado el presupuesto de consultas de RepoRadar. Espera un minuto.",
            budget.until,
          );
        budget.count++;
      } else
        this.budgets.set(resource, { count: 1, until: this.now() + 60000 });
      let response: Response;
      try {
        response = await this.fetcher(`https://api.github.com${path}`, {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "RepoRadar",
          },
          signal: AbortSignal.timeout(this.timeoutMs),
          cache: "no-store",
          redirect: "error",
        });
      } catch {
        throw new GithubError(
          "network",
          "No se ha podido conectar con GitHub. Comprueba la conexión y vuelve a intentarlo.",
        );
      }
      const remaining = response.headers.get("x-ratelimit-remaining");
      const retry = response.headers.get("retry-after");
      let secondary = false;
      if (response.status === 403) {
        try {
          const body = await response.clone().json();
          secondary =
            typeof body.message === "string" &&
            /rate limit/i.test(body.message);
        } catch {
          /* Non-JSON denial remains an upstream error. */
        }
      }
      if (
        response.status === 429 ||
        (response.status === 403 &&
          (remaining === "0" || retry !== null || secondary))
      ) {
        const retryMs = retry
          ? Number.isFinite(Number(retry))
            ? Number(retry) * 1000
            : Date.parse(retry) - this.now()
          : 60000;
        const reset =
          Number(response.headers.get("x-ratelimit-reset") ?? 0) * 1000;
        this.blockedUntil = Math.max(
          this.now() + Math.max(1000, retryMs || 60000),
          reset,
        );
        throw new GithubError(
          "rate",
          "GitHub ha limitado las consultas. Espera antes de repetir.",
          this.blockedUntil,
        );
      }
      if (response.status === 404)
        throw new GithubError(
          "missing",
          "No se ha encontrado el recurso público en GitHub.",
        );
      if (response.status >= 500 && attempt === 0) {
        await this.wait(300);
        continue;
      }
      if (!response.ok)
        throw new GithubError(
          "upstream",
          `GitHub no ha podido resolver la consulta (HTTP ${response.status}).`,
        );
      try {
        return (await response.json()) as unknown;
      } catch {
        throw new GithubError(
          "upstream",
          "GitHub ha devuelto una respuesta que no se puede leer.",
        );
      }
    }
    throw new GithubError("upstream", "GitHub no está disponible.");
  }
  async search(filters: Search) {
    const params = new URLSearchParams({
      q: buildQuery(filters),
      sort: filters.sort,
      order: "desc",
      per_page: "20",
      page: String(filters.page),
    });
    try {
      const result = z
        .object({
          total_count: z.number(),
          incomplete_results: z.boolean(),
          items: z.array(issueSchema),
        })
        .parse(await this.get(`/search/issues?${params}`));
      return {
        total: result.total_count,
        incomplete: result.incomplete_results,
        items: result.items
          .filter((i) => !i.pull_request)
          .map((i) => this.normalize(i, filters.language || null)),
      };
    } catch (e) {
      if (e instanceof GithubError) throw e;
      throw new GithubError(
        "upstream",
        "La respuesta de GitHub tiene un formato inesperado.",
      );
    }
  }
  private normalize(
    i: z.infer<typeof issueSchema>,
    language: string | null,
  ): Opportunity {
    const u = new URL(i.repository_url);
    const [owner, repo] = u.pathname.split("/").slice(2);
    if (
      u.hostname !== "api.github.com" ||
      !identifier.safeParse(owner).success ||
      !identifier.safeParse(repo).success
    )
      throw new Error("Repositorio inválido");
    return {
      id: i.id,
      owner,
      repo,
      number: i.number,
      title: i.title,
      body: i.body ?? "",
      url: `https://github.com/${owner}/${repo}/issues/${i.number}`,
      labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)),
      updatedAt: i.updated_at,
      comments: i.comments,
      language,
      source: "github",
    };
  }
  async issue(owner: string, repo: string, number: number) {
    identifier.parse(owner);
    identifier.parse(repo);
    z.number().int().positive().max(2147483647).parse(number);
    const root = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const raw = issueSchema.parse(await this.get(`${root}/issues/${number}`));
    if (raw.pull_request)
      throw new GithubError(
        "missing",
        "Este enlace corresponde a una pull request, no a un issue.",
      );
    const metadata = z
      .object({ language: z.string().nullable() })
      .parse(await this.get(root));
    let contributing: string | null = null;
    try {
      const rules = z
        .object({
          files: z.object({
            contributing: z.object({ html_url: z.url() }).nullable().optional(),
          }),
        })
        .parse(await this.get(`${root}/community/profile`));
      const url = rules.files.contributing?.html_url;
      if (url?.startsWith("https://github.com/")) contributing = url;
    } catch (e) {
      if (!(e instanceof GithubError && e.kind === "missing")) throw e;
    }
    return { item: this.normalize(raw, metadata.language), contributing };
  }
  async pull(url: string) {
    const m =
      /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)$/.exec(
        url,
      );
    if (
      !m ||
      !identifier.safeParse(m[1]).success ||
      !identifier.safeParse(m[2]).success
    )
      throw new Error("URL de PR inválida");
    const path = `/repos/${m[1]}/${m[2]}/pulls/${m[3]}`;
    const result = z
      .object({
        state: z.enum(["open", "closed"]),
        merged: z.boolean(),
        title: z.string(),
      })
      .parse(await this.get(path));
    return {
      ...result,
      checkedAt: new Date(
        this.cache.get(path)?.fetchedAt ?? this.now(),
      ).toISOString(),
    };
  }
}
export const github = new GithubClient();
