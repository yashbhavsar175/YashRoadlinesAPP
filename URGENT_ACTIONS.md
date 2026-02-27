# 🚨 URGENT ACTIONS REQUIRED NOW

## Step 1: Revoke Compromised Credentials (5 minutes)

1. Open: https://console.firebase.google.com/project/qualified-cacao-472120-h5/settings/serviceaccounts/adminsdk
2. Find service account: `firebase-adminsdk-fbsvc@qualified-cacao-472120-h5.iam.gserviceaccount.com`
3. Click the three dots menu → Delete
4. Generate new service account → Download JSON file
5. Save as `firebase-credentials.json` in your project root (it's now gitignored)

## Step 2: Clean Git History (10 minutes)

Choose ONE method:

### Method A: git-filter-repo (Fastest)
```bash
pip install git-filter-repo
git filter-repo --path firebase-secret-formatter.js --invert-paths
git push origin --force --all
```

### Method B: BFG Repo-Cleaner (Easiest)
```bash
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files firebase-secret-formatter.js
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

## Step 3: Update Your Workflow

```bash
# Download new credentials from Firebase Console
# Save as firebase-credentials.json (already in .gitignore)

# Use the new secure formatter
node firebase-secret-formatter.example.js
```

## Step 4: Notify Your Team

If this is a team project:
- Alert team members about the security incident
- Have them pull the latest changes after force push
- Update any CI/CD pipelines with new credentials

## What We've Done

✅ Deleted exposed credentials file
✅ Updated .gitignore to prevent future leaks
✅ Created secure template files
✅ Committed changes to current branch

## What You Must Do

⚠️ Revoke old Firebase service account
⚠️ Remove file from git history
⚠️ Force push to remote
⚠️ Update production credentials

---

**Time Sensitive:** The exposed credentials are still valid and in your git history until you complete these steps!
