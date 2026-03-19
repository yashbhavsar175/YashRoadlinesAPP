# Security Checklist

## ✅ Done
- [ ] Revoke old Google API key in Google Cloud Console
- [ ] Generate new restricted API key
- [ ] Update .env with new key
- [ ] Verify .gitignore has all sensitive files listed
- [ ] Run git history cleanup commands
- [ ] Force push cleaned history
- [ ] Dismiss GitHub secret scanning alert

## 🔐 Rules Going Forward
- NEVER commit .env file
- NEVER hardcode API keys in source code
- Always use Config.KEY_NAME from react-native-config
- Before every git push, run: git diff --cached | grep -i "key\|secret\|password"
