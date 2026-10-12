# MECSR Directory 2027 — live flat plan

This repository holds five files and nothing else:

| File | What it is | Who edits it |
|---|---|---|
| `MECSR_2027_Directory_Content_Tracker.xlsx` | The tracker, **repository edition** — sheets 07, 08 and 09 removed because they carry personal data (see below). Sheet **04 Flat Plan** drives the web page; sheets 10–13 hold the intel findings and the book QA list. | The Directory team |
| `index.html` | The flat plan as a web page. Reads the workbook above every time someone loads it. | Nobody — it is generated |
| `MECSR_Directory_2027_Sample_Book_v13.pdf` | The current sample book, 384 pages, **print order** — page 1 is the front cover. The file for the printer. No QR codes (see below). | Nobody — it is generated |
| `MECSR_Directory_2027_Sample_Book_v13_Spreads.pdf` | The same book as a **reading edition** — the back cover is moved to the front, so a PDF viewer's two-page view pairs 2\|3, 4\|5 … exactly like the bound book. This is the one the page shows. | Nobody — it is generated |
| `README.md` | This file | Nobody — it is generated |

Once this is on GitHub Pages, the page is at
`https://<owner>.github.io/<repo>/` and the loop is:

**edit the workbook → commit it → refresh the page → the plan has changed.**

No rebuild, no republish, nothing to regenerate. The page fetches the `.xlsx`
in the browser and reads sheet `04 Flat Plan` directly.

---

## What "live" does and does not mean

Worth being straight about this, because it changes what you should expect.

**Live, genuinely:** the web page and the workbook. Whatever is in
`04 Flat Plan` when a colleague loads the page is what they see — sponsor,
assigned to, content status, design status, notes, page counts. The page also
finds the newest `MECSR_Directory_2027_Sample_Book_v<N>.pdf` in the folder on
its own — the reading edition (`_Spreads`) first, the print file if there is
no reading edition — so a new book version appears in the **Directory PDF** tab
with no edit to the HTML. Page numbers typed into that tab are always book page
numbers; the page converts them for the reading edition.

**Not live:** me. This chat session does not keep running after the
conversation ends, so there is no permanent connection between this session
and the repository. I cannot watch the repo and react to a commit.

**The closest thing to it:** a scheduled task. One exists — *MECSR Directory
2027 — Monday flat-plan check*, every Monday at 08:00 Dubai. It reads the tracker
and writes a status note into `_weekly\` on OneDrive. It never pushes to this
repository; you do that.

**The other half:** the page proofs and the sample book are baked in at build
time. Change a page's *content* (not its status) and the proof in the page
still shows the old artwork until the book is rebuilt. Status, ownership,
sponsor, notes and page ranges are live. Artwork is not.

---

## Step by step

### 1 · Create the repository

1. Go to <https://github.com/new>.
2. **Owner** — the MECSR organisation if you have one, otherwise your own
   account.
3. **Repository name** — `mecsr-directory-2027`.
4. **Visibility** — read the plan note below before choosing. Pick **Private**
   if you are on GitHub Pro or Team.
5. Tick **Add a README file**. Leave everything else alone.
6. **Create repository.**

### 2 · Put the five files in

The easy route, no command line:

1. Install **GitHub Desktop** — <https://desktop.github.com>.
2. Sign in, then `File → Clone repository` and pick `mecsr-directory-2027`.
   Note the folder it clones into.
3. Copy `index.html`, `README.md` and
   `MECSR_2027_Directory_Content_Tracker.xlsx` from
   `Directory 2026\MECSR 2027 Directory\GitHub Flat Plan\` into that folder.
4. The book is already in that folder: `MECSR_Directory_2027_Sample_Book_v13.pdf`
   and `MECSR_Directory_2027_Sample_Book_v13_Spreads.pdf`, about 13 MB each. Both
   have to sit in the repository root with those exact names, or the
   **Directory PDF** tab will not find them. Older versions (v9, v10, v12) can
   stay — the page always takes the newest — or be deleted to keep the folder
   small; v12 still carries the QR codes, so deleting it avoids confusion.
   There is no v11: it was withdrawn, so do not upload one if you find it.
5. Back in GitHub Desktop the files appear as changes. Type a summary —
   "first upload of the 2027 flat plan" — and press **Commit to main**, then
   **Push origin**.

The command-line route, if you prefer it:

```bash
git clone https://github.com/<owner>/mecsr-directory-2027.git
cd mecsr-directory-2027
cp "/path/to/GitHub Flat Plan/"* .
git add .
git commit -m "First upload of the 2027 flat plan"
git push
```

### 3 · Turn on GitHub Pages

1. In the repository, **Settings → Pages**.
2. **Source**: `Deploy from a branch`.
3. **Branch**: `main`, folder `/ (root)`. **Save**.
4. Wait a minute or two. The page appears at
   `https://<owner>.github.io/mecsr-directory-2027/`.

The file is named `index.html` precisely so that this URL works with nothing
after it.

### 4 · Check it worked

Open the URL and look at the two things that prove the wiring is live:

- Under the board on the **Flat Plan** tab there is a source line. It must read
  **LIVE — 91 rows read from MECSR_2027_Directory_Content_Tracker.xlsx · 384
  pages**. If it says SNAPSHOT, the page could not fetch the workbook — check
  that the `.xlsx` really is in the repository root, spelled exactly as above.
- On the **Directory PDF** tab the badge must read **LIVE — V13 · READING
  SPREADS** and the book must render in the frame. A **Print edition ↗** button
  next to it opens the print-order file.

### 5 · The everyday loop

1. Open `MECSR_2027_Directory_Content_Tracker.xlsx`.
2. Edit sheet **04 Flat Plan** — the blue columns are the ones meant for you:
   `SPONSOR / CLIENT`, `ASSIGNED TO`, `CONTENT STATUS`, `DESIGN STATUS`,
   `DUE DATE`, `NOTES`.
3. Save.
4. In GitHub Desktop: commit, push. (Or `git add . && git commit -m "..." && git push`.)
5. Anyone refreshing the page sees it, within a minute or so of the push.

Do not rename the workbook, do not rename sheet `04 Flat Plan`, and do not
reorder or rename its header row. The page finds columns by their header text.

### 6 · Letting colleagues in

**Settings → Collaborators → Add people.** Give the Directory team **Write** so
they can push workbook changes. Anyone who only needs to look at the plan needs
no GitHub account at all if Pages is public — just the URL.

---

## Access, and why the repository has to stay clean

**A GitHub Pages site is readable by anyone who has the URL.** That is true on
every plan below GitHub Enterprise Cloud — a private repository still publishes
a public page. And on the free plan Pages only works from a **public**
repository, so everything committed here can be downloaded by anyone who finds
the repository, not just the page.

Two consequences, and both are already handled in the files above:

1. `index.html` is the **shared build** — the flat plan and the sample book
   only. The commercial tabs (signed agreements, net investment per sponsor,
   invoice reconciliation, member and listing-owner tables) live in the full
   dossier, which stays on OneDrive and is not in this repository.
2. The workbook here is the **repository edition**. Sheets `07 Membership`,
   `08 BD Reconciliation` and `09 Listing Owners` are stripped out before it is
   committed, because between them they carry more than a thousand member and
   listing-owner email addresses. Publishing those would be a personal-data
   disclosure under the UAE and Saudi PDPL, and there is no production reason
   for them to be on the web. The generator refuses to write the repository
   edition if a single email address survives in it.

**Never commit the OneDrive copy of the workbook to this repository.** It is the
same file name. Take the one from `GitHub Flat Plan\`, which is the stripped
edition, and nothing else.

### Restricting the site to MECSR sign-in

GitHub Pages cannot do this at any price short of Enterprise Cloud. To require a
`@mecsc.org` or `@mecsr.org` sign-in, the page has to be served by something
that can check identity. The shortest route that needs no DNS migration and no
Azure subscription is **Cloudflare Pages plus Cloudflare Access**, whose Zero
Trust free plan covers up to 50 users:

1. Create a free Cloudflare account and open **Zero Trust**.
2. **Compute (Workers) → Pages → Connect to Git**, authorise GitHub and pick
   `mecsr-directory-2027`. Framework preset **None**, build command empty,
   output directory `/`. Deploy. You get
   `mecsr-directory-2027.pages.dev`. Cloudflare Pages builds from **private**
   repositories too, so the repository can now be flipped to private.
3. **Zero Trust → Settings → Authentication → Login methods** — add
   **One-time PIN**. That emails a six-digit code and needs no identity
   provider. (If IT would rather have real single sign-on, add **Microsoft
   Entra ID** here instead and point it at the MECSR tenant.)
4. **Zero Trust → Access → Applications → Add an application → Self-hosted.**
   Application domain: subdomain `*`, domain `mecsr-directory-2027.pages.dev`.
   The wildcard covers the preview URLs as well as the live one — without it,
   every past deployment stays open.
5. Add a policy: Action **Allow**, and two Include rules OR'd together —
   *Emails ending in* `@mecsc.org` and *Emails ending in* `@mecsr.org`. Save.
6. Test in a private window. You should get a Cloudflare sign-in page, a code to
   your MECSR address, and then the flat plan. A personal address should be
   refused.
7. Once that works, turn GitHub Pages **off** in the repository settings so the
   `github.io` URL stops serving, and send the team the `pages.dev` link.

The alternative, if IT prefers everything inside Microsoft 365, is **Azure
Static Web Apps** with Entra ID sign-in — same idea, same free tier, and staff
sign in with the work account they already have. Either way the hosting moves
off GitHub Pages; GitHub stays as the place the files live.

**Repository size.** Each version of the book is two files of about 19 MB and
git keeps every version forever. GitHub blocks single files over 100 MB and warns
past 50 MB, so the book is fine, but four or five versions a cycle is roughly
150–200 MB of history. If that gets awkward, drop the version number from the file name and
overwrite it — the page falls back to `MECSR_Directory_2027_Sample_Book.pdf`
when it finds no versioned file. Pages sites are capped at 1 GB with a soft
100 GB/month bandwidth limit, so neither is a real constraint.

---

## If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| Source line says SNAPSHOT | The page could not fetch the workbook | Confirm the `.xlsx` is in the repository root with the exact file name |
| Source line warns "does not add to 384" | Someone changed a `PP` value | Page counts have to keep totalling 384 — taking a page for one item means giving one back somewhere else |
| Directory PDF tab says NOT REACHABLE | Opened from disk with a `file://` path, or the PDF is missing | Use the Pages URL, or confirm the PDF is committed |
| Page shows an old plan after a push | GitHub Pages build delay or a cached copy | Wait a minute, then hard-refresh (Ctrl+F5) |
| A page proof shows old artwork | Proofs are baked in when the book is built | The book needs rebuilding — status and notes are live, artwork is not |
| Two-page view shows 1\|2, 3\|4 | The viewer opened the print-order file | Open the `_Spreads` file, or set the viewer to "two-page with cover" |

---

## No QR codes in the book (since v13, 12 Oct 2026)

Brilliant Directories builds each listing's web address from the listing's name, so
renaming a listing changes its address and breaks any QR code already printed for it.
v13 therefore takes every QR code out of print: the code on each listing card, the
country code on each country opener, the cover code, the dashed LISTING PENDING
placeholders, and every line that told the reader to scan. Pages 5, 78 and 381 were
rewritten to match. Readers are pointed to directory.mecsr.org to search by name.
If QR codes come back in a later edition, they need addresses that never change —
for example a short link per listing ID that MECSR redirects itself.

## Rebuilding

The original generators did not survive, so v12 was built by working on the v10
book page by page: only the pages whose content or page number changed were
re-rendered, and the folios on every moved page were restamped to match the
original type exactly. The scripts are in OneDrive, `MECSR 2027 Directory\_build\`:

```
plan_v12.json         the v12 page map: which v10 page goes where, what is new
plan_v13.json         the pages v13 re-renders on top of v12
pages_front.py        renders the new and rewritten pages (contents, openers, open slots, Data Notes,
                      What's New, How to Read, The Digital Directory)
render.js             HTML → PDF via Chromium
assemble_v12.py       splices the book, restamps folios, writes the print and reading editions
assemble_v13.py       takes every QR code out of v12, swaps in the rewritten pages, writes v13
dedupe_pdf.py         merges repeated fonts and images (lossless) to keep each file under 20 MB
update_tracker.py     applies the RCM matrix, the v12 pagination and the intel to the workbook
intel_curated.py      the checked intel findings behind sheets 10–12
patch_dossier.py      refreshes the page proofs, the plan snapshot and the PDF tab in index.html
```

`assemble_v12.py` refuses to write a book that is not exactly 384 pages (24
signatures of 16), `assemble_v13.py` refuses one in which any QR code or scan
instruction survives, and `patch_dossier.py` refuses a plan that does not add to
384 or that starts a two-page item on an odd page — so a mistake stops the build
rather than reaching print.

**Before the final print build:** fix the mixed-use page template so it holds six
cards, as the plan assumes. Today it holds four, which drops 37 listings from the
sample book (tracker sheet 13 Book QA).
