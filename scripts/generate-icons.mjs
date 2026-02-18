import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// 학습앱 아이콘 SVG - 플래시카드 + 뇌 번개 모티브
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
    <linearGradient id="card2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e0e7ff"/>
      <stop offset="100%" style="stop-color:#c7d2fe"/>
    </linearGradient>
  </defs>
  <!-- 배경 -->
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <!-- 뒤쪽 카드 (살짝 기울어진) -->
  <g transform="translate(256,260) rotate(8)">
    <rect x="-105" y="-130" width="210" height="260" rx="18" fill="url(#card2)" opacity="0.6"/>
  </g>
  <!-- 앞쪽 카드 -->
  <g transform="translate(256,250) rotate(-3)">
    <rect x="-110" y="-135" width="220" height="270" rx="18" fill="white"/>
    <!-- 카드 내부 라인 (텍스트 표현) -->
    <rect x="-70" y="-90" width="140" height="12" rx="6" fill="#c7d2fe"/>
    <rect x="-70" y="-65" width="100" height="12" rx="6" fill="#e0e7ff"/>
    <!-- 번개 아이콘 (AI/학습 심볼) -->
    <g transform="translate(0, 25)">
      <polygon points="-8,-40 12,-40 2,-8 22,-8 -12,40 -2,8 -22,8" fill="#6366f1"/>
    </g>
  </g>
  <!-- 상단 왕관/별 장식 -->
  <g transform="translate(256, 88)">
    <polygon points="0,-28 8,-8 28,-8 12,4 18,24 0,14 -18,24 -12,4 -28,-8 -8,-8" fill="#fbbf24"/>
  </g>
</svg>`;

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(iconSvg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`Generated: public/icons/icon-${size}x${size}.png (${size}x${size})`);
}

console.log("Done!");
