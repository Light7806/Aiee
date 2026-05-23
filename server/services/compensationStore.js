import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "compensationRecords.json");

let recordsCache = null;

function loadRecords() {
  if (recordsCache === null) {
    const rawData = fs.readFileSync(dataPath, "utf-8");
    recordsCache = JSON.parse(rawData);
  }
  return recordsCache;
}

export function findByUuid(uuid) {
  const records = loadRecords();
  return records.find((record) => record.uuid === uuid) || null;
}
