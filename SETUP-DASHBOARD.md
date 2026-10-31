# Setting up your private dashboard

The dashboard is a page only you can open (`your-site-address/admin.html`). You log in with an email and password. Visitors to your portfolio never see it, and the database itself refuses to show your private information to anyone who is not logged in as you.

From the dashboard you can:

- **Client galleries**: paste a Google Drive link, get a private code, copy a ready-to-send message.
- **Photos**: upload pictures, put them in sections, change their order, choose the big photo at the top.
- **Site details**: change your bio, WhatsApp number, email, Instagram, logo and services.
- **Enquiries**: read booking messages sent from your site's form, reply on WhatsApp or email.

You set this up **once**. Afterwards you never touch code again. It takes about 20 minutes, and the service it uses is free to start.

> **Please read:** I could test everything in the website and dashboard, and the database script, on my side. I could not test against your real Supabase account, because I do not have one. The screens in Supabase also get renamed now and then, so a button may be worded a little differently from what I describe. If anything does not match, send me a screenshot and I will fix the steps.

---

## Step 1. Make a free Supabase account and project

Supabase is the service that stores your photos, gallery codes and enquiries.

1. Go to **supabase.com** and sign up (you can use your GitHub account).
2. Click **New project**. Give it a name such as `joshua-odukaiye-studios`.
3. Choose a **database password** and save it somewhere safe. You will almost never need it.
4. Choose the region closest to your clients (a European region is usually the closest to Lagos).
5. Click **Create new project** and wait about two minutes.

## Step 2. Create the storage and the privacy rules

1. In your project, open **SQL Editor** in the left menu and click **New query**.
2. Open the file `supabase/schema.sql` from this folder in Notepad (or any text editor), select everything, copy it.
3. Paste it into the SQL Editor and click **Run**.
4. You should see **Success. No rows returned**. If you see a red error instead, send me a screenshot.

You can run it again at any time. It will not delete anything.

## Step 3. Create your login, and close the door to strangers

1. Open **Authentication** in the left menu, then **Users**.
2. Click **Add user**, then **Create new user**. Type your email and a strong password. Tick **Auto Confirm User** if you see that option. Click **Create user**.
3. Now stop anyone else from making an account. In **Authentication**, open **Sign In / Providers** (it may also be called **Providers** or **Settings**) and turn **off** "Allow new users to sign up".

Step 3.3 matters. If strangers can create accounts they could store their own files in your photo storage.

4. Open **Authentication, URL Configuration**. Set **Site URL** to your website address (for example `https://YOUR-USERNAME.github.io/joshua-odukaiye-studios/`). Under **Redirect URLs** add the same address followed by `admin.html`. This makes the "Forgot your password?" link work.

## Step 4. Copy two details into `config.js`

1. In Supabase open **Project Settings**, then **API Keys**. (The **Connect** button at the top of the project also shows them.)
2. Copy the **Project URL**. It looks like `https://abcdxyz.supabase.co`.
3. Copy the **Publishable key**, which starts with `sb_publishable_`. If your project only shows the older **anon** key (a very long text starting `eyJ`), that works too. Both are safe to put in a public website. **Never use the "secret" or "service_role" key anywhere on the site.**
4. Open `config.js`. At the bottom, fill in the three lines:

```js
supabase: {
  url: "https://abcdxyz.supabase.co",
  anonKey: "sb_publishable_xxxxxxxxxxxx",
  studio: "joshua-odukaiye"
}
```

`studio` is your studio's short web name. Use only lower-case letters, numbers and dashes. You choose it now; the dashboard will ask for the same name the first time you log in.

## Step 5. Put the files online

Upload this whole folder to your GitHub repository again, replacing the old files (same way as before: **Add file, Upload files**, then **Commit changes**). Include `admin.html`, `admin.css`, `admin.js`, `config.js` and the `lib` and `supabase` folders. Wait a minute for GitHub Pages to update.

## Step 6. Log in for the first time

1. Open `YOUR-SITE-ADDRESS/admin.html` and log in with the email and password from Step 3.
2. The first time, it asks you to **Set up your studio**. Your name, number and email from `config.js` are already filled in. Click **Create my studio**.
3. Open the **Photos** tab and click **Bring in the photos already on my site**. Your 20 current photographs appear and become editable.
4. Open **Client galleries**, paste a Google Drive folder link, give the client's name, and click **Create gallery and code**. Click **Copy message to send** and paste it into WhatsApp.

From now on, everything you change in the dashboard shows on your site at once.

---

## Good to know

**The free plan pauses quiet projects.** Supabase says free projects are paused after one week of inactivity, and gives 1 GB of file storage. Visiting your dashboard once a week keeps it awake. If it ever pauses, your site keeps working from the photos in its own folder, but photos you uploaded through the dashboard, client codes and enquiries are unavailable until you press **Restore project** in Supabase. If you want it always on, their paid plan removes the pause. (Check their pricing page for current numbers.)

**What visitors can and cannot do.** A visitor can see your public photos and details, send an enquiry, and try a client code. They cannot read your gallery codes, your Drive links or your enquiries. Wrong codes are counted, and after 60 wrong guesses in 10 minutes the code box is locked for a short while, which also means a determined person could briefly lock your real clients out. That is the trade for keeping codes safe from guessing.

**Photos you upload.** The dashboard shrinks each picture to two web sizes and removes hidden camera and location data. RAW files are not accepted, and the originals never leave your computer. Keep exporting JPEGs from Lightroom.

**Gallery links are as private as the Drive folder.** The code only controls who is shown the Drive link. Anyone who is given the link itself can open it. This is the same level of privacy as sending the link by WhatsApp today.

**If you forget your password.** Use **Forgot your password?** on the login page, or reset it in Supabase under Authentication, Users.

**If you ever want to go back.** Leave the three lines in `config.js` empty and the site works from its own files again, exactly as before.
