import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { InMemoryStorageClient } from "../../core/storage/in-memory";

const feature = await loadFeature("tests/features/storage.feature");

describeFeature(feature, ({ Scenario }) => {
  Scenario("Store and retrieve a fixture file", ({ Given, When, Then }) => {
    let client: InMemoryStorageClient;

    Given("an empty storage client", () => {
      client = new InMemoryStorageClient();
    });

    When(
      `I store a fixture file {string} with contents {string}`,
      async (_, key: string, contents: string) => {
        await client.put(key, new TextEncoder().encode(contents));
      },
    );

    Then(`retrieving {string} returns {string}`, async (_, key: string, expected: string) => {
      const bytes = await client.get(key);
      expect(new TextDecoder().decode(bytes)).toBe(expected);
    });
  });
});
