# Splash Screen Navigation Fix

## Problem
App was stuck on splash screen even though logs showed "Session active, navigating from splash..." followed by "Already navigated, skipping..."

## Root Cause
The `hasNavigated.current = true` flag was being set BEFORE `checkSessionAndNavigate()` completed, causing the actual navigation to be skipped.

**Bad Flow**:
```
1. Auth listener fires: INITIAL_SESSION
2. Set hasNavigated.current = true  ← TOO EARLY!
3. Call checkSessionAndNavigate()
4. Inside checkSessionAndNavigate: Check hasNavigated.current
5. It's already true → Skip navigation ❌
```

## Fix
Move `hasNavigated.current = true` to the END of `checkSessionAndNavigate()`, right before the actual navigation dispatch.

**Good Flow**:
```
1. Auth listener fires: INITIAL_SESSION
2. Call checkSessionAndNavigate()
3. Inside checkSessionAndNavigate: Check hasNavigated.current (false)
4. Determine which screen to navigate to
5. Set hasNavigated.current = true  ← RIGHT PLACE!
6. Dispatch navigation ✅
```

## Code Changes

### Before (Broken):
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION') {
    if (session?.user && !hasNavigated.current) {
      hasNavigated.current = true;  // ❌ TOO EARLY
      await checkSessionAndNavigate();
    }
  }
});
```

### After (Fixed):
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION') {
    if (session?.user && !hasNavigated.current) {
      // ✅ Don't set flag here - let checkSessionAndNavigate do it
      await checkSessionAndNavigate();
    }
  }
});

const checkSessionAndNavigate = async () => {
  if (hasNavigated.current) return;
  
  // ... determine screen ...
  
  hasNavigated.current = true;  // ✅ Set here, right before navigation
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: screen }],
    })
  );
};
```

## Testing
After fix, logs should show:
```
✅ Session active, navigating from splash...
[No "Already navigated, skipping..." message]
[App navigates to Home/Login screen]
```

## Files Changed
- `src/screens/SplashScreen.tsx` - Removed premature `hasNavigated.current = true` from auth listener
