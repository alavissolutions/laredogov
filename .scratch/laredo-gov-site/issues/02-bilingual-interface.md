# 02: Bilingual interface

**What to build:** Every page exists in English and Spanish under a language prefix in the URL. A language switch on any page lands on the same page in the other language. All interface text (navigation, labels, panel titles, Topic names, notices) comes from one strings file holding both languages, with the Spanish machine-drafted for owner review. Item titles stay in the Publisher's language. Every later ticket adds its strings to this file.

**Blocked by:** 01 (Project skeleton, the build seam, and the first Feed)

**Status:** resolved

- [x] One strings file with English and Spanish for every interface string; build fails on a missing key in either language
- [x] Both language trees are rendered; the switch link keeps the current page
- [x] Item titles are rendered untouched in both trees
- [x] The page declares its language for screen readers
- [x] Test through the seam: the same fixture renders both trees and the Spanish home page shows Spanish labels with the English Item title

## Comments

2026-09-16: Done. `src/i18n/strings.ts` holds both languages; `assertStringsComplete()` runs at render and the build fails on a missing key. Language is a URL prefix (`/en/`, `/es/`); the switch link keeps the page path. Spanish is machine-drafted, see issue 16.
