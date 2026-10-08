# LSQ Brunch Bunch

A single static page (`index.html`). The "Suggest a place" feature is optional and stays hidden until you fill in the `CONFIG` block near the bottom of `index.html`.

## How the suggestions feature works

1. Anyone clicks **+ Suggest a place** and submits a name and their email. It is stored in Firestore as `pending`, and the admin gets an email.
2. The admin opens the page, clicks **Admin** (footer), and signs in with Google. Only the admin email can read suggestions.
3. **Decline** asks for a reason, emails it to the suggestor (EmailJS), then marks the suggestion declined.
4. **Approve** opens a popup for region (Uptown / Downtown / To try out), cuisine, description, website, address, phone, walk, hours and a click-on-the-map pin. The restaurant is saved to Firestore and shows up as a card, map pin and legend entry for every visitor.

## One-time setup (all free, no credit card)

### Firebase (Spark plan)
1. Create a project at <https://console.firebase.google.com>. Skip Analytics.
2. **Build > Firestore Database > Create database** (production mode).
3. **Build > Authentication > Get started > Google** (enable it).
4. **Authentication > Settings > Authorized domains**: add the domain the site is served from (for example `brunch-bunch.github.io`).
5. **Firestore > Rules**: paste `firestore.rules` from this repo, replace `ADMIN_EMAIL_HERE` with the admin's Google email (lowercase), and publish.
6. **Project settings > Your apps > Web app**: copy `apiKey`, `authDomain`, `projectId`, `appId` into `CONFIG.firebase`. Set `CONFIG.adminEmail` to the same admin email. (These values are public by design; the rules protect the data.)

### EmailJS (free plan)
1. Create an account at <https://www.emailjs.com> and add an email service (for example Gmail).
2. Create three templates. In each, set **To email** to `{{to_email}}`:
   - **Admin notice** (`templateAdmin`): uses `{{restaurant}}`, `{{website}}`, `{{cuisine}}`, `{{notes}}`, `{{from_email}}`.
   - **Decline** (`templateDecline`): uses `{{restaurant}}` and `{{reason}}`.
   - **Approved** (`templateApproved`, optional): uses `{{restaurant}}`.
3. Copy the public key, service id and template ids into `CONFIG.emailjs`.
4. In EmailJS **Account > Security**, restrict the public key to your site's domain.

## Security notes
- Visitors can only **create** suggestions (field-validated by the rules). They cannot read them.
- Only the signed-in admin account can read suggestions or write restaurants, enforced by Firestore rules, not by the page.
- The EmailJS public key is visible in the page, as with any browser-only setup. Restricting it to your domain and the free plan's monthly cap limit abuse.
- Suggestor-supplied text is rendered with `textContent` only.
