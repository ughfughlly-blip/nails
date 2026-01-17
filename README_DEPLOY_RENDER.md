# Deploying the Nails app to Render (recommended)

This repository contains a simple booking web app and a Telegram Bot Web App frontend.

High-level steps to deploy on Render:

1. Create an account on https://render.com and connect your GitHub account.
2. Create a new Web Service and select the `ughfughlly-blip/nails` repository.
   - Branch: main
   - Build Command: `npm ci`
   - Start Command: `npm start`
3. In the Environment settings for the service, add the following environment variables:
   - `TELEGRAM_BOT_TOKEN` — your bot token from BotFather
   - (Optionally) `WEB_APP_URL` — the public HTTPS URL Render provides after deployment (you can set this later)
4. Deploy the service. Render will provide a public HTTPS URL like `https://your-app.onrender.com`.
5. After the web service is live, create a second Render background service for the bot (name it `nails-bot`):
   - Environment: Background Worker
   - Branch: main
   - Build Command: `npm ci`
   - Start Command: `npm run bot`
   - Environment variables: set `TELEGRAM_BOT_TOKEN` and set `WEB_APP_URL` to the HTTPS URL of the web service from step 4.
6. Test in Telegram:
   - Open a chat with your bot and send /start. The bot will send a button that opens the Web App inside Telegram. The Web App uses `window.Telegram.WebApp`.

Security notes:
- Do NOT paste the bot token in public places or chat. Use Render's environment variables UI to store it.
- Revoke any tokens that have been exposed.

If you want, I can prepare GitHub Actions or a Render blueprint — tell me and I will add it.