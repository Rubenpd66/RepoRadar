import { describe, it, expect, vi } from "vitest";
import { GithubClient, GithubError } from "../../src/lib/github";
import { searchSchema } from "../../src/lib/domain";
const item = {
  id: 1,
  number: 42,
  title: "Fix focus",
  body: "Safe text",
  html_url: "https://github.com/org/repo/issues/42",
  repository_url: "https://api.github.com/repos/org/repo",
  labels: [{ name: "good first issue" }],
  updated_at: "2026-10-20T10:00:00Z",
  comments: 3,
};
const ok = (items: unknown[] = [item]) =>
  new Response(
    JSON.stringify({
      total_count: items.length,
      incomplete_results: false,
      items,
    }),
    { status: 200 },
  );
const filters = searchSchema.parse({});
describe("cliente de GitHub", () => {
  it("normaliza resultados y transmite paginación", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(ok());
    const result = await new GithubClient(fetcher).search({
      ...filters,
      page: 2,
    });
    expect(result.items[0]).toMatchObject({
      owner: "org",
      repo: "repo",
      source: "github",
      number: 42,
    });
    expect(String(fetcher.mock.calls[0][0])).toContain("page=2");
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty(
      "Authorization",
    );
  });
  it("devuelve vacío y descarta PR", async () => {
    const c = new GithubClient(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(ok([{ ...item, pull_request: { url: "x" } }])),
    );
    expect((await c.search(filters)).items).toHaveLength(0);
    expect(
      (
        await new GithubClient(
          vi.fn<typeof fetch>().mockResolvedValue(ok([])),
        ).search(filters)
      ).total,
    ).toBe(0);
  });
  it("deduplica solicitudes y expira caché", async () => {
    let now = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => ok());
    const c = new GithubClient(fetcher, () => now);
    await Promise.all([c.search(filters), c.search(filters)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await c.search(filters);
    expect(fetcher).toHaveBeenCalledTimes(1);
    now = 120001;
    await c.search(filters);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("respeta Retry-After y no repite durante el bloqueo", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("{}", { status: 429, headers: { "Retry-After": "60" } }),
      );
    const c = new GithubClient(fetcher, () => 1000);
    await expect(c.search(filters)).rejects.toMatchObject({
      kind: "rate",
      retryAt: 61000,
    });
    await expect(c.search({ ...filters, page: 2 })).rejects.toBeInstanceOf(
      GithubError,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("respeta el reset primario y distingue un 403 sin límite", async () => {
    const limited = new GithubClient(
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response("{}", {
          status: 403,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "120",
          },
        }),
      ),
      () => 1000,
    );
    await expect(limited.search(filters)).rejects.toMatchObject({
      kind: "rate",
      retryAt: 120000,
    });
    const denied = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { status: 403 }));
    await expect(
      new GithubClient(denied).search(filters),
    ).rejects.toMatchObject({ kind: "upstream" });
    expect(denied).toHaveBeenCalledTimes(1);
  });
  it("reintenta solo una vez un error transitorio", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(ok());
    const wait = vi.fn(async () => {});
    await new GithubClient(fetcher, Date.now, wait).search(filters);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(300);
  });
  it("termina tras dos errores 5xx", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response("{}", { status: 503 }));
    await expect(
      new GithubClient(fetcher, Date.now, async () => {}).search(filters),
    ).rejects.toMatchObject({ kind: "upstream" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("gestiona un timeout real sin reintentar", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("timeout")),
            ),
          ),
      );
    await expect(
      new GithubClient(fetcher, Date.now, async () => {}, 10).search(filters),
    ).rejects.toMatchObject({ kind: "network" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rechaza respuestas inesperadas y recursos ausentes", async () => {
    await expect(
      new GithubClient(
        vi.fn<typeof fetch>().mockResolvedValue(new Response("{}")),
      ).search(filters),
    ).rejects.toMatchObject({ kind: "upstream" });
    await expect(
      new GithubClient(
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("{}", { status: 404 })),
      ).pull("https://github.com/org/repo/pull/1"),
    ).rejects.toMatchObject({ kind: "missing" });
  });
  it("no permite SSRF ni PR arbitrarias", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const c = new GithubClient(fetcher);
    await expect(c.get("https://evil.com")).rejects.toThrow();
    await expect(c.pull("https://localhost/x")).rejects.toThrow();
    await expect(c.issue("..", "repo", 1)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("conserva la fecha de consulta de una PR servida desde caché", async () => {
    let now = 1000;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ state: "open", merged: false, title: "Fix" }),
          ),
      );
    const client = new GithubClient(fetcher, () => now);
    const first = await client.pull("https://github.com/org/repo/pull/1");
    now = 9000;
    expect(
      (await client.pull("https://github.com/org/repo/pull/1")).checkedAt,
    ).toBe(first.checkedAt);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("consulta PR pública y distingue fusión del estado manual", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ state: "closed", merged: true, title: "Fix" }),
        ),
      );
    const result = await new GithubClient(fetcher, () => 1000).pull(
      "https://github.com/org/repo/pull/1",
    );
    expect(result).toMatchObject({
      state: "closed",
      merged: true,
      checkedAt: "1970-01-01T00:00:01.000Z",
    });
  });
});
