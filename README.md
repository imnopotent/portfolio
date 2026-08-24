# ilyass.online

A desktop. Your face is the wallpaper, your work sits on it as files, the dock
holds everything else. Double-click a file to open it. Drag things around.

You edit everything at **ilyass.online/admin** — no code.

---

## Getting it live (about 20 minutes, one time)

**1. GitHub account** — free, at github.com. Create a new repository, name it
whatever you like, set it to Public.

**2. Upload these files** to that repository (drag the whole folder onto the
GitHub upload page).

**3. Edit one line.** Open `admin/config.yml` and change:

```
repo: USERNAME/REPO
```

to your actual GitHub username and repository name.

**4. Cloudflare Pages** — free, at pages.cloudflare.com. Connect your GitHub
repository. Leave the build settings empty — there is nothing to build. Deploy.

**5. Your domain** — in Cloudflare Pages, add `ilyass.online` as a custom
domain and follow the DNS instructions. Keep WordPress running until this is
working, then switch.

**6. Log in** at `ilyass.online/admin` with GitHub. That's your panel.

Total cost: nothing, ever.

---

## Using the admin panel

Open `ilyass.online/admin`. One section, "Everything", holding:

**Wallpaper** — your photo. Portrait, shot straight on, plain background. It
fills the whole screen, so shoot it at a decent size.

**Projects** — the files on the desktop. Add, delete, drag to reorder. Each has
a title (shown under the icon), an icon image, however many full images you
want, and a description. Upload images right there.

**Dock** — the row at the bottom. Change letters and colours, or upload your
own icon images. Each item can open your CV, open your mail, or go to a link.
Put your real Instagram and Behance URLs in.

**About text** — what shows when someone opens the CV icon.

Hit Publish. The site updates in about a minute.

### Icon positions

Leave the position fields empty and icons are placed automatically —
scattered, never overlapping, identical on every visit. Fill them in (numbers
0–100, across and down) if you want a specific piece somewhere specific.

Visitors can drag icons around; that's just for fun and resets on reload.

---

## On phones

The desktop metaphor doesn't work on a phone — no double-click, no dragging,
no room. Phones get your photo at the top and a plain scrolling list of work
underneath. Same content, no gimmick.

---

## Notes

- The admin panel is only yours. It's locked to your GitHub account; nobody
  else can log in, and it's hidden from search engines.
- Images: longest edge about 2000px. Icon images look best square.
- If you ever want to move off Sveltia, `admin/index.html` has a one-line
  swap to Decap in a comment. Same config, same content.
- Nothing here depends on a paid service.
