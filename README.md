# Joshua Odukaiye Studios: website

> **Easiest way to run the site:** set up the private dashboard once by following `SETUP-DASHBOARD.md`. After that you create client codes, upload photos, edit your bio and read booking enquiries from `admin.html`, without touching any file. Everything below describes the older, file-based way, which still works if you leave the dashboard switched off.

A fast, dark portfolio site for the studio. It has no build step and no server: it is plain files that any free host can serve.

## What is in the folder

| File or folder | What it is | Do you edit it? |
| --- | --- | --- |
| `index.html` | The page itself, including the bio text | Sometimes (bio, headings) |
| `config.js` | Your WhatsApp number, email, Instagram, logo | Yes |
| `portfolio.js` | The list of photographs and how they are arranged | Yes, when you add photos |
| `admin.html` | Your private dashboard (log in to use it). See `SETUP-DASHBOARD.md` | Open it in your browser |
| `supabase/schema.sql` | One-time database setup for the dashboard | Paste it once into Supabase |
| `galleries.js` | Private client gallery entries (older method, used only without the dashboard) | No |
| `img/` | The photographs (two sizes of each) | Yes |
| `tools/gallery-maker.html` | Locks a client's Google Drive link with an access code | Open it in your browser |
| `style.css`, `app.js`, `lib/` | Design and behaviour | Rarely |

## What is on the site now

Four sections, taken from how your files were named: **Studio portraits** (4 photos), **Graduation sessions** (2), **Worship gatherings** (9) and **Live recording sessions** (5). Fashion and editorial and Weddings and events are listed as services in the text, but have no photo section yet because no photographs for them came through.

## Put it online (GitHub Pages, free)

1. On github.com create a new **public** repository, for example `joshua-odukaiye-studios`.
2. Open the folder on your computer, select **everything inside it**, and drag it into the repository page (**Add file, Upload files**). Upload the contents, not the folder itself, so `index.html` ends up at the top level. Click **Commit changes**.
3. Go to **Settings, Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute your address appears at the top of that page: `https://YOUR-USERNAME.github.io/joshua-odukaiye-studios/`.

### Your own web address (recommended for a brand)

Buy a domain such as `joshuaodukaiye.com` from any registrar, then in **Settings, Pages, Custom domain** enter it and follow GitHub's DNS instructions. GitHub provides the https certificate for free.

## Everyday changes

**Phone, email, Instagram, logo.** Edit `config.js`. For Instagram, enter your exact username without the @. The link stays hidden until you do. To show your logo, upload it as `img/logo.png` (transparent background works best) and change `logo: ""` to `logo: "img/logo.png"`.

**Add a photo.** The instructions are also at the top of `portfolio.js`. Export two JPEGs: `name-m.jpg` (long edge about 1200 px) and `name.jpg` (long edge about 2000 px). Upload both to `img/`, then add a line to `portfolio.js`. The instructions are at the top of that file. Export from Lightroom or Photoshop with "sRGB" and metadata limited to copyright, so location data is not published.

**Add a Fashion or Wedding section.** Put the photos in `img/` as described above, then copy one whole `{ ... }` block in `portfolio.js`, paste it where you want the section to appear, and change its `id`, `title`, `note` and photo lines. The section and its photo count appear on the site by themselves.

**Change the bio.** Edit the paragraphs in `index.html` under `id="about"`.

## Private client galleries

1. Upload the client's photos to a Google Drive folder and set it to "Anyone with the link can view".
2. Open `tools/gallery-maker.html` (double-click it), paste the Drive link and click **Create entry**.
3. Send the client the access code. Paste the line it gives you into `galleries.js` between the square brackets, and upload the file to GitHub.
4. The client enters the code under "Client galleries" on the site and is taken to their folder.

The Drive link inside `galleries.js` is scrambled and cannot be read without the code. This keeps your galleries out of sight and out of search engines. It is not bank-level security: anyone who is given the code, or the Drive link itself, can open the gallery, so use it for the same kind of sharing you do today.

## Before you publish

- Make sure you have permission from the people in the photographs, and from clients such as churches, to show their work publicly.
- The worship photographs carry the church's own logo. Keep that only if the client agrees.
