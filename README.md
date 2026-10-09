# LSQ Brunch Bunch

A single static page (`index.html`). The "Suggest a place" feature is optional and stays hidden until you fill in the `CONFIG` block near the bottom of `index.html`.

## How the suggestions feature works

1. Anyone clicks **+ Suggest a place** and submits a name and their email. It is stored in Firestore as `pending`, and the admin gets an email.
2. The admin opens the page, clicks **Admin** (footer), and signs in with Google. Only the admin email can read suggestions.
3. **Decline** asks for a reason, emails it to the suggestor (via the mail server), then marks the suggestion declined.
4. **Approve** opens a popup for region (Uptown / Downtown / To try out), cuisine, description, website, address, phone, walk, hours and a click-on-the-map pin. The restaurant is saved to Firestore and shows up as a card, map pin and legend entry for every visitor.

## One-time setup (all free, no credit card)

### Firebase (Spark plan)
1. Create a project at <https://console.firebase.google.com>. Skip Analytics.
2. **Build > Firestore Database > Create database** (production mode).
3. **Build > Authentication > Get started > Google** (enable it).
4. **Authentication > Settings > Authorized domains**: add the domain the site is served from (for example `brunch-bunch.github.io`).
5. **Firestore > Rules**: paste `firestore.rules` from this repo (it already contains the admin email, so change it there if the admin changes) and publish.
6. **Project settings > Your apps > Web app**: copy `apiKey`, `authDomain`, `projectId`, `appId` into `CONFIG.firebase`. Set `CONFIG.adminEmail` to the same admin email. (These values are public by design; the rules protect the data.)

### Mail server (Google Apps Script, free)
Emails go out through a small Apps Script web app, so no mail key is ever in the page. It verifies that the request comes from the signed-in admin, and the recipient is read from the stored suggestion, never from the request.
1. Go to <https://script.google.com> (signed in as the admin Google account), create a new project, and paste in `server/mailer.gs`. Check `PROJECT_ID`, `WEB_API_KEY` and `ADMIN_EMAIL` at the top.
2. **Deploy > New deployment > Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize when asked (it needs Gmail send and external requests).
3. Copy the web app URL (ends in `/exec`) into `CONFIG.mailerUrl` in `index.html`.
4. After you change `mailer.gs`, use **Deploy > Manage deployments > Edit > New version** so the change goes live.

Emails are sent from the admin's Gmail (about 100 per day on a free account). Decline emails and approval emails use fixed wording; the admin's decline reason is added to the decline message.

## Security notes
- Visitors can only **create** suggestions (field-validated by the rules). They cannot read them.
- Only the signed-in admin account can read suggestions or write restaurants, enforced by Firestore rules, not by the page.
- The mail server only sends reply emails for a verified admin sign-in, and takes the recipient and restaurant name from the stored suggestion. The one public action (a "new suggestion" notice to the admin) contains no user text and is limited to one email per 10 minutes.
- Suggestor-supplied text is rendered with `textContent` only.
