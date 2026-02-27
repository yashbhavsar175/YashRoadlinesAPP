@echo off
REM FCM Edge Function Deployment Script for Windows
REM This script deploys the updated edge function with FCM V1 API support

echo 🚀 Deploying FCM Edge Function...
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Supabase CLI not found. Installing via npx...
    npx supabase functions deploy quick-processor
) else (
    echo ✅ Supabase CLI found
    supabase functions deploy quick-processor
)

echo.
echo ✅ Deployment complete!
echo.
echo 📋 Next steps:
echo 1. Verify secret 'FIREBASE_SERVICE_ACCOUNT_JSON' exists in Supabase Dashboard
echo 2. Test by closing admin app completely and adding entry from user app
echo 3. Check logs in Supabase Dashboard → Edge Functions → quick-processor → Logs
echo.
echo 📖 See FCM_DEPLOYMENT_INSTRUCTIONS.md for detailed troubleshooting
pause
