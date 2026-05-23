# Empire of Clouds — Firebase Hosting

This is a static multi-page website, so it's a great fit for Firebase Hosting.

## 1) One-time setup

1. Use Node.js 20+. On this Mac, nvm is configured to use Node 20 by default.
2. Install the Firebase CLI:

   ```bash
   npm install -g firebase-tools
   ```

3. Log in:

   ```bash
   firebase login
   ```

4. Create a Firebase project in the Firebase Console (if you have not already).

5. Update `.firebaserc` and replace:

   - `your-firebase-project-id` with your real Firebase project ID.

## 2) Deploy your website

From this project folder, run:

```bash
firebase deploy --only hosting
```

After deploy, Firebase will print your live URL.

## 3) Preview locally (optional)

```bash
firebase emulators:start --only hosting
```

Then open `http://127.0.0.1:5000`.

## Notes

- `firebase.json` is already configured to host the repository root (`.`).
- HTML files are set to revalidate on every request.
- JS/CSS/images/audio/3D assets are long-cached for performance.
