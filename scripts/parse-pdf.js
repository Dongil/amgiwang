// standalone script: pdf-parse를 Turbopack 밖에서 실행
const fs = require("fs");
const pdf = require("pdf-parse");

const filePath = process.argv[2];
if (!filePath) {
  process.stderr.write("Usage: node parse-pdf.js <path>");
  process.exit(1);
}

const buf = fs.readFileSync(filePath);
pdf(buf).then((data) => {
  process.stdout.write(data.text);
}).catch((e) => {
  process.stderr.write(e.message);
  process.exit(1);
});
