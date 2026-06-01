"use client";

import { useRef, useState } from "react";

/**
 * Repeatable mode rows. Each row submits a paired `modeName` / `modeChannelCount`
 * field; the upload server action zips them back into mode objects. Rows left
 * blank are ignored server-side.
 */
export function ModeRows() {
  const nextKey = useRef(1);
  const [keys, setKeys] = useState<number[]>([0]);

  return (
    <fieldset>
      <legend>Modes</legend>
      {keys.map((key) => (
        <div key={key}>
          <label>
            Mode name
            <input name="modeName" placeholder="Standard" />
          </label>
          <label>
            Channel count
            <input name="modeChannelCount" type="number" min={1} max={512} placeholder="24" />
          </label>
          {keys.length > 1 && (
            <button type="button" onClick={() => setKeys((ks) => ks.filter((k) => k !== key))}>
              Remove
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => setKeys((ks) => [...ks, nextKey.current++])}>
        Add mode
      </button>
    </fieldset>
  );
}
