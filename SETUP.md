24KEEN WEB APP SETUP

STEP 1: Supabase
1. Run supabase-update.sql in your Supabase SQL Editor to add the new tables
2. Your existing tables from the mobile app still work

STEP 2: Deploy to Vercel
1. Push this folder to a GitHub repo
2. Go to vercel.com, import the repo
3. Add these environment variables in Vercel project settings:
   SUPABASE_URL=https://yourproject.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
4. Deploy. Vercel gives you a free URL like 24keen.vercel.app

STEP 3: Install as PWA on your phone
1. Open the Vercel URL in Chrome on your phone
2. Tap the three dots menu in Chrome
3. Tap Add to Home Screen
4. It installs like a real app, opens fullscreen, no browser bar

HOW TO USE THE BROWSER TAB
1. Go to Browser tab
2. Enter the target URL and tap GO
3. Browse the site normally and log in
4. Switch to the Captured tab to see all requests
5. Tap any request and click Send to Scanner
6. Go to Scan tab and click Import from Clipboard
7. Tap Fire All Checks

UPDATES
Any code change you push to GitHub deploys automatically to Vercel. No rebuilds. No downloads. Just push and refresh the page on your phone.
