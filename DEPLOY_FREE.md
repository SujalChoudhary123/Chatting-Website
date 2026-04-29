# Free Deployment

This repo is now prepared for a fully free deployment path:

- Frontend: Render Static Site
- Backend: Render Web Service
- Database: MongoDB Atlas Free

## Before You Deploy

1. Rotate any exposed secrets in `backend/src/.env`.
2. Push this repo to GitHub.
3. Create a free MongoDB Atlas cluster and copy its connection string.

## Render Blueprint

This repo includes `render.yaml`, so you can deploy both services from Render with a Blueprint.

What it does:

- deploys `backend/` as a free Node web service
- deploys `frontend/` as a free static site
- connects the frontend `VITE_API_URL` to the backend Render URL
- connects backend `CLIENT_URL` to the frontend Render URL
- disables SMTP so signup uses the built-in dev OTP instead of paid email

## Required Secret

After creating the Blueprint, set this backend secret in Render:

- `MONGODB_URI`

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
- `CLIENT_URLS=https://your-frontend-name.onrender.com`
- `SMTP_ENABLED=false`
- `EXPOSE_DEV_OTP=true`
- `MONGODB_URI=...`

Frontend:

- `VITE_BACKEND_RUNTIME=node`
- `VITE_API_URL=https://your-backend-name.onrender.com`
