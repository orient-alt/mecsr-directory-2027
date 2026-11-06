# MECSR Directory 2027: flat plan

Live page: **https://orient-alt.github.io/mecsr-directory-2027/**

| Tab | What it does |
|---|---|
| **01 Flat Plan** | Figures (sold, content done, layout done, locked, page balance), the section summary and the board, open to anyone with the link. **Page details** (the v14 sample pages, uploaded samples, statuses and notes) need a Google sign-in as an editor: click a page and the page asks you to sign in. **Edit plan** turns the board into an editor: drag pages and whole sections, rename, change pages (single to double), mark OPEN, sold or house, mark content completed and layout done, lock a final page, add pages after it or delete it. Page numbers for every section and the whole book follow at once. **History** lists every change with who made it, when and from which IP address, and can restore any earlier version of the plan or the timeline. **Excel** and **PDF** download the plan as it stands. |
| **02 Timeline** | The production timeline for the printed book, to the release on 26 Feb 2027: tasks by phase with team, start and due dates, a bar per task, status (Not started, In progress, Done, Delayed, On hold), a tick box and notes. Signed-in editors only. `…/mecsr-directory-2027/#timeline` opens this tab directly. |

In **Edit plan**, the page editor also takes a **sample PDF** for each item (one page, or two for a spread; a wide
single-page spread is cut in half). It shows in the page viewer in place of the v14 page. Replace or delete it there.
Content done, layout done and lock can be changed only in Edit plan.

Signed-in editors also get **page notes** (a thread on each page or spread, with **@** to tag someone), a small
**team chat** at the bottom right and an **@ Mentions** list of the notes and messages that tag them.

## How the figures are worked out

- **Open:** pages marked OPEN, as a share of saleable pages (OPEN plus sold). House pages are not saleable.
- **Content done** and **Layout done:** pages marked done, as a share of all pages. A page or spread is
  marked in its viewer or in the page editor; a long item (a country's listings, say) takes a count of pages done.
- **Page balance:** the book must have an even number of pages; it also shows how many 16-page sections it fills.
- **Locked:** a final page cannot be moved, edited or deleted until it is unlocked. If pages added or removed
  earlier in the book shift a locked page, the editor shows a warning.

## Where the plan is kept

Firebase project `directory-ff8f1`, connected on 4 Nov 2026 (web app `Flat Plan`, Google sign-in, Firestore
`(default)` in `me-central1`, Doha). The app is the master: changes are made on the page, never in a spreadsheet.

| Firestore path | What it holds | Who can read it |
|---|---|---|
| `flatplans/2027` | The plan: items (with the client named on each sold page), version, time of the last change | Anyone (no emails or IP addresses) |
| `flatplans/2027/changes` | The change log: who, when, IP address, what changed, the plan or timeline after it | Editors |
| `flatplans/2027/meta/timeline` | The production timeline | Editors |
| `flatplans/2027/notes`, `…/chat` | Page notes and the team chat | Editors |
| `flatplans/2027/samples` | Sample PDFs uploaded in the page editor, kept as one or two page images per item | Editors |
| `flatplans/2027/proofs` | The 384 page proofs of sample book v14, in 11 records (moved here from the repository on 6 Nov 2026) | Editors; only orient@mecsc.org uploads |
| `people` | Who can be tagged, and when they last read their mentions | Editors |
| `editors` | Editors outside `@mecsc.org` and `@mecsr.org` | Editors; only orient@mecsc.org adds or removes (**Approved people** button) |

- Editors are `@mecsc.org` and `@mecsr.org` Google accounts, plus anyone orient@mecsc.org approves under **Approved people**
  (a document in `editors`). Approved people have the same rights as staff. Removing someone takes effect within an hour.
  Someone appears in the **@** list after they sign in once. To tag someone who has not signed in yet, type **@** and
  choose **+ Tag someone not listed**, then give their name and email (an `@mecsc.org` or `@mecsr.org` address, or a listed editor).
- The rules in `firestore.rules` require a new change-log entry with every save of the plan or timeline, limit
  what a log entry may hold, and stop anyone from editing or deleting the log. Uploaded samples must be real images. Notes and messages can be edited or blanked only by their author.
- The IP address is looked up by the browser (api.ipify.org) when a change is saved. Treat it as a record, not
  proof; the signed-in name is the reliable part.
- `firebase-config.js` holds the project's web API key. GitHub may flag it as a secret; it is a public identifier
  for the project, not a password, and the rules decide who can read and write.
- If `firebase-config.js` is set back to `null`, the page becomes a practice copy that stays in the browser tab.

## Rules of the book

A two-page item (DPS, Expert View, country profile, ad spread, section opener) must start on an even page, so it
prints as one spread, and the page count must stay even. The editor outlines a split spread in red and warns about an
odd page count. The book prints in sections of 16 pages: 368 pages is 23 sections, 384 is 24.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `flatplan.js` | Board, statuses and locks, page notes, team chat, timeline, history, Excel and PDF reports |
| `plan-seed.js` | The starting plan (3 Nov 2026, 372 pages), used until the first change is saved |
| `timeline-seed.js` | The starting production timeline (4 Nov 2026), used until the first change is saved |
| `firebase-config.js` | The Firebase web config |
| `firestore.rules` | Security rules to paste into Firebase (version of 6 Nov 2026, published 6 Nov 2026 15:47 Dubai) |
| `lib/` | Sortable 1.15.6 (drag and drop), ExcelJS 4.4.0, jsPDF 2.5.2 and jsPDF-AutoTable 3.8.4 (reports), pdf.js 3.11.174 (reading uploaded sample PDFs) |

Earlier files (the tracker workbooks, sample book PDFs, `proofs.js`, `app.js`, `session-record.html`) and the full history
before 6 Nov 2026 are in the private repository `orient-alt/mecsr-directory-2027-archive`.

## Connecting Firebase (done 4 Nov 2026; kept for reference)

1. Firebase console, project **Directory**: **Add app → Web**, nickname `Flat Plan`, no Hosting. Copy the
   `firebaseConfig` values into `firebase-config.js` as `window.FIREBASE_CONFIG = {...};`.
2. **Authentication → Get started → Sign-in method → Google → Enable**, support email, Save.
3. **Authentication → Settings → Authorized domains → Add domain**: `orient-alt.github.io`.
4. **Firestore Database → Create database**, Standard edition, production mode, a location near the UAE (it cannot
   be changed later).
5. **Firestore Database → Rules**: paste `firestore.rules`, **Publish**. Do this again whenever the file changes.
6. For each editor outside `@mecsc.org` / `@mecsr.org`: **Firestore Database → Data → Start collection** `editors`,
   document ID = their Google email in lower case, one field `name`.

## Access, and why the repository has to stay clean

**This repository is public, and so is everything ever committed to it**, including deleted files and old versions.
GitHub Pages on the free plan only works from a public repository. So it holds code only: no workbooks, PDFs, page
images, names or emails. Data lives in Firestore, behind the rules. On 6 Nov 2026 the old repository was found to hold
the full member workbook in its history; it was renamed `mecsr-directory-2027-archive` and made private, and this
repository was started again with code only. **Never commit a workbook, PDF or export here, even briefly.**
