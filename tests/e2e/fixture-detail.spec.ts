import { test, expect } from "@playwright/test";

// Smoke test: upload a fixture via the API, then load its detail page and
// confirm the version history and download link render.
test("fixture detail page renders an uploaded fixture with a working download link", async ({
  page,
  request,
}) => {
  const form = new FormData();
  form.set("manufacturer", "Robe");
  form.set("name", `MegaPointe ${Date.now()}`);
  form.set("version", "1.0.0");
  form.set("changelog", "Initial release");
  form.set("dfix", new File([new TextEncoder().encode("DFIX-E2E")], "mp.dfix"));
  const uploadRes = await request.post("/api/fixtures", { multipart: form });
  expect(uploadRes.status()).toBe(201);
  const { fixtureId } = (await uploadRes.json()) as { fixtureId: string };

  await page.goto(`/fixtures/${fixtureId}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Robe");
  await expect(page.getByText("v1.0.0")).toBeVisible();

  const downloadLink = page.getByRole("link", { name: "Download .dfix" }).first();
  await expect(downloadLink).toBeVisible();
  const href = await downloadLink.getAttribute("href");
  expect(href).toContain("/api/download-url?versionId=");

  const urlRes = await request.get(href!);
  expect(urlRes.status()).toBe(200);
  expect(typeof ((await urlRes.json()) as { url: string }).url).toBe("string");
});
