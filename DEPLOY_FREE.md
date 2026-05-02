# Free Deployment

This repo is now prepared for a fully free deployment path with:

- Frontend: Vercel
- Backend: Render Web Service
- Database: MongoDB Atlas Free

## Before You Deploy

1. Rotate any exposed secrets in `backend/src/.env`.
2. Push this repo to GitHub.
3. Create a free MongoDB Atlas cluster and copy its connection string.

## Render Blueprint

This repo includes `render.yaml`, so you can deploy only the backend from Render with a Blueprint.

What it does:

- deploys `backend/` as a free Node web service
- leaves the frontend on Vercel
- disables SMTP so signup uses the built-in dev OTP instead of paid email

## Render Backend Setup

After creating the Blueprint, set these backend values in Render:

- `CLIENT_URL`
- `CLIENT_URLS`
- `MONGODB_URI`
- `BREVO_API_KEY` if you want real OTP emails on free Render

Set `CLIENT_URL` and `CLIENT_URLS` to your Vercel frontend URL so the backend allows requests from your deployed frontend.

Recommended Atlas format:

```env
mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/pulsechat?retryWrites=true&w=majority&appName=Cluster0
```

Example Render backend values:

```env
CLIENT_URL=https://your-vercel-app.vercel.app
CLIENT_URLS=https://your-vercel-app.vercel.app,https://your-custom-domain.com,https://your-vercel-preview-*.vercel.app
BREVO_API_KEY=xkeysib-your-brevo-api-key
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
OTP_FROM_NAME=PulseChat
OTP_FROM_EMAIL=your-verified-sender@gmail.com
SMTP_ENABLED=false
EXPOSE_DEV_OTP=true
MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/pulsechat?retryWrites=true&w=majority&appName=Cluster0
```

## Vercel Frontend Setup

In Vercel, set the frontend environment variables before deploying:

```env
VITE_BACKEND_RUNTIME=node
VITE_API_URL=https://your-render-service.onrender.com
```

This makes the deployed frontend call the Render backend instead of `localhost`.

## Real OTP Email On Free Render

Free Render web services block SMTP ports, so Gmail SMTP will not work there.
Use Brevo's HTTPS API instead:

1. Create a free Brevo account
2. Verify a sender email or domain in Brevo
3. Create a Brevo API key
4. Set `BREVO_API_KEY`, `OTP_FROM_NAME`, and `OTP_FROM_EMAIL` in Render
5. Keep `SMTP_ENABLED=false`

## Important Free-Tier Notes

- Render free web services spin down after inactivity.
- Uploaded files are stored on an ephemeral filesystem, so they can disappear after restart or redeploy.
- OTP email is intentionally disabled on free Render deploys because Render blocks standard SMTP ports.
- Signup still works because the frontend shows the dev OTP returned by the backend.

## Manual Fallback

If Blueprint variable linking fails in your workspace, set these values manually:

Backend:

- `CLIENT_URL=https://your-vercel-app.vercel.app`
- `CLIENT_URLS=https://your-vercel-app.vercel.app,https://your-custom-domain.com,https://your-vercel-preview-*.vercel.app`
- `BREVO_API_KEY=xkeysib-your-brevo-api-key`
- `BREVO_API_URL=https://api.brevo.com/v3/smtp/email`
- `OTP_FROM_NAME=PulseChat`
- `OTP_FROM_EMAIL=your-verified-sender@gmail.com`
- `SMTP_ENABLED=false`
- `EXPOSE_DEV_OTP=true`
- `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1`
- `MONGODB_URI=...`

Frontend:

- `VITE_BACKEND_RUNTIME=node`
- `VITE_API_URL=https://your-render-service.onrender.com`
