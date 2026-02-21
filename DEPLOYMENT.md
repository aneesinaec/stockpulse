# Deployment Guide - StockPulse

This guide will help you deploy StockPulse for free using **Render** (backend) and **Vercel** (frontend).

## Prerequisites

1. GitHub account
2. Render account (free): https://render.com
3. Vercel account (free): https://vercel.com

---

## Step 1: Push Code to GitHub

```bash
cd /Users/aabdulkader/vibe

# Initialize git repository
git init
git add .
git commit -m "Initial commit: StockPulse app"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/stockpulse.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `stockpulse-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Select **Free** plan
6. Click **"Create Web Service"**

⏳ Wait for deployment (5-10 minutes for first deploy)

📝 **Note your Render URL**: `https://stockpulse-api.onrender.com`

### Important: Free Tier Limitations
- Free Render services "spin down" after 15 minutes of inactivity
- First request after spin-down takes ~30-60 seconds
- Consider upgrading to paid tier ($7/month) for always-on service

---

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://stockpulse-api.onrender.com` (your Render URL)
6. Click **"Deploy"**

✅ Your app will be live at: `https://your-project.vercel.app`

---

## Step 4: Verify Deployment

1. Open your Vercel URL in a browser
2. Wait for data to load (may take 30-60 seconds if Render service was sleeping)
3. Test clicking on stocks to see detailed analysis

---

## Troubleshooting

### "Failed to fetch stocks" error
- Backend might be spinning up (wait 30-60 seconds and refresh)
- Check Render logs for errors

### Data not loading
- Verify `VITE_API_URL` environment variable in Vercel
- Make sure it includes `https://` and no trailing slash

### CORS errors
- Backend already configured for CORS from any origin
- If issues persist, check browser console for specific errors

---

## Updating the App

After making changes:

```bash
git add .
git commit -m "Your update message"
git push
```

Both Render and Vercel will automatically redeploy!

---

## Alternative Free Hosting Options

### Backend Alternatives:
- **Railway.app** - Free tier with $5 credit/month
- **Fly.io** - Free tier available
- **PythonAnywhere** - Free tier for Python apps

### Frontend Alternatives:
- **Netlify** - Similar to Vercel, free tier
- **Cloudflare Pages** - Free, fast CDN
- **GitHub Pages** - Free but requires static export

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Render (Backend) | Free | $0/month |
| Vercel (Frontend) | Hobby | $0/month |
| **Total** | | **$0/month** |

Note: Free tiers have limitations. For production use, consider:
- Render Starter: $7/month (always-on)
- Vercel Pro: $20/month (more bandwidth)
