import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getFixtureDetail, type DetailVersion } from "@/lib/fixtures/detail";

export default async function FixtureDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const fixture = await getFixtureDetail(getDb(), id);
  if (!fixture) notFound();

  return (
    <main>
      <p>
        <a href="/search">← Search</a>
      </p>
      <h1>
        {fixture.manufacturer.name} — {fixture.name}
      </h1>
      <dl>
        {fixture.fixtureType && (
          <>
            <dt>Type</dt>
            <dd>{fixture.fixtureType}</dd>
          </>
        )}
        {fixture.tags.length > 0 && (
          <>
            <dt>Tags</dt>
            <dd>{fixture.tags.join(", ")}</dd>
          </>
        )}
        {fixture.description && (
          <>
            <dt>Description</dt>
            <dd>{fixture.description}</dd>
          </>
        )}
      </dl>

      <h2>Versions</h2>
      {fixture.versions.length === 0 ? (
        <p>No versions uploaded yet.</p>
      ) : (
        <ul>
          {fixture.versions.map((v) => (
            <VersionItem key={v.id} version={v} />
          ))}
        </ul>
      )}
    </main>
  );
}

function VersionItem({ version: v }: { version: DetailVersion }) {
  return (
    <li>
      <h3>
        v{v.version}
        {v.isCurrent ? " (current)" : ""}
      </h3>
      <p>
        Uploaded {v.createdAt.toISOString().slice(0, 10)}
        {v.uploadedBy ? ` by ${v.uploadedBy}` : ""} · {(v.fileSize / 1024).toFixed(1)} KB
      </p>
      {v.changelog && <p>{v.changelog}</p>}
      {v.depenceCompatibility.length > 0 && <p>Depence: {v.depenceCompatibility.join(", ")}</p>}
      {v.modes.length > 0 && (
        <ul>
          {v.modes.map((m) => (
            <li key={m.name}>
              {m.name} — {m.channelCount} ch
            </li>
          ))}
        </ul>
      )}
      {v.assets.length > 0 && (
        <ul>
          {v.assets.map((a) => (
            <li key={a.id}>
              {a.fileName} ({a.kind})
            </li>
          ))}
        </ul>
      )}
      <p>
        <a href={`/api/download-url?versionId=${v.id}`}>Download .dfix</a>
      </p>
    </li>
  );
}
