Portfolio V2 Chinese font subsets

Source families: Noto Sans SC and Noto Serif SC, Google / Adobe.
Downloaded from the official Google Fonts repository; exact URLs, source blobs, hashes and versions appear in FONT-MANIFEST.json.
Licensed under SIL Open Font License 1.1. Preserve the two accompanying OFL license files when distributing.
These subsets have been renamed Portfolio Sans SC / Portfolio Serif SC. No original font authorship is claimed.

portfolio-sans-sc-v2.woff2: variable weight 400-600; normal style.
portfolio-serif-sc-v2.woff2: static weight 400; normal style.
Use format('woff2') and font-display:swap.
Do not synthesize italic Chinese. Preserve existing Latin faces first in the font stack.

Suggested font-face declarations (not installed into the website CSS by this asset task):
@font-face{font-family:'Portfolio Sans SC';src:url('/fonts/v2/portfolio-sans-sc-v2.woff2') format('woff2');font-style:normal;font-weight:400 600;font-display:swap;}
@font-face{font-family:'Portfolio Serif SC';src:url('/fonts/v2/portfolio-serif-sc-v2.woff2') format('woff2');font-style:normal;font-weight:400;font-display:swap;}

Suggested stacks:
font-family:'DM Sans','Portfolio Sans SC','Microsoft YaHei',sans-serif;
font-family:'Instrument Serif','Portfolio Serif SC','Songti SC','SimSun',serif;

characters-v2.txt contains the Unicode coverage snapshot taken from current JSX and localized project JSON, plus common punctuation and ASCII. No site text was changed.
When new Chinese content is added, regenerate the subsets from the upstream TTFs and the updated character set. Keep a Chinese system fallback while the subset is extended.
Build tool: fontTools 4.67.0 with Brotli WOFF2, installed only in a TEMP tool directory; project dependencies were not changed.
