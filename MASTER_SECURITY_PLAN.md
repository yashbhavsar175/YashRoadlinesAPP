# 🔐 Master Security Remediation Plan

## Overview
You have **11 security incidents** across multiple repositories. This document provides a systematic approach to fix all of them.

---

## 🚨 CRITICAL - Do These First (Today)

### 1. Firebase Service Account (THIS REPO - YashRoadlinesAPP)
**Status**: ✅ File deleted from working tree, ⏳ Still in git history

```bash
# Clean git history
pip install git-filter-repo
git filter-repo --path firebase-secret-formatter.js --invert-paths
git push origin --force --all

# Revoke credentials
# Go to: https://console.firebase.google.com/project/qualified-cacao-472120-h5/settings/serviceaccounts/adminsdk
# Delete service account: firebase-adminsdk-fbsvc@qualified-cacao-472120-h5.iam.gserviceaccount.com
```

### 2. MongoDB Credentials (Office24-06-255 repo)
**Files**: 
- `vite-project/backend/.env`
- `vite-project/backend/index.js`

```bash
cd /path/to/Office24-06-255

# 1. Change MongoDB password immediately
# Go to MongoDB Atlas → Database Access → Edit User → Change Password

# 2. Remove from git history
git filter-repo --path vite-project/backend/.env --invert-paths
git filter-repo --path vite-project/backend/index.js --invert-paths

# 3. Update .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore

# 4. Create .env.example
cat > vite-project/backend/.env.example << 'EOF'
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=3000
EOF

# 5. Commit and force push
git add .gitignore vite-project/backend/.env.example
git commit -m "security: Remove exposed MongoDB credentials"
git push origin --force --all
```

---

## ⚠️ HIGH PRIORITY - Do These This Week

### 3. Google OAuth2 Keys (Office26-06-25 repo)
**File**: `Oauth-By-Chatgpt-for-a-look/backend/.env`

```bash
cd /path/to/Office26-06-25

# 1. Revoke OAuth credentials
# Go to: https://console.cloud.google.com/apis/credentials
# Delete the exposed OAuth 2.0 Client ID
# Create new credentials

# 2. Clean git history
git filter-repo --path Oauth-By-Chatgpt-for-a-look/backend/.env --invert-paths

# 3. Update .gitignore and force push
echo ".env" >> .gitignore
git add .gitignore
git commit -m "security: Remove exposed OAuth credentials"
git push origin --force --all
```

### 4. Generic Passwords (YashRoadlinesAPP - scripts/setup-env.bat)
**Note**: This file wasn't found in current checkout. It may be in git history only.

```bash
# Search for it in history
git log --all --full-history -- "**/setup-env.bat"

# If found, remove it
git filter-repo --path scripts/setup-env.bat --invert-paths
git push origin --force --all
```

### 5. Generic Passwords (Yash-Roadline-app repo)
**File**: `android/gradle.properties`

```bash
cd /path/to/Yash-Roadline-app

# 1. Review the file for exposed passwords
# 2. Move sensitive values to local.properties (gitignored by default)
# 3. Clean git history if needed
git filter-repo --path android/gradle.properties --invert-paths
git push origin --force --all
```

### 6. JWT Tokens (Yash-Roadline-app repo)
**Files**: `src/supabase.ts` + 2 others

```bash
cd /path/to/Yash-Roadline-app

# Note: Supabase anon keys are generally safe for client-side
# But if you want to rotate them:
# 1. Go to Supabase Dashboard → Settings → API
# 2. Generate new anon key
# 3. Update your code
```

---

## 📋 MEDIUM PRIORITY - Do These This Month

### 7-11. Other Generic Secrets
**Repositories**:
- Office (OfficeLinkedinAuth)
- Office (Office16-06-25)
- Office (.vscode/settings.json)

For each repository:

```bash
cd /path/to/repository

# 1. Identify the exposed secret
git log --all --full-history -p | grep -i "password\|secret\|key"

# 2. Revoke/rotate the credential

# 3. Remove from git history
git filter-repo --path path/to/file --invert-paths

# 4. Update .gitignore
cat >> .gitignore << 'EOF'
.env
.env.*
!.env.example
*-credentials.json
*.key
*.pem
EOF

# 5. Force push
git push origin --force --all
```

---

## 🛡️ Prevention Strategy

### 1. Install git-secrets on Your Machine
```bash
# macOS
brew install git-secrets

# Windows (using Git Bash)
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
./install.sh

# Configure globally
git secrets --register-aws --global
git secrets --add --global 'password'
git secrets --add --global 'api_key'
git secrets --add --global 'private_key'
git secrets --add --global 'mongodb://'
```

### 2. Add Pre-commit Hook to All Repos
Create `.git/hooks/pre-commit` in each repository:

```bash
#!/bin/bash
# Prevent commits with secrets

if git diff --cached | grep -iE '(password|api_key|secret|private_key|mongodb://|postgres://).*=.*["\047][^"\047]{20,}'; then
    echo "❌ ERROR: Potential secret detected in commit!"
    echo "Please remove secrets and use environment variables instead."
    exit 1
fi
```

### 3. Use This .gitignore Template for All Projects
```gitignore
# Secrets and credentials
.env
.env.*
!.env.example
!.env.template
*.key
*.pem
*-credentials.json
firebase-credentials.json
service-account*.json

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db
```

### 4. Enable GitHub Secret Scanning
For each repository:
1. Go to: Settings → Security → Code security and analysis
2. Enable: "Secret scanning"
3. Enable: "Push protection"

---

## 📊 Progress Tracker

| Repository | Issue | Status | Priority |
|------------|-------|--------|----------|
| YashRoadlinesAPP | Firebase Private Key | 🟡 In Progress | CRITICAL |
| YashRoadlinesAPP | setup-env.bat | ⏳ Pending | HIGH |
| Office24-06-255 | MongoDB Credentials | ⏳ Pending | CRITICAL |
| Office26-06-25 | OAuth2 Keys | ⏳ Pending | HIGH |
| Office26-06-25 | Generic Secrets | ⏳ Pending | HIGH |
| Yash-Roadline-app | gradle.properties | ⏳ Pending | MEDIUM |
| Yash-Roadline-app | JWT Tokens | ⏳ Pending | LOW |
| OfficeLinkedinAuth | Generic Secret | ⏳ Pending | MEDIUM |
| Office16-06-25 | Generic Passwords | ⏳ Pending | MEDIUM |
| Office | .vscode/settings.json | ⏳ Pending | LOW |

---

## 🎯 Quick Win Checklist

- [ ] Revoke Firebase service account (5 min)
- [ ] Clean YashRoadlinesAPP git history (10 min)
- [ ] Change MongoDB password (5 min)
- [ ] Clean Office24-06-255 git history (10 min)
- [ ] Revoke Google OAuth credentials (5 min)
- [ ] Clean Office26-06-25 git history (10 min)
- [ ] Install git-secrets globally (10 min)
- [ ] Add .gitignore templates to all repos (30 min)
- [ ] Enable GitHub secret scanning (15 min)
- [ ] Set up pre-commit hooks (30 min)

**Total Time**: ~2-3 hours to secure everything

---

## 📞 Need Help?

If you're unsure about any step:
1. Start with the CRITICAL items
2. Test the git-filter-repo command on a backup first
3. Coordinate with team members before force pushing
4. Keep a backup of repositories before cleaning history

---

**Created**: February 27, 2026
**Last Updated**: February 27, 2026
