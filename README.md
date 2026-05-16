# Pay Tracker PWA

This is an installable Progressive Web App version of the original HTML pay tracker.

## Files

- `index.html` - app layout and login/register screen
- `styles.css` - styling
- `app.js` - login, register, local storage, shift tracking, pay calculation
- `manifest.json` - PWA install metadata
- `service-worker.js` - offline caching
- `icons/` - PWA icons

## Run locally in VS Code

1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.
4. In Chrome or Edge, use the install icon/menu to install the PWA.

Important: service workers do not work from a plain `file://` path. Use Live Server, GitHub Pages, Netlify, Vercel, or another local web server.

## Login/Register

- Register creates a local account in `localStorage`.
- Login checks the saved username and password.
- This is for personal/local use only. For real secure accounts, you need a backend such as Firebase, Supabase, or your own server.
