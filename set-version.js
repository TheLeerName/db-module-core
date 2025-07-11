const { execSync } = require("child_process");
const fs = require("fs");

const command = `git log -n1 --format="%h"`;
const file = "dist/core/index.js";

var version = execSync(command).toString().trim();
if (version.length != 7) {
    const date = new Date();
    version = `${date.getUTCFullYear()}${date.getUTCMonth() + 1}${date.getUTCDate()}-${date.getUTCHours()}${date.getUTCMinutes}`;
}
fs.writeFileSync(file, fs.readFileSync(file).toString().replaceAll("__VERSION__", version));
console.log(`version: ${version}`);