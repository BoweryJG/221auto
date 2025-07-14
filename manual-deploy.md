# Manual Netlify Deployment Steps

Since the Netlify CLI requires interactive input, please follow these steps:

1. Run this command:
```bash
cd ~/221auto && netlify init
```

2. When prompted:
   - Select: **Create & configure a new project**
   - Select team: **RepSpheres**
   - Site name: **homeflow-221auto** (or leave blank for auto-generated)

3. Once linked, deploy with:
```bash
netlify deploy --dir=web --prod
```

## Alternative: Deploy via Netlify UI

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select **BoweryJG/221auto**
4. Set build settings:
   - Base directory: (leave blank)
   - Build command: (leave blank)
   - Publish directory: **web**
5. Click "Deploy site"

## Your site files are ready!

The web frontend is in the `/web` directory with:
- Landing page showcasing HomeFlow features
- Connection status indicator
- Responsive design with gradient background
- Netlify configuration ready