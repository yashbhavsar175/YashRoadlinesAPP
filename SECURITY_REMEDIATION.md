# Security Remediation Steps

## ⚠️ CRITICAL: Firebase Credentials Exposed

Your Firebase service account credentials were exposed in git history. Follow these steps immediately:

## 1. Revoke Compromised Credentials (DO THIS FIRST!)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `qualified-cacao-472120-h5`
3. Navigate to: Project Settings > Service Accounts
4. Find the service account: `firebase-adminsdk-fbsvc@qualified-cacao-472120-h5.iam.gserviceaccount.com`
5. Delete or disable this service account
6. Generate a new service account with fresh credentials

## 2. Remove Secret from Git History

The exposed file `firebase-secret-formatter.js` has been deleted, but it still exists in git history.

### Option A: Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove the file from all history
git filter-repo --path firebase-secret-formatter.js --invert-paths

# Force push to remote (WARNING: This rewrites history!)
git push origin --force --all
```

### Option B: Using BFG Repo-Cleaner

```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
# Then run:
bfg --delete-files firebase-secret-formatter.js

# Clean up and force push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

### Option C: Manual with git filter-branch (Slower)

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch firebase-secret-formatter.js" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

## 3. Store Credentials Securely

### For Local Development:
1. Download new Firebase credentials from Firebase Console
2. Save as `firebase-credentials.json` in your project root
3. This file is now in `.gitignore` and won't be committed

### For Production/CI:
Use environment variables or secret management services:
- GitHub Secrets (for GitHub Actions)
- Environment variables in your hosting platform
- Secret managers (AWS Secrets Manager, Google Secret Manager, etc.)

## 4. Update Your Code

Use the new `firebase-secret-formatter.example.js` which reads from a local file:

```bash
# Create your credentials file (not committed)
# Download from Firebase Console and save as firebase-credentials.json

# Run the formatter
node firebase-secret-formatter.example.js
```

## 5. Verify Security

- [ ] Old service account deleted/disabled in Firebase
- [ ] New credentials generated
- [ ] File removed from git history
- [ ] Force pushed to remote
- [ ] Team members have pulled latest changes
- [ ] CI/CD updated with new credentials
- [ ] `.gitignore` updated to prevent future leaks

## Prevention

The following patterns are now in `.gitignore`:
- `.env` and `.env.*` files
- `firebase-credentials.json`
- `firebase-secret*.js`
- `service-account*.json`
- `*-credentials.json`

Always use environment variables or local config files for secrets!
