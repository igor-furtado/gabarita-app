import { writeFileSync } from "node:fs";
import { buildApp } from "../server/app.js";
const app = await buildApp();
await app.ready();
writeFileSync("openapi.json", JSON.stringify(app.swagger(), null, 2));
await app.close();
