# Tome — D&D 5e (2024) Character Keeper

A fast, good-looking home for all of your D&D characters. Tome is an installable web app (PWA): it works offline at the table, and
syncs your characters across your phone, tablet and computer through your own free Supabase project.

## Features

- **Character library**: portrait cards tinted in each class's color, with search, sort, campaign filters and archiving.
- **Guided creation** using the 2024 rules: class, species and lineage, background (+2/+1 or +1/+1/+1), standard array, point buy or rolled scores, and skills.
- **Full sheet** with swipeable tabs:
  - **Overview**: HP with damage/heal/temp, death saves, Heroic Inspiration, Exhaustion (2024 −2 per level), conditions, hit dice and abilities.
  - **Skills & Saves**: proficiency and expertise, Jack of All Trades, proficiencies, defenses.
  - **Combat**: attacks with to-hit, damage and critical rolls (advantage and disadvantage too), plus AC that's calculated automatically from equipped armor.
  - **Spells**: save DC and attack, spell slots (single-class, multiclass and Pact Magic), prepared spells, and a cast button that spends a slot.
  - **Inventory**: currency (type `+25` or `-10`), encumbrance, equip and attune.
  - **Features**: every class, species and feat feature, with limited-use trackers.
  - **Notes**: session log, backstory and personality.
- **Level up** helper that adds HP (average or rolled), new class and subclass features, recalculated slots, and multiclassing.
- **Short and long rests** that spend Hit Dice and reset the right trackers.
- **Dice roller** with roll history; tap any modifier on the sheet to roll it.
- **SRD 5.2 compendium**: 339 spells, 425 items (equipment plus magic items), feats and conditions, searchable and addable to a sheet.
- **Backups**: export or import JSON for one character or all of them.
- Dark mode (default), light mode or system.

## Run locally

```bash
npm install
npm run dev
```

## Set up cross-device sync (Supabase, free)

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql) and press **Run**. This creates the `characters` table with
   row-level security, so each account can only see its own characters.
3. In **Authentication → URL Configuration**, set **Site URL** to where you host Tome (e.g. `https://<you>.github.io/cursor/`) and
   add the same URL to **Redirect URLs**.
4. *(Recommended for iPhone home-screen use)* In **Authentication → Email Templates → Magic Link**, add `{{ .Token }}` to the
   template so the email also contains a 6-digit code you can type into the app.
5. Open Tome → **Settings → Cloud sync**, paste the **Project URL** and **anon / publishable key** (Project Settings → API) and sign
   in with your email. Repeat the sign-in on each device.

To skip pasting the keys on every device, add repository **variables** (Settings → Secrets and variables → Actions → Variables)
named `SUPABASE_URL` and `SUPABASE_ANON_KEY`; the deploy workflow bakes them into the build.

### How sync works

Every edit is saved on the device first (IndexedDB), so the app is instant and works offline. When you're signed in, changes are
pushed to Supabase a moment later, pulled when the app regains focus, and streamed live between open devices. If two devices edit
the same character, the most recent edit wins.

## Deploy to GitHub Pages

1. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually). The site is published at
   `https://<user>.github.io/<repo>/`.
3. On your phone, open the site and choose **Add to Home Screen**.

## Updating the rules data

`src/data/srd` is generated from the [5e-bits/5e-database](https://github.com/5e-bits/5e-database) SRD 5.2 (2024) dataset:

```bash
git clone --depth 1 https://github.com/5e-bits/5e-database.git /tmp/5e-database
npm run srd -- /tmp/5e-database
```

## Legal

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode. Data compiled by the 5e-bits/5e-database project (MIT).
