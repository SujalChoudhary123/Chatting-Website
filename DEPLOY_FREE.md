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

## Required Secret

After creating the Blueprint, set these backend values in Render:

- `CLIENT_URL`
- `CLIENT_URLS`
- `MONGODB_URI`

Set `CLIENT_URL` and `CLIENT_URLS` to your Vercel frontend URL.

Recommended Atlas format:

```env
mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/pulsechat?retryWrites=true&w=majority&appName=Cluster0
```

## Important Free-Tier Notes

- Render free web services spin down after inactivity.
- Uploaded files are stored on an ephemeral filesystem, so they can disappear after restart or redeploy.
- OTP email is intentionally disabled on free Render deploys because Render blocks standard SMTP ports.
- Signup still works because the frontend shows the dev OTP returned by the backend.

## Manual Fallback

If Blueprint variable linking fails in your workspace, set these values manually:

Backend:

- `CLIENT_URL=https://your-frontend-name.onrender.com`
- `CLIENT_URLS=https://your-vercel-app.vercel.app`
- `SMTP_ENABLED=false`
- `EXPOSE_DEV_OTP=true`
- `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1`
- `MONGODB_URI=...`
