import { readFileSync, writeFileSync } from "fs";
import { extractText } from "unpdf";

const pdfPath = "C:/Users/KDI/OneDrive - 제노글로벌/스캔/바탕 화면/해커스＿보카＿수능＿심화（수업용＿본책＿PDF）.pdf";

const buffer = readFileSync(pdfPath);
const { totalPages, text: pageTexts } = await extractText(
  new Uint8Array(buffer),
  { mergePages: false }
);

console.log(`Total pages: ${totalPages}`);

// Save sample pages (pages 10-20 = Day 1~2 area)
const samples = {};
for (let i = 9; i < Math.min(25, totalPages); i++) {
  samples[`page_${i + 1}`] = pageTexts[i];
}

writeFileSync("scripts/pdf-sample.json", JSON.stringify(samples, null, 2));
console.log("Saved to scripts/pdf-sample.json");

// Also save page 1-5 for TOC/structure
for (let i = 0; i < 5; i++) {
  console.log(`\n=== Page ${i + 1} ===`);
  console.log(pageTexts[i]?.substring(0, 500));
}
