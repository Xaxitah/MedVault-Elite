# MedVault — Reference Dossier

**Purpose.** This is the quality bar. Every number here is actionable by an engineer who cannot see the reference site.

**Method.** Values marked **[measured]** were read from live `getComputedStyle` / fetched stylesheets on the reference site itself, at viewport **1600 × 1000, DPR 1**, in August 2026. Values marked **[source]** come from published source code or documentation. Values marked **[computed]** were calculated here (OKLCH → sRGB gamut-fitting, WCAG 2.1 contrast) and are reproducible. Anything unmarked is judgement, and is labelled as such.

**Reading order for implementers:** Part 3 (the four problems) → Part 4 (palette) → Part 5 (type) → Part 6 (anti-patterns). Parts 1–2 are evidence.

---

## Part 1 — Stripe Press deconstructed

The owner called `press.stripe.com/the-big-score` "heavy" (*pesado*). The diagnosis matters, because the fix is smaller than it looks.

**The heaviness is not in the mechanics. It is in two CSS custom properties.** Every visual on that page derives from exactly two tokens set inline per product:

```
--backgroundColor  the ground
--color            the ink (text, rules, borders, icon fills, selection)
```

Everything else is `var(--color)` / `var(--backgroundColor)`. The Big Score is `#442C25` ground + `#E48244` ink — dark brown and orange. That is the entire source of the heaviness.

**Proof that the system is register-agnostic:** the same page ships light schemes for other books, using the identical mechanics. Harvested from the live DOM **[measured]**:

| Book (ground / ink / cover) | Register |
|---|---|
| `#442C25` / `#E48244` / `#2C3344` | dark warm |
| `#0d121f` / `#D0D1D4` / `#0d121f` | near-black |
| `#E2E2E2` / `#504F4F` / `#6D2B3F` | **light grey** |
| `#96DCED` / `#3D3D3D` / `#7F8181` | **pastel sky** |
| `#FFB55E` / `#0B1743` / `#ED4B37` | **pastel amber** |
| `#C1B676` / `#18185E` / `#1D1D62` | olive / navy |
| `#4D1A28` / `#EBADCB` | wine / pink |
| `#143199` / `#dee6ff` | blue / pale blue |
| `#93935F` / `#333032` | olive / near-black |
| `#2328A0` / `#EF9E40` | indigo / orange |
| `#303328` / `#F9C350` | dark olive / gold |

Three of those are already the pastel register we want. **We adopt the mechanism verbatim and change only the token values.** No re-architecture required.

A third token, `--coverColor`, exists solely for the non-WebGL fallback (below).

### Mechanics table

| # | What it does | How it actually works **[measured]** | Adopt? | Pastel translation |
|---|---|---|---|---|
| 1 | **3D cover object** | Three.js/WebGL scene on a **fixed** canvas: `position:fixed; width:70vw; max-width:2200px; height:var(--screenHeight); z-index:1; pointer-events:none; transition:opacity .5s`, faded `0→1` once initialised. DOM content sits at `z-index:3` and scrolls *over* it. | **Yes, scoped** | Not a book — a **discipline/parcial object** (a tilted "dossier" plate or a stack of artifact cards). Keep it to the Discipline hero and the Parcial hero only. Never on a reading page. |
| 2 | **Scroll drives rotation** | An invisible DOM list (`.PressHomepageProductList`, `opacity:0; pointer-events:auto`) is the scroll-length proxy; JS measures it (`--isMeasuring` state) and maps scroll position onto the canvas. Layout couples back to the 3D via `--canvasScale` (a JS-written number, e.g. `2.14`), used in real layout math: `margin-bottom: calc((35 - var(--canvasScale)*6) * var(--vh))`. | **Yes** | Same proxy pattern. The coupling trick (`--canvasScale` shrinking the header's bottom margin as the object grows) is the single cleverest thing on the page — steal it so type and object never collide. |
| 3 | **Drag to spin** | `.PressHomepageBookDetails__left { cursor: grab }`; body gets `--isDragging`, which sets `user-select:none` and hides the header (`opacity:0`). | Yes | Cheap, delightful, discoverable. Keep. |
| 4 | **Vertical nav with progress** | Fixed left column, **84px wide**, full viewport height, `display:flex; flex-direction:column; justify-content:space-between; padding:calc(10px + 1vw)`. **19** items, each a **16 × 13px** tick (`padding:5px 0`). Inactive fill `opacity:.3`; active/hover `opacity:1`; `transition: transform .2s`, `transform-origin:0 0`. Reveal: `transform:scaleX(0)→scaleX(1)`, `transition:.3s`. | **Yes — this is the headline steal** | Ticks become **Parcial/Theme progress bars** that also encode *completion* (fill width = % read), not just position. See Part 3b. |
| 5 | **Nav labels on hover** | Label is `position:absolute; padding-left:90px` from its tick, `font-size:15px; white-space:nowrap`, hidden until hover. Animation `MenuLabelReveal .2s ease forwards`: `translateX(-5px) opacity:0 → translateX(0) opacity:1`. | Yes | **200ms, 5px.** That restraint is the whole point. Do not increase either number. |
| 6 | **Scene dims for nav legibility** | Hovering the tick rail adds `--isIndicatorLabel`, which drives `.PressHomepage__colorOverlay` to `opacity:.9` over `.3s` — a full-viewport wash of `var(--backgroundColor)` at `z-index:3`. | **Yes** | Essential in pastel too: a 90% paper-coloured wash so labels read over any figure. Use `opacity:.92` on paper. |
| 7 | **Per-section colour theming** | Two inline custom properties per section (above). Hover states **invert** them: `.__linkContainer:hover { background: var(--color); color: var(--backgroundColor) }`, `transition: background .2s`. | **Yes** | Per **discipline**, not per page. Inversion-on-hover is free and looks expensive. |
| 8 | **Inverted text selection** | `::selection { background: var(--color); color: var(--backgroundColor) }` | Yes | One line. Do it. |
| 9 | **Section entrance** | `.__info` starts `translateY(20px)`; active state applies `transition: transform 1s ease .5s; transform: translateY(0)`. Visibility (not opacity) is toggled. | **Modify** | 1000ms + 500ms delay is too slow for a study tool used daily. Use **320ms, 12px, no delay**. |
| 10 | **Graceful no-WebGL fallback** | `.PressHomepage--isNotWebGL .__left:after` renders a flat rectangle: `width:70%; padding-top:75%; max-width:375px; background:var(--coverColor); border:1px solid`. The list also becomes `opacity:1`. | **Yes — mandatory** | A flat tinted plate in the discipline's `pale` colour. Also our `prefers-reduced-motion` and low-end-device path. |
| 11 | **Editorial type system** | **Ivar Text** (body), **Ivar Headline** (UI/buttons), **Ivar Display** (titles) — one family, three optical cuts, all variable woff2, `font-display: swap`. Body `17px/1.5` at **weight 500** (not 400). Buttons `17px` Ivar Headline **600**. `a, button { letter-spacing:.32px }`. | **Yes, structurally** | Ivar is commercial. The free structural equivalent is one variable serif with an **optical-size axis** — see Part 5. Note the weight-500 body: on a tinted ground, 400 goes anaemic. |
| 12 | **Reset kills default heading sizes** | `h1..h6 { line-height:1; font-size:16px; font-weight:400; margin:0 }` — all heading scale comes from component classes. `p { line-height:1.5 }`, `* { box-sizing:border-box }`. | Yes | Prevents "accidental h3" sizing drift across 400 markdown-generated pages. |
| 13 | **The section-label pattern** | A 60px × 1px rule, then 16px gap, then italic text at `1.2em`. `margin: 80px 0 60px`. Used for "Author", "Praise". | **Yes** | Our cheapest editorial signal. Use for "Resumo", "Mapa mental", "Flashcards" section heads. |
| 14 | **Layered button micro-interaction** | Four staggered timings on one hover: background `.1s`; top/bottom hairline pseudo-elements `transform .2s ease-out` (move 1px inward); a 4px left bar `scaleX(0)→1` over `.3s ease-out`; icon pair swaps diagonally `translate(30px,-30px)` over `.4s`; label shifts `translateX(4px)` over `.3s ease-out`. | **Selectively** | The layering is the craft. But 400ms is too slow for our density — compress to 100/140/200/240ms. |
| 15 | **Content split** | `flex-basis: 58%` (object) / **42%** (text) at ≥900px. At 1296px that measured 623px / 451px. Page padding `0 8vw`, with `14vw` left padding below 900px to clear the nav rail. | Partly | 42% gives a **51-character** measure **[measured]** — fine for a 3-sentence blurb, far too narrow for a study text. See Part 3a. |
| 16 | **Drag tooltip** | Fixed chip at `top:50%; right:20%`, `width:400px`, `16px` italic, `line-height:1.5`, `letter-spacing:.32px`, `border-radius:2px`, **inverted** (`color:var(--backgroundColor); background:var(--color)`), animated `DescriptionFadeIn .5s ease .3s` to `opacity:.9`. | Optional | Note it lands at `.9`, not `1`. Elite sites rarely end an overlay at full opacity. |
| 17 | **Quote typography** | `blockquote:before` is a `"` glyph at **80px with `line-height:.22`** (so it adds no vertical space); `:after` is a 40px × 1px rule at `opacity:.4`, `margin-top:24px`; attribution role at `opacity:.7`. Grid: 3 columns, `gap:4vw`, `max-width:1280px`, `break-inside:avoid`. | Yes | `line-height:.22` on an oversized glyph is the trick that makes drop-quotes not blow up the rhythm. |
| 18 | **JS-computed viewport unit** | `--vh` is written by JS (`12.7px` = 1% of a 1270px viewport) and all vertical rhythm uses `calc(var(--vh) * N)`. `--windowWidth: calc(100vw - var(--scrollbarWidth, 17px))`. | Partly | `dvh` now covers most of this. Keep `--scrollbarWidth` — it prevents the 15px horizontal jitter on modal open. |

### What Stripe Press does *not* do (equally instructive)

- **No `prefers-reduced-motion` handling** was found in the served bootstrap **[measured]** — a genuine accessibility gap. Do not inherit it.
- **No shadows, no gradients, no glass.** The only `border-radius` in the entire system is `2px`.
- **No more than two colours on screen at once.** Ever.

---

## Part 2 — Reference gallery

### 2.1 Bartosz Ciechanowski — long-form with inline figures
`https://ciechanow.ski/mechanical-watch/`
**Why it matters:** the best long-form-with-figures reading experience on the web. Directly solves the owner's #1 pain.

- **Body: IBM Plex Sans `19.2px / 30.72px` = line-height exactly `1.6`, colour `#444444` on ground `#F8F8F8`** **[measured]**. Neither end is an extreme — no `#000`, no `#FFF`. This is the single highest-leverage "not tiring" move on this list.
- **Measure: 704px ≈ 73 characters** **[measured]**. Built as `.padding_wrapper { width:800px; padding:0 48px }`.
- **Figures are NARROWER than the text: `450px` in a `704px` column (64%), centred via `margin: 36.8px 127px 32px`** **[measured]**. Counter-intuitive and excellent — the figure never breaks the reading rhythm.
- **Figures have no border, no card, no shadow, no background.** They float directly on the page ground.
- **Headings are LOWER contrast than body text**: `#535353` headings vs `#444444` body **[measured]**. Headings whisper; they don't shout.
- Ramp (root 16px): body `1.2rem`, section head `1.8rem`, page title `2.4rem`. Paragraph separation via `padding: 13.44px 0` (= `0.7em`), not margins.

### 2.2 Stripe Docs — deep left nav + design tokens
`https://docs.stripe.com/payments/online-payments`
**Why it matters:** the reference answer for hierarchy 4–5 levels deep, plus a published, mature token set.

- **The sidebar has ZERO indentation. Every link sits at `x = 12px`** **[measured]**. Hierarchy is carried by *scoping* (only the current branch is shown) and by uppercase group headers — not by indent guides or tree lines.
- Sidebar is **280px**, **transparent background, no right border**, `padding-bottom: 48px` **[measured]**.
- Group headers are **the same 14px/20px as the items**, differentiated only by `font-weight:600` + `text-transform:uppercase`, colour `#414552` **[measured]**.
- **Active item = `font-weight:700` + colour `#5469D4`. No pill, no background, no left border** **[measured]**.
- **Level 1 is a horizontal tab bar; levels 2–5 are the vertical sidebar.** The hierarchy is split across two axes so neither gets deep.
- Motion tokens **[measured]**: `--sail-duration-fast: 120ms`, `--sail-duration-out: 160ms`, `--sail-duration-slow-out: 320ms`. Radii: `--sail-radius-2: 2px`, `--sail-radius-4: 4px`.
- Text colours: emphasis `#1A1F36`, body `#3C4257`, secondary `#414552`, offset ground `#F7FAFC` **[measured]**. **Never pure black; all greys are blue-tinted (hue ≈ 225°).**
- Borders are done as `--sail-shadow-keyline: 0 0 0 1px rgb(227,232,238)` — a spread shadow, not a border, so it never affects layout.

### 2.3 Apple Human Interface Guidelines — the closest genre match
`https://developer.apple.com/design/human-interface-guidelines/typography`
**Why it matters:** same *content shape* as MedVault — conceptual explanations, heavy inline figures, deep taxonomy, no code. Also our blind-test adversary (Part 7).

- Three columns: **200px icon sidebar / 740px article / right rail** (TOC + platform icons) **[measured]**.
- Body: SF Pro Text **`17px / 25px` (1.47), letter-spacing `-0.374px` (≈ `-0.022em`)**, `#1D1D1F` on `#FFFFFF` **[measured]**.
- **Measure: 740px ≈ 86 characters** **[measured]** — this is *too wide*, and is one of the few places we can beat them.
- **Figures run the FULL column width, flush with text (740px at the same left edge)** **[measured]** — the opposite strategy to Ciechanowski. Both work; pick one and never mix. Captions are `14px/21px` in the **same colour as body text**, not dimmed.
- Sidebar: **each item carries a small monochrome glyph**, and there is a **`Filter` text input at the top of the rail**. Two indent levels only (`x318`, `x357` → **39px step**), link `14px/18px` weight 400 `#6E6E73`.
- Motion vocabulary, by usage count **[measured]**: `color 0.32s cubic-bezier(.4,0,.6,1)` ×84, `opacity, transform 0.24s ease` ×32, `color 0.15s ease-in` ×24, plus `opacity, transform` at `.18s / .20s / .22s` (staggered reveals). **Only `opacity` and `transform` are ever animated.**
- Editorial device: each section's first paragraph opens with a **bolded lead-in sentence**.

### 2.4 Maggie Appleton — the pastel palette masterclass
`https://maggieappleton.com/`
**Why it matters:** it is the proof of how to make a light/pastel site read as premium rather than cheap. The lesson is counter-intuitive and is the backbone of Part 4.

- **The tint is in the PAPER; the saturation is in the INK** **[measured, light theme]**. Ground `--color-cream: #F6F5F1`; raised `--color-light-cream: #FCFBF7`; sunken `--color-tinted-cream: #E6E3E1`; ink `--color-black: #353534`.
- **Her light-mode accents are NOT pastel — they are deep and saturated**: crimson `#5F023E`, bright-crimson `#960462`, sea-blue `#00758F`, purple `#7558B2`, dark-salmon `#E1624F` **[measured]**. Only `--color-gold: #FFD09C` is pale.
- In dark mode every accent **inverts** to its pastel counterpart (`#5F023E` → `#E85AAB`). The discipline is: *pale paper → deep ink; dark paper → pale ink.* Never pale-on-pale.
- Type: **Canela Text** (body serif) at `22px / 33px` = **1.5**; **Lato** for UI; display `81.8px / 89.98px` = **line-height 1.1 at weight 400** — big editorial type is set at *regular* weight, not bold.
- **Space tokens are multiples of the body font size**, not arbitrary pixels: `xs .75×, s 1×, m 1.5×, l 2×, xl 3×, 2xl 4×, 3xl 6×`, all fluid via the Utopia `calc()` formula (20px @320 → 22px @1200) **[measured]**.
- Tints are derived, not hardcoded: `color-mix(in srgb, #960462 10%, transparent)`.
- **Caution:** her most-used transition is `all 0.3s ease-in-out` (73 elements) **[measured]**. `transition: all` is an anti-pattern — see Part 6. Copy her colour thinking, not her transition property.

### 2.5 Works in Progress — per-category colour pairs, in pastel
`https://worksinprogress.co/`
**Why it matters:** it already solves our "colour-coded sections per item" problem in a light register. This is the direct template for the 11 discipline hues.

- **Each category is a PAIR at a locked hue — one pale, one deep** **[measured]**:
  `--color--culture: #CEE0DC` / `--color--culture-alt: #073429`
  `--color--economics: #E20A39` / `--color--economics-alt: #F8E6EA`
  `--color--politics: #F4D06F` / `--color--politics-alt: #4C3906`
  `--color--science: #363B8F` / `--color--science-alt: #D8D9F1`
- Analysed: **hue stays within ±4°; saturation stays HIGH (45–91%); only lightness swings, from ~11–16% to ~84–94%.** That is the formula. Cheap pastels do the opposite — they drop *saturation* at *medium* lightness, which is what produces the washed-out, childish look.
- Ground is `#FFF7F4` — a warm blush white; body ink `#141414` **[measured]**.
- Spacing scale is plain 5px-based: `10 / 15 / 20 / 25 / 30 / 40 / 50 / 60` **[measured]**.
- Article layout: full-bleed **1px hairline rules** separating masthead zones, a wide serif standfirst, then a **narrow body column offset left**, with the wide right margin reserved for furniture (share, reading time, translate) and figures. Inline CTA cards are filled with the category's **pale** colour — confirming pale = surface, deep = ink.

### 2.6 Linear Docs — the motion and token-structure reference
`https://linear.app/docs/account-preferences`
**Why it matters:** the most disciplined motion system of any product site. Dark, so ignore its colours; copy its structure.

- **Only two speeds in practice** **[measured]**: `--speed-quickTransition: .1s`, `--speed-regularTransition: .25s`.
- **Asymmetric hover — the best single detail in this dossier**: `--speed-highlightFadeIn: 0s`, `--speed-highlightFadeOut: .15s` **[measured]**. Highlights appear *instantly* (feels responsive) and leave over 150ms (feels smooth).
- Actually-used transitions, by count **[measured]**: `transform 0.12s cubic-bezier(.455,.03,.515,.955)` ×16; `color, text-decoration-color, background 0.25s ease` ×14; `transform 0.2s ease` ×12; `border, background-color, color, box-shadow, opacity, filter, transform 0.16s cubic-bezier(.25,.46,.45,.94)` ×9. **Nothing exceeds 250ms.**
- A full Penner easing set is published as tokens (`--ease-out-quad: cubic-bezier(.25,.46,.45,.94)`, `--ease-out-expo: cubic-bezier(.19,1,.22,1)`, etc.) **[measured]** — copy the token names verbatim.
- **Foreground is a 4-step ramp** (`#F7F8F8 / #D0D6E0 / #8A8F98 / #62666D`) and **borders a 3-step ramp** (`#23252A / #34343A / #3E3E44`) **[measured]**. Structure your neutrals this way.
- Type: Inter Variable with **`--font-variations: "opsz" auto`** and **`--font-settings: "cv01","ss03"`**; title weight **590**, bold **680** — non-round variable weights **[measured]**. Tracking scales negatively with size (`-.011em` body, `-.015em` tiny, `-.012em` titles).
- Body `15px/24px` = 1.6; measure 650px ≈ **77ch** **[measured]** — again slightly too wide.
- Nav links are **pills**: `border-radius: 9999px`, `padding: 0 12px`, `height 32px`, `13px` weight 510 **[measured]**.

### 2.7 Tailwind Typography (`prose`) — the sane defaults baseline
`https://github.com/tailwindlabs/tailwindcss-typography` (`src/styles.js`)
**Why it matters:** free, battle-tested reading defaults. Use as the floor, then beat it.

- `DEFAULT`: `max-width: 65ch`, `font-size: 1rem`, `line-height: 1.75`; `p` margins `1.25em / 1.25em`; `h2` `1.5em` with `2em / 1em` margins; `h3` `1.25em` with `1.6em / 0.6em`; `figure` `2em / 2em`; `figcaption` `0.875em`, `margin-top .857em`; `lead` `1.25em` **[source]**.
- `lg`: `font-size 1.125rem`, `line-height 1.778`; `p` `1.333em`; `h2` `1.667em` (`1.867em / 1.067em`); `figure` `1.778em` **[source]**.
- Note the pattern worth stealing: **all vertical rhythm is in `em`, so it scales with the size variant automatically.** Only `max-width` is in `ch`.

### 2.8 Osmosis — genre-adjacent IA (information architecture only)
`https://www.osmosis.org/learn/Introduction_to_the_cardiovascular_system`
**Why it matters:** an actual medical study platform with our exact artifact taxonomy. Included for its IA, **not** its visual craft, which is ordinary SaaS and below our bar.

- Artifact actions are presented as a **uniform row list**: small coloured glyph in a rounded square → bold title → one-line grey purpose → right-aligned action pill. Rows are identical in height regardless of type.
- Validates the taxonomy: *explain simply / summarise high-yield / quiz me / create flashcards* map almost 1:1 onto our resumo / mapa mental / questões / flashcards.
- **Anti-lesson:** the page is video-first with a persistent AI side panel, and the reading content is subordinate. We are inverting that — reading is primary, artifacts orbit it.

### 2.9 Raycast — "separate with space, not with lines"
`https://www.raycast.com/`
**Why it matters:** the one genuinely useful item recovered from the owner's listicles (Eleken credits it with *"negative space dividing information blocks instead of colored separators"*). **Not independently measured** — treat the principle as sound and the specifics as unverified.

- The principle is directly load-bearing for us: our artifact grids and reading pages should be separated by whitespace, not by boxes, borders, or tinted bands. Stripe Docs independently confirms this — its card grid has **`background: transparent; border: none; border-radius: 0; box-shadow: none`** **[measured]**.

---

## Part 3 — The four problems

### (a) Long-form reading with inline figures — the owner's biggest pain

**Best reference: Bartosz Ciechanowski (2.1).** Not close.

**Diagnosis of "tiring just to look at":** tiredness in reading UIs comes from four causes, in this order — (1) contrast extremes, (2) measure too long, (3) leading too tight for the size, (4) figures that interrupt the column with card chrome. Ciechanowski fixes all four.

**Steal exactly:**

1. **Kill both contrast extremes.** Never `#FFFFFF` ground, never `#000000` text. Our values: ground `#FAF8F4`, body ink `#3D3733` → **11.04:1** **[computed]**. Ciechanowski runs 9.17:1; we sit slightly above, which suits a serif.
2. **Body 19px at line-height 1.65.** He uses 19.2 / 1.6 with a sans. A serif needs marginally more leading at the same size; 1.65 is the target.
3. **Measure `66ch`** (hard cap `42rem` = 672px). He runs 73ch with a sans; a serif reads comfortably a little shorter. Apple's 86ch and Linear's 77ch are both too long — this is where we beat the adversary.
4. **Figures inset to 64% of the measure, centred, unboxed.** `width: 64%; margin: 2.25rem auto 2rem;` — no border, no radius, no shadow, no background plate. His literal values were `450px` inside `704px` with `margin: 36.8px 127px 32px`.
   - *Exception:* wide diagrams and tables get `width: 100%` of the column (Apple's strategy). Allow exactly two figure widths — `inset` (64%) and `full` (100%) — and nothing else. Never a third.
5. **Headings at lower contrast than body.** Body `#3D3733` (11.04:1), section headings `#241F1A` is *higher* — so invert his trick differently: keep h2/h3 at body weight-ish visual mass by using **size and space**, not colour or weight. If you do tint headings, tint them *down* toward `#4A423C`, never up to black.
6. **Paragraph separation `0.7em` as padding, not margin** — avoids margin-collapse surprises around figures and callouts.
7. **Bold lead-in sentence** to open each section (Apple's device, 2.3). Costs nothing, adds enormous scannability for exam revision.

**Layout for the reading page:**

```
[ 264px nav rail ] [ 3vw ] [ 66ch article column ] [ 3vw ] [ 200px right rail: TOC + progress + artifact chips ]
```
Right rail collapses below 1180px; nav rail collapses to a drawer below 900px.

### (b) Hierarchical left nav, 4–5 levels, that isn't a file tree

**Best reference: Stripe Docs (2.2)**, with Apple HIG's two additions (2.3).

Our hierarchy is 5 deep: **Discipline → Period → Parcial → Theme → Artifact.**

**The insight: never render more than 2 levels of indentation at once. Split the other levels onto different axes.**

Steal exactly:

1. **Split across axes.** Discipline = the top-level switcher (a horizontal bar, or the collapsed 84px tick rail from Stripe Press). Period + Parcial = uppercase group headers *inside* the sidebar. Theme = the flat link list. Artifact = never in the sidebar — it lives in the right rail and the page body.
   → Result: the sidebar only ever shows **group header + flat links**, exactly like Stripe Docs.
2. **Zero indentation for links.** All at `padding-left: 12px`. If you must indent, one step of **16px max**, and only for Theme→Sub-theme.
3. **Group headers at the same font-size as items** (14px/20px), differentiated only by `font-weight:600` + `text-transform:uppercase` + `--ink-3`. Add `letter-spacing:.06em` since we are uppercasing Portuguese words, which are longer than English.
4. **Active state is typographic, not a box.** `font-weight:650` + the discipline's `deep` colour. No pill, no fill, no left border. (Linear's pill is fine for a *tool*; it is wrong for a *library*.)
5. **A `Filtrar` input pinned at the top of the rail** (Apple's move). Non-negotiable at 5 levels and hundreds of themes — it is what stops the tree from ever needing to be fully expanded.
6. **Per-item glyph** (Apple's move) for artifact-type and discipline rows — 16px monochrome, inheriting `currentColor`.
7. **No tree lines, no connector rails, no disclosure triangles pointing at nothing.** Chevrons only on genuinely collapsible groups; `›` collapsed, `⌄` expanded.
8. **Scope, don't scroll.** Show only the current Discipline's tree. Sibling disciplines are reachable from the switcher, not from a 400-item scroll.
9. Sidebar: **264–280px, transparent background, no right border.** Separation by whitespace (Raycast principle, 2.9).

**Progress indicator** (the Stripe Press steal, mechanic #4): each Theme row carries a 2px bar whose fill width = % of that theme's artifacts consumed, in the discipline's `mid` colour at `opacity:.3` unfilled / `1` filled. This is the thing that makes it a *study* portal rather than a docs site.

### (c) Artifact-type icon grids

**Best reference: Stripe Docs' card grid (2.2)** for the container, **Apple HIG's sidebar glyphs (2.3)** for the icons.

Steal exactly:

1. **Zero card chrome.** Measured on Stripe Docs: `background: transparent; border: 0; border-radius: 0; box-shadow: none; padding: 0 0 24px` **[measured]**. The card is a *typographic cluster*, not a box. This is the difference between "elite" and "bootstrap dashboard".
2. **Grid: 3 columns, `gap: 20px`, columns ~346px in a 1079px container** **[measured]**. For our 8 artifact types use `repeat(auto-fill, minmax(220px, 1fr))` with `gap: 20px 24px`.
3. **Card anatomy, in this order:** type pill (11px uppercase, `letter-spacing:.08em`, discipline `deep` on discipline `pale`) → thumbnail or glyph plate → title (16px, `--ink-1`, weight 550) → 2-line description (14px, `--ink-3`, `-webkit-line-clamp: 2`) → metadata row (12px, `--ink-4`).
4. **A dot-rating row** for effort/difficulty (Stripe uses `●●●○` for integration effort) — perfect for "high-yield" or exam weight.
5. **One glyph per artifact type, 20px, monochrome, `currentColor`, on a `pale`-filled plate with `border-radius: 6px`.** Eight types: resumo, mapa mental, flashcards, questões, podcast, infográfico, vídeo, caso clínico. Draw them as a single sprite; do not use an icon-font CDN (GitHub Pages + CSP + FOUT).
6. **Colour is never the only channel.** See the CVD finding in Part 4 — glyph + label always accompany the hue.
7. Hover: **`transform: translateY(-2px)` over 120ms + thumbnail `scale(1.02)`**, nothing else. No shadow bloom, no border appearing, no colour wash.

### (d) Tasteful, restrained motion

**Best reference: Linear (2.6)**, corroborated by Apple (2.3) and Stripe's Sail tokens (2.2).

**What elite sites actually animate:** `opacity` and `transform`. That is the complete list. Apple's 700-element sample contained nothing else **[measured]**.

**What they deliberately do NOT animate:** `height`, `width`, `top/left/right/bottom`, `margin`, `padding`, `box-shadow`, `filter`, `background-position`, `border-width`. All of these force layout or paint on every frame.

**The duration ladder** (converged from three independent token sets — Stripe `120/160/320ms`, Linear `100/150/250ms`, Apple `150/180–240/320ms`):

```css
--dur-0:    0ms;    /* hover highlight IN — instant */
--dur-1:  120ms;    /* press, transform, icon shift */
--dur-2:  160ms;    /* state change, border/background */
--dur-3:  250ms;    /* colour, cross-fade */
--dur-4:  320ms;    /* section entrance, panel open */
/* nothing above 320ms except the one hero object */
```

**The easing set** (Linear's token names, verbatim):

```css
--ease-out-quad:    cubic-bezier(.25,.46,.45,.94);  /* default entrance */
--ease-in-out-quad: cubic-bezier(.455,.03,.515,.955); /* transforms */
--ease-out-cubic:   cubic-bezier(.215,.61,.355,1);
--ease-out-expo:    cubic-bezier(.19,1,.22,1);       /* hero object ONLY */
```

**The five rules:**

1. **Asymmetric hover.** In at `0ms`, out at `150ms` (Linear's `--speed-highlightFadeIn: 0s` / `--speed-highlightFadeOut: .15s`). Do this on every nav item and card.
2. **Enumerate the properties.** `transition: transform 120ms var(--ease-in-out-quad), opacity 120ms linear`. **Never `transition: all`** — Maggie Appleton's site does it 73 times and it is the one thing not to copy from her.
3. **Entrances travel 12–20px, never more.** Stripe Press moves 20px; its nav labels move 5px.
4. **Stagger by 40–60ms, cap the chain at 4 items.** Apple's `.18 / .20 / .22 / .24s` cluster is exactly this.
5. **`prefers-reduced-motion: reduce` must:** disable the WebGL hero (fall back to mechanic #10's flat plate), set all transforms to none, cap remaining opacity fades at 100ms, and disable scroll-linked animation entirely. Stripe Press ships none of this — we must.

**Scroll-linked motion:** use CSS `animation-timeline: view()` / `scroll()` where supported, with the flat fallback otherwise. Restrict it to **two** effects: the hero object rotation, and the nav progress fill. Nothing in the reading column ever animates on scroll — text that moves while you read is the definition of tiring.

---

## Part 4 — Proposed pastel palette

**The thesis, in one line:** *most pastel palettes look cheap because they put the pastel in the foreground.* They desaturate the ink. The premium version does the opposite — **the tint lives in the paper, the saturation lives in the ink.** Maggie Appleton (2.4) and Works in Progress (2.5) both prove it, and Stripe Press's light books do too.

The three concrete rules derived from those references:

1. **Ground:** warm off-white, L\* ≈ 96–98, low chroma. Never `#FFFFFF`.
2. **Ink:** hue-locked to the accent, **lightness ≈ 44% in OKLCH, chroma as high as sRGB allows.** Never a desaturated pastel.
3. **Surfaces:** the same hue at L ≈ 93.5%, chroma ≈ 0.038. This is the only place pastel appears.

All hex values below were generated by converting OKLCH → sRGB with **binary-search gamut fitting** (so the stated OKLCH and the hex agree exactly — no browser-dependent gamut mapping), and all ratios are WCAG 2.1 **[computed]**. Script: `docs/` sibling work, reproducible in ~60 lines of Node.

### 4.1 Neutrals

| Token | Hex | vs `--paper` | vs `#FFF` | vs `--paper-sunken` | Use |
|---|---|---|---|---|---|
| `--paper` | `#FAF8F4` | — | 1.06:1 | 1.11:1 | reading ground |
| `--paper-raised` | `#FFFFFF` | 1.06:1 | — | — | figure plates, modals |
| `--paper-sunken` | `#F1ECE3` | 1.11:1 | — | — | sidebar, wells, code |
| `--ink-1` | `#241F1A` | **15.40:1** | 16.33:1 | 13.88:1 | headings, active nav |
| `--ink-2` | `#3D3733` | **11.04:1** | 11.71:1 | 9.96:1 | **body copy** |
| `--ink-3` | `#6B635C` | **5.55:1** | 5.89:1 | 5.01:1 | captions, group headers |
| `--ink-4` | `#8C837B` | 3.51:1 | 3.72:1 | 3.16:1 | metadata — **large text only (≥18.66px or ≥14px bold)**; fails AA for body |
| `--line-1` | `#E7E1D7` | 1.23:1 | — | — | hairline rules |
| `--line-2` | `#D6CDBF` | 1.48:1 | — | — | section rules |
| `--line-3` | `#BDB2A1` | 1.97:1 | — | — | emphasis rules, dividers |

A 4-step ink ramp and 3-step line ramp, following Linear's structure (2.6). The warm bias (hue ≈ 40–50°) is what keeps it from reading as cold "developer grey".

### 4.2 The 11 discipline accents

Hue-locked families, four roles each. **All 11 `deep` values land between 7.02:1 and 7.86:1 on paper** — they pass **AAA** for body text and are perceptually equal in weight, so no discipline looks louder than another. That evenness is the mark of a designed palette rather than a picked one.

| # | Disciplina | OKLCH H | `deep` (text) | AA/paper | `mid` (icons) | vs white | `pale` (surface) | ink-2 on pale | `hair` (border) |
|---|---|---|---|---|---|---|---|---|---|
| 01 | Anatomia | 22 | `#8A2F32` | **7.82:1** | `#CA5556` | 4.25:1 | `#FFE2E0` | 9.60:1 | `#F3C4C1` |
| 02 | Histologia | 352 | `#832F5A` | **7.86:1** | `#C1558A` | 4.26:1 | `#FFE0EC` | 9.55:1 | `#EFC3D5` |
| 03 | Embriologia | 320 | `#70377D` | **7.82:1** | `#A75FB7` | 4.23:1 | `#F5E2FA` | 9.56:1 | `#E2C6E8` |
| 04 | Bioquímica | 292 | `#564291` | **7.66:1** | `#846CD1` | 4.16:1 | `#E9E6FE` | 9.60:1 | `#D1CBF3` |
| 05 | Fisiologia | 262 | `#2A4F96` | **7.45:1** | `#4C7DD9` | 4.01:1 | `#DEEAFF` | 9.66:1 | `#BED2F6` |
| 06 | Farmacologia | 232 | `#005A7B` | **7.20:1** | `#028CBC` | 3.83:1 | `#D1EFFF` | 9.76:1 | `#AED8EF` |
| 07 | Microbiologia | 198 | `#005F61` | **7.05:1** | `#009296` | 3.78:1 | `#CDF2F3` | 9.81:1 | `#A7DDDE` |
| 08 | Imunologia | 172 | `#01614D` | **7.02:1** | `#029678` | 3.73:1 | `#D1F2E7` | 9.80:1 | `#ADDDCD` |
| 09 | Patologia | 132 | `#375F00` | **7.07:1** | `#5D9222` | 3.75:1 | `#E0EFD5` | 9.75:1 | `#C4D9B4` |
| 10 | Semiologia | 88 | `#674F00` | **7.35:1** | `#9F7B00` | 3.96:1 | `#F4E9CD` | 9.70:1 | `#E0D0A8` |
| 11 | Saúde Coletiva | 52 | `#823C00` | **7.63:1** | `#C3610D` | 4.17:1 | `#FFE3D3` | 9.58:1 | `#EFC8B1` |

Generation parameters: `deep` = `oklch(0.44 0.125 H)`, `mid` = `oklch(0.60 0.150 H)`, `pale` = `oklch(0.935 0.038 H)`, `hair` = `oklch(0.86 0.055 H)`, each gamut-fitted down where sRGB cannot hold the chroma (cyan/teal hues 172–232 fit at C ≈ 0.075–0.09 for `deep`).

**Three hard usage rules, derived from the numbers:**

1. **`mid` is 3.73–4.26:1 on white — sufficient for icons, chart marks, rules and 3px bars (WCAG 1.4.11 needs ≥3:1) but it FAILS the 4.5:1 body-text threshold.** `mid` must never carry text. Text uses `deep`.
2. **`deep` on its own `pale` is 5.66–6.80:1** and body `--ink-2` on any `pale` is **9.55–9.81:1** — so tinted callout blocks are safe with either ink.
3. **Colour is never the only channel.** A deuteranopia simulation of the `mid` row **[computed]** shows real collapses: Microbiologia `#009296` → `#5C5395` and Imunologia `#029678` → `#5F5582` become nearly identical; Anatomia / Histologia / Semiologia / Saúde Coletiva all converge on olive. Closest pair in OKLab is Microbiologia/Imunologia at **0.051** — right at the discrimination threshold. **Every discipline chip must carry a glyph and a text label.** Also: order the nav so hue-adjacent disciplines are never vertically adjacent.

### 4.3 Semantic and interactive

| Token | Hex | vs paper | vs white | Note |
|---|---|---|---|---|
| `--success` | `#0F6A31` | 6.33:1 | 6.72:1 | |
| `--warning` | `#8A5601` | 5.80:1 | 6.15:1 | |
| `--danger` | `#A12628` | 7.01:1 | 7.44:1 | distinct from Anatomia `#8A2F32` — keep them apart in UI |
| `--info` | `#015E8C` | 6.64:1 | 7.04:1 | |
| `--link` | `#005799` | 7.01:1 | 7.44:1 | |
| `--link-visited` | `#614092` | 7.45:1 | 7.90:1 | |
| `--focus-ring` | `#1289E7` | 3.44:1 | — | passes the 3:1 non-text minimum; use as `outline: 2px solid; outline-offset: 2px` |

### 4.4 The per-discipline theming contract

Adopt Stripe Press mechanic #7 exactly. One attribute on a container, four tokens resolved:

```css
[data-disciplina="fisiologia"] {
  --accent-deep: #2A4F96;
  --accent-mid:  #4C7DD9;
  --accent-pale: #DEEAFF;
  --accent-hair: #BED2F6;
}
```

Then every component uses only `var(--accent-*)`, `var(--ink-*)`, `var(--paper*)`. Swapping a discipline re-themes the entire page with one attribute change, and `::selection { background: var(--accent-deep); color: var(--paper) }` comes free.

**Do not tint the reading page's ground per discipline.** The accent appears in the nav rail, the hero, the section rules, the artifact chips and the callouts — the article ground stays `--paper` on every page in the site. This is the discipline that keeps 11 colours from becoming a circus.

---

## Part 5 — Typography pairing

**Constraint:** free / OFL / system-safe, self-hosted (GitHub Pages), full Latin-1 + Latin Extended-A for Portuguese and Spanish diacritics (`ã õ ç ñ á é í ó ú ü ¿ ¡`).

### 5.1 The families

| Role | Recommendation | Why |
|---|---|---|
| **Reading serif** | **Newsreader** (Production Type, OFL, variable `opsz 6–72`, `wght 200–800`, true italic) | The closest free analogue to Stripe Press's Ivar: sharp, editorial, moderately high contrast, and — critically — it has a real **optical-size axis**, which is exactly what gives Ivar Display / Headline / Text its three-cut coherence from one family. Designed for continuous on-screen reading. |
| **Reading serif (safe alternative)** | **Source Serif 4** (Adobe, OFL, variable `opsz 8–60`, `wght 200–900`) | Lower contrast, sturdier at small sizes, more forgiving on low-DPR Windows displays. **Decision rule:** if Newsreader's thin strokes look fragile at 19px on the owner's actual monitor, switch to Source Serif 4. Test this before committing — it is a 5-minute check and the wrong answer is painful later. |
| **UI / navigation sans** | **Inter** (variable, `opsz auto`) | The Linear/Stripe default for good reason. Enormous charset, excellent at 13–15px, has disambiguating character variants. Enable optical sizing: `font-optical-sizing: auto`. Enable the disambiguation stylistic set so capital-I, lowercase-l and digit-1 are distinguishable — **verify the exact tag (`ss02` in current Inter) against the version you ship**; it matters for drug doses and lab values. |
| **Mono** | **JetBrains Mono** or **IBM Plex Mono** | Doses, CID codes, lab ranges, formulas. |
| **Display (optional)** | **Fraunces** (variable, `SOFT`/`WONK` axes) | Only if the discipline hero needs more personality than Newsreader's `opsz 72`. Use on **at most** the hero title. Adding a fourth family anywhere else is a mistake. |

**Do not** use Playfair Display (over-exposed, poor at text sizes), Merriweather (too wide, x-height fights the pastel calm), Lora (soft, reads amateur at display sizes), or any Google Font without a variable axis — you lose the optical-size trick that is doing half the work here.

**Loading:** self-host woff2, subset to `latin` + `latin-ext`, `font-display: swap` (Stripe Press does exactly this **[measured]**), `<link rel="preload">` the two faces used above the fold (Newsreader text-opsz 400, Inter 400). Do not hotlink Google's CDN — privacy, and one fewer connection on a repo-hosted site.

### 5.2 The scale ramp

Root = `16px`. Body sits at step 1, not step 0 — reading text should be larger than UI text.

| Step | rem | px | line-height | tracking | Role |
|---|---|---|---|---|---|
| −2 | `0.75rem` | 12 | 1.40 | `+0.08em` | uppercase micro-labels, type pills, dot ratings |
| −1 | `0.875rem` | 14 | 1.45 | `-0.006em` | nav links, captions, metadata |
| 0 | `1rem` | 16 | 1.50 | `0` | UI text, dense lists, table cells |
| **1** | **`1.1875rem`** | **19** | **1.65** | `0` | **reading body (serif)** |
| 2 | `1.375rem` | 22 | 1.50 | `-0.005em` | lead / standfirst (serif, often italic) |
| 3 | `1.625rem` | 26 | 1.30 | `-0.010em` | h3 |
| 4 | `2rem` | 32 | 1.22 | `-0.015em` | h2 |
| 5 | `2.625rem` | 42 | 1.12 | `-0.020em` | h1 / page title |
| 6 | `3.5rem` | 56 | 1.05 | `-0.022em` | discipline hero display |

Fluid body: `font-size: clamp(1.0625rem, 0.99rem + 0.38vw, 1.1875rem)` → 17px at 360px, 19px at ~1200px.

Fluid display: `font-size: clamp(2rem, 1.4rem + 3vw, 3.5rem)`.

**Weights.** Use non-round variable weights, as Linear does (**[measured]**: titles 590, bold 680):
`--w-body: 400` (serif on paper — but see the caution below), `--w-medium: 520`, `--w-semi: 580`, `--w-bold: 660`.

> **Caution from Stripe Press:** they set body Ivar Text at **weight 500**, not 400 **[measured]**, because 400 goes anaemic on a tinted ground. Our paper is much lighter than theirs, so 400 should hold — but check Newsreader at 19px/400 on `#FAF8F4` and be prepared to go to 440.

### 5.3 Measure, rhythm and the reading column

- **Measure: `max-width: 66ch`, hard cap `42rem` (672px).** Between Tailwind's 65ch **[source]** and Ciechanowski's 73ch **[measured]**, and deliberately shorter than Apple's 86ch and Linear's 77ch — this is a measurable win over the adversary.
- **Paragraph separation: `padding: 0.7em 0`** (Ciechanowski's `13.44px` on `19.2px` **[measured]**), not margins.
- **Heading space, all in `em` so it scales with the variant** (Tailwind's pattern **[source]**): h2 `margin: 2em 0 0.9em`; h3 `margin: 1.6em 0 0.55em`.
- **Figures: `margin: 2.25em auto 2em`**; `inset` variant `width: 64%`, `full` variant `width: 100%`. No border, radius, shadow or background.
- **Captions: `0.875em`, `margin-top: 0.857em`, colour `--ink-3`.** Apple keeps captions at full body colour **[measured]**; we dim slightly because our figures are denser. Do not go below `--ink-3` (5.55:1).
- **The section-label pattern** (Stripe Press #13): 60px × 1px rule in `--accent-hair`, 16px gap, italic serif at `1.2em` in `--ink-3`, `margin: 3.5rem 0 1.25rem`.
- **Lists:** same 19px/1.65, `padding-left: 1.4em`, item spacing `0.4em`. Markers in `--accent-mid`.
- **Hyphenation:** `hyphens: auto; lang="pt-BR"` — Portuguese has long words and a 66ch measure will rag badly without it. Also set `text-wrap: pretty` on headings to kill orphans.

---

## Part 6 — Anti-patterns

Blunt list. Each of these will make the site look amateur, and most are the *default* outcome if nobody intervenes.

### Palette

1. **Pastel foreground.** Pastel text, pastel icons, pastel buttons. This is *the* cheap-pastel failure mode. Tint the paper; keep the ink deep and saturated (Part 4 thesis).
2. **Desaturated mid-lightness colours.** `#B8C5D6`-style "dusty" tones at 50–70% lightness with 15% saturation. They read as a 2014 Bootstrap theme. Works in Progress keeps saturation at 45–91% **[measured]** and moves only lightness.
3. **Pure `#FFFFFF` and pure `#000000`.** Neither appears anywhere in this dossier's references except Apple's ground, and that is the thing we are beating them on.
4. **Cold neutral greys.** `#888` on a cream page looks broken. Every grey must carry the paper's warm hue.
5. **Gradients on surfaces.** Zero of the eight elite references use a gradient as a surface fill. Not one.
6. **Colour as the only channel** for 11 disciplines. The deuteranopia sim **[computed]** shows Microbiologia and Imunologia collapsing into each other. Glyph + label, always.
7. **Tinting the article's ground per discipline.** Eleven differently-coloured reading pages is a circus, and it makes figures unpredictable.

### Typography

8. **A second display face "for variety".** Three families is the ceiling (serif + sans + mono). Stripe Press ships one family in three optical cuts.
9. **Bold display type.** Maggie Appleton's 81.8px headline is **weight 400** **[measured]**. Heavy display serif reads as a newspaper ad.
10. **Measure over 75ch.** The adversary's 86ch is its main weakness — do not copy the thing you are trying to beat.
11. **Line-height 1.4 on 19px serif.** Too tight; this is a direct cause of "tiring". 1.65.
12. **Justified text.** Without proper H&J it produces rivers. Ragged-right, `hyphens: auto`.
13. **Uppercase Portuguese without tracking.** `PROCEDIMENTOS DIAGNÓSTICOS` at `letter-spacing: normal` is illegible mush. `+0.08em` minimum.
14. **Letting markdown-generated `h1..h6` inherit browser defaults.** Reset them to zero and drive size from classes (Stripe Press #12), or 400 pages will drift.

### Layout and components

15. **Card chrome.** Border + radius + shadow + background on every tile. Stripe Docs' own card grid has **none of the four** **[measured]**. The card is a typographic cluster.
16. **Separating everything with lines and boxes.** Use space (Raycast principle, 2.9). A hairline is a deliberate accent, not a default.
17. **A file-tree sidebar** with connector lines, disclosure triangles and 5 indent levels. Stripe Docs renders 42 links at **one** indent position **[measured]**.
18. **An always-expanded nav.** Scope to the current branch; ship the `Filtrar` input.
19. **Active nav state as a coloured pill.** Fine for a tool (Linear), wrong for a library. Typographic emphasis only.
20. **Big colourful illustrations as artifact-type icons.** 20px monochrome glyphs in `currentColor`. Anything else dates in 18 months.
21. **Icon fonts from a CDN.** CSP, FOUT, and a network dependency on a static site. Inline SVG sprite.
22. **Emoji as artifact-type icons.** Renders differently on every OS and instantly reads as a hobby project.

### Motion

23. **`transition: all`.** Maggie Appleton's site does it 73 times **[measured]** — it is the one thing on her site not to copy. Enumerate properties.
24. **Animating layout properties** (`height`, `top`, `margin`, `box-shadow`, `filter`). Only `opacity` and `transform`.
25. **Durations over 320ms** on anything a user touches more than once a day. Stripe Press's 1000ms + 500ms-delay section entrance is genuinely too slow for a study tool.
26. **Symmetric hover.** In should be instant, out should take 150ms (Linear **[measured]**).
27. **Scroll-jacking / smooth-scroll hijacking / parallax in the reading column.** Text that moves while being read is the definition of tiring, which is the exact complaint we are solving.
28. **Entrance animations on content the user scrolled to deliberately.** Fade-in-on-scroll for every paragraph is the single most common way a good site becomes annoying on the second visit.
29. **No `prefers-reduced-motion` branch.** Stripe Press appears to ship none **[measured]**. Vestibular disorders are common; this is not optional.
30. **A WebGL hero with no fallback.** Stripe Press has one (`--isNotWebGL` → flat plate). Ours must too, and it doubles as the reduced-motion path.

### On the four links the owner sent

Assessed honestly, because knowing what *not* to copy is worth as much as the references.

- **`eleken.co/blog-posts/homepage-design-examples`** and **`eleken.co/blog-posts/best-website-design-examples`** — agency listicles of **SaaS marketing homepages**. A homepage's job (convert a stranger in 8 seconds) is the opposite of ours (serve a returning student for two hours). Of ~40 examples, none demonstrates long-form reading, deep hierarchy, artifact grids, or motion restraint. **Two salvageable items:** Raycast's "negative space instead of coloured separators" (kept as 2.9), and the article's own note that Ashby's icon placement "creates visual clutter" — a useful warning against decorating a grid with logos plus icons plus labels. The second article's entry on Stripe Press ("floating rotating 3D covers, dark background, vertical timeline-style navigation") is an accurate description and independently confirms our Part 1 read. Everything else — Lusion, Pitch, DIKO, Hydra, Zeabur, Continue.dev — is spectacle marketing.
- **`websitesetup.org/.../best-designed-websites/`** — 41 entries, overwhelmingly agency portfolios, 360° tours and campaign microsites. Four are genre-adjacent (Climate Science Risk & Solutions; Pattern Radio: Whale Songs; BASIC® Culture Manual; Codex Atlanticus) and one is palette-adjacent (Westbound Mag, "coconut white"). **Zero** are described as having left-side navigation. Net contribution to our four problems: nothing.
- **`dribbble.com`** — **do not use as a source.** Dribbble optimises for a static 4:3 image, which means the work systematically omits everything we actually have to build: empty states, loading states, error states, 400-item scroll performance, real Portuguese string lengths, focus rings, keyboard traversal of a 5-level tree, and contrast ratios. The standing critique is that it *"rewards designs that photograph well, not designs that work well."* Concretely, three Dribbble habits will wreck this project if they leak in: (i) oversized pastel cards with heavy shadows and 16–24px radii on a 3-item grid that must actually hold 40 items; (ii) hero numbers and charts with invented, perfectly-shaped data; (iii) colour palettes chosen for the thumbnail with no contrast verification — exactly the "cheap pastel" failure in item 1 above. If Dribbble is used at all, use it for *illustration style* on the artifact glyphs, never for layout, density or colour.

---

## Part 7 — Adversário do teste cego

### Escolha: **Apple Human Interface Guidelines**

**URL:** `https://developer.apple.com/design/human-interface-guidelines/typography`
(página raiz para navegação: `https://developer.apple.com/design/human-interface-guidelines`)

**Por que esta e não outra**

- **(a) Pública por URL.** Sem login, sem paywall, sem cookie-wall bloqueante. Estável há anos.
- **(b) Mesmo gênero — e, mais importante, mesmo *formato de conteúdo*.** É um portal de conhecimento com navegação lateral persistente, taxonomia profunda (Design → HIG → Foundations → Typography → seções) e leitura longa densa em figuras ilustrativas. Não é documentação de código: é *conceito explicado com imagens*, que é exatamente a forma de um resumo de Anatomia ou Fisiologia. Docs de dev (Stripe, Tailwind) são code-first e comparariam mal.
- **(c) Elite de verdade.** Layout de três colunas (rail de 200px com glifo por item e campo `Filter` / artigo de 740px / rail direito com TOC e metadados), SF Pro a `17/25` com tracking óptico `-0.022em`, produção de figuras praticamente imbatível, e movimento limitado a `opacity`/`transform` em 180–240ms **[medido]**. Não é um listicle; é um artefato de referência mantido por uma equipe de design de classe mundial.

**Por que é difícil de bater**

A qualidade das figuras é intocável, a hierarquia é impecável e não há um único elemento decorativo. Não dá para ganhar por "capricho visual" — só dá para ganhar por decisões de leitura melhores.

**Onde exatamente podemos ganhar** (torna o adversário duro *e* útil — cada item é mensurável no teste cego):

| Eixo | Apple HIG **[medido]** | MedVault (meta) |
|---|---|---|
| Medida de linha | **86ch** — longo demais | **66ch** |
| Fundo | `#FFFFFF` puro | `#FAF8F4` (sem extremo de contraste) |
| Codificação por seção | nenhuma | 11 famílias de matiz verificadas |
| Progresso de leitura | nenhum | barra por tema no rail |
| Corpo de texto | sans 17px | serif 19px/1.65 |
| Calor / personalidade | zero | é o nosso terreno |
| Movimento | essencialmente nenhum | contido, mas presente |

**Vice-campeão:** `https://docs.stripe.com/payments/online-payments` — craft de engenharia superior (tokens `120/160/320ms`, sidebar de 42 links em indentação zero), mas gênero pior: é code-first e o conteúdo não tem figuras. Use como segundo adversário se quiser testar especificamente **navegação profunda**, e o HIG para testar **leitura longa**.

---

## Appendix — token starter (paste-ready)

```css
:root {
  /* paper */
  --paper:#FAF8F4; --paper-raised:#FFFFFF; --paper-sunken:#F1ECE3;
  /* ink */
  --ink-1:#241F1A; --ink-2:#3D3733; --ink-3:#6B635C; --ink-4:#8C837B;
  --line-1:#E7E1D7; --line-2:#D6CDBF; --line-3:#BDB2A1;
  /* semantic */
  --success:#0F6A31; --warning:#8A5601; --danger:#A12628; --info:#015E8C;
  --link:#005799; --link-visited:#614092; --focus-ring:#1289E7;
  /* motion */
  --dur-0:0ms; --dur-1:120ms; --dur-2:160ms; --dur-3:250ms; --dur-4:320ms;
  --ease-out-quad:cubic-bezier(.25,.46,.45,.94);
  --ease-in-out-quad:cubic-bezier(.455,.03,.515,.955);
  --ease-out-cubic:cubic-bezier(.215,.61,.355,1);
  --ease-out-expo:cubic-bezier(.19,1,.22,1);
  /* type */
  --font-serif:"Newsreader",Georgia,serif;
  --font-sans:"Inter","Segoe UI",system-ui,sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,monospace;
  --measure:66ch;
  /* space = multiples of body size (Appleton) */
  --s-3xs:.25rem; --s-2xs:.5rem; --s-xs:.875rem; --s-s:1.1875rem;
  --s-m:1.78rem; --s-l:2.375rem; --s-xl:3.5625rem; --s-2xl:4.75rem; --s-3xl:7.125rem;
}
@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important; scroll-behavior:auto !important; }
}
```

Discipline blocks: see §4.4 for the `[data-disciplina]` contract and §4.2 for all 44 values.
