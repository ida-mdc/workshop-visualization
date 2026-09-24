# Editions

```
/                 landing/
/draft/           content/            everything, drafts included
/2026-workshop/   content/            the edition being worked on
/2025-workshop/   tag 2025-workshop
/2025-seminar/    tag 2025-seminar
/2024-workshop/   tag 2024-workshop
```

Every `<year>-<name>` tag is a published edition, and the tag name is its URL.
Name them however you like - `2024-course`, `2027-summer-school` - as long as
they start with the year.

`content/` holds only the edition being worked on, reworked in place. A page's
filename is its URL, so `content/voxels.md` is published at
`/2026-workshop/voxels/`.

## The draft URL

    https://ida-mdc.github.io/workshop-visualization/draft/

Built on every push to `main`, and the only copy that includes pages marked
`draft: true`. Nothing links to it - not the landing page, not the editions -
so the way to it is this file. Send it to someone who should read a page
before it is finished.

It is public, because the repository is. It is not secret, just unlisted: the
pages carry `noindex` so that an unfinished edition does not turn up in a
search for the finished one, and that is the whole of the protection. Do not
put anything there that should not be read.

`/draft/` and `/2026-workshop/` are built from the same working tree, so once
`PUBLISH_CURRENT` is `true` the only difference between them is the draft
pages.

## Build

    ./preview.sh     whole site at http://localhost:1313/
    hugo server      current edition only, with live reload

Both `preview.sh` and the deploy workflow use `tools/build-site.sh`.

## Freeze an edition

    git tag -a 2026-workshop -m "HIDA workshop, November 2026 - Berlin"
    git push --follow-tags

That is all of it. The build picks the tag up, publishes it at
`/2026-workshop/`, and adds it to the landing page, where the annotation
becomes its description. Rows are ordered by each edition's own `date` in
`content/_index.md`, so they read chronologically.

Two things to check before tagging, because the tag is what gets published
from then on:

- delete pages you do not want online, such as internal notes and to-do lists
- `content/_index.md` becomes the front page at `/2026-workshop/`, so make it
  the event itself rather than a page whose only content is a link onwards

An event that shares pages with another one still needs its own tag, and the
tag has to contain everything it links to. The 2025 seminar reused several of
the workshop's tutorial pages, so `2025-seminar` carries its own copies.

## Open the next edition

Say the 2026 workshop is over and you are starting 2027.

1. Set the edition in `config.toml`. This is the only place it is defined, and
   it is both the URL and the tag you will use later:

   ```toml
   [params]
   edition = "2027-workshop"
   ```

2. In `.github/workflows/gh-pages.yml`, set `PUBLISH_CURRENT: 'false'` so the
   new edition stays off the live site while you work on it. Set it back to
   `'true'` when it should go public.

3. In `landing/index.html`, update the card under "Next workshop" with the new
   year, dates and venue. While `PUBLISH_CURRENT` is `'false'` keep it as the
   grey `<div class="featured upcoming">` panel, which announces the event
   without linking to it. When you publish, turn it back into a link:

   ```html
   <a class="featured" href="2027-workshop/">
   ```

4. Rework `content/` in place. Delete the pages the new edition does not
   teach - they stay in the previous edition's tag, so nothing is lost. To
   bring one back, `git checkout 2026-workshop -- content/thatpage.md`.

Run `./preview.sh` to see the result before pushing.

## Tags must stay pushed

Archived editions load their images from `raw.githubusercontent.com` pinned to
their tag. Delete or move a tag and that edition loses its images.
