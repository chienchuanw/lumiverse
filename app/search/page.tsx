import { getDb } from "@/db";
import { parseSearchParams } from "@/core/search";
import { searchFixtures } from "@/lib/fixtures/search";

export default async function SearchPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await props.searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
    else if (v !== undefined) usp.set(k, v);
  }
  const params = parseSearchParams(usp);
  const { items, total, page, pageSize } = await searchFixtures(getDb(), params);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main>
      <h1>Search fixtures</h1>
      <form method="get">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search name, manufacturer, tags…" />
        <input name="manufacturer" defaultValue={params.manufacturer ?? ""} placeholder="Manufacturer" />
        <input name="fixtureType" defaultValue={params.fixtureType ?? ""} placeholder="Fixture type" />
        <input name="channelMin" type="number" defaultValue={params.channelMin ?? ""} placeholder="Min ch" />
        <input name="channelMax" type="number" defaultValue={params.channelMax ?? ""} placeholder="Max ch" />
        <input name="tags" defaultValue={params.tags?.join(",") ?? ""} placeholder="tags (comma-separated)" />
        <input name="compatibility" defaultValue={params.compatibility?.join(",") ?? ""} placeholder="Depence (e.g. R3,R4)" />
        <button type="submit">Search</button>
      </form>

      <p>{total} result{total === 1 ? "" : "s"}</p>
      <ul>
        {items.map((f) => (
          <li key={f.id}>
            <a href={`/fixtures/${f.id}`}>
              {f.manufacturer.name} — {f.name}
            </a>
            {f.currentVersion ? ` (v${f.currentVersion.version})` : " (no versions)"}
            {f.fixtureType ? ` · ${f.fixtureType}` : ""}
            {f.tags.length ? ` · ${f.tags.join(", ")}` : ""}
          </li>
        ))}
      </ul>

      {lastPage > 1 && (
        <nav>
          {page > 1 && <a href={`?${pageQuery(usp, page - 1)}`}>Previous</a>}{" "}
          <span>
            Page {page} of {lastPage}
          </span>{" "}
          {page < lastPage && <a href={`?${pageQuery(usp, page + 1)}`}>Next</a>}
        </nav>
      )}
    </main>
  );
}

function pageQuery(usp: URLSearchParams, page: number): string {
  const next = new URLSearchParams(usp);
  next.set("page", String(page));
  return next.toString();
}
