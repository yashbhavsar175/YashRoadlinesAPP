# Simple approach: Just add useTheme import and hook, don't modify styles

$screens = @(
    "LoginScreen.tsx",
    "SplashScreen.tsx",
    "BiometricAuthScreen.tsx"
)

foreach ($screen in $screens) {
    $path = "src/screens/$screen"
    
    if (Test-Path $path) {
        Write-Host "Processing $screen..."
        
        $content = Get-Content $path -Raw
        
        # Add useTheme import if not present
        if ($content -notmatch "import.*useTheme.*from.*ThemeContext") {
            $content = $content -replace "(import React[^;]+;)", "`$1`nimport { useTheme } from '../theme/ThemeContext';"
        }
        
        # Add hook call at start of component if not present
        if ($content -notmatch "const.*useTheme\(\)") {
            # Find function component and add hook
            $content = $content -replace "(function\s+\w+[^{]+\{)", "`$1`n  const { colors, isDark } = useTheme();"
        }
        
        Set-Content $path $content
        Write-Host "  Updated $screen"
    }
}

Write-Host ""
Write-Host "Done - screens now have useTheme available but styles unchanged"
