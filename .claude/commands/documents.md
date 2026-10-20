---
description: "Render case files, statutory request records, warning records and the monthly HR case report as branded HTML from the records."
---

# documents

Run `npm run docs`, or `npm run docs -- case-file` for one kind (`case-file`, `request-response`, `warning-record`, `monthly-report`), or `npm run docs -- case-file <id-prefix>` for one record. Files land in `docs-out/`. Change the business name, colours and logo in `brand.json`. These hold sensitive personal information: keep `docs-out/` out of shared folders and out of Git. Nothing is sent.
