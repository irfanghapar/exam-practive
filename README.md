# exam-practive

Interactive practice for the **AWS Certified Cloud Practitioner (CLF-C02)** exam.
719 questions, each with the official answer, the community vote distribution and the full discussion thread. Answer first, then reveal.

## Features

- **Practice** – pick an answer, check it, then see the official answer, the community vote bars and the discussion. Multi-answer questions are handled ("Choose two").
- **Community disagrees** badge on the 132 questions where the most-voted community answer differs from the official one. You can grade against the community answer instead (Settings).
- **Practice sets** – all, unanswered, wrong, bookmarked, multi-answer, disputed, or random order.
- **Browse** – search by text or question number, filter by status.
- **Exam simulation** – 20/35/65 random questions, optional 45/90-minute timer, flag for review, graded only on submit, with a full review afterwards.
- **Progress map** of all 719 questions on the overview page. Progress is saved in the browser (`localStorage`) and can be exported/imported as JSON.
- Keyboard shortcuts: `A`–`E` pick, `Enter` check / next, `←` `→` move, `D` discussion, `M` bookmark, `R` retry.
- Light and dark themes.

## Stack

Vite + React 19 + TypeScript + Tailwind CSS v4, no backend. Deploys as a static site (Vercel config included).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve dist/
```

## Data

- `src/data/questions.json` – questions, options, official answer, community votes (bundled into the app).
- `public/discussions/<n>.json` – discussion comments, 50 questions per file, fetched when a discussion is opened.

Both are generated from the source PDF by `scripts/parse_pdf.py`:

```bash
pip install pymupdf
python3 scripts/parse_pdf.py path/to/exam.pdf
```

The PDF itself is not committed. Some answers in the source are known to be wrong (e.g. question 268), which is exactly what the community vote is for.

## Deploy

Push to GitHub and import the repo in Vercel. The framework preset is detected as Vite; `vercel.json` rewrites all routes to `index.html` so deep links like `/practice/42` work.
