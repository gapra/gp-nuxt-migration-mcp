import { readFileSync, writeFileSync, chmodSync } from "fs";

const file = "dist/index.js";
const content = readFileSync(file, "utf8");

if (!content.startsWith("#!/usr/bin/env node")) {
  writeFileSync(file, "#!/usr/bin/env node\n" + content);
}

chmodSync(file, "755");
