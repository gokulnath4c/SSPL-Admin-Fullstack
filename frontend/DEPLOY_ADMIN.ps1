# Build the React App
Set-Location "d:\ssplt10.cloud-prod-sync-20251006\httpdocs\admin\react-app"

Write-Host "Cleaning previous builds..."
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
if (Test-Path "node_modules/.vite") { Remove-Item "node_modules/.vite" -Recurse -Force }

Write-Host "Building React App..."
npm run build

# Clean deployment directory (httpdocs/admin) EXCEPT react-app
$deployDir = "d:\ssplt10.cloud-prod-sync-20251006\httpdocs\admin"
Get-ChildItem -Path $deployDir | Where-Object { $_.Name -ne "react-app" } | Remove-Item -Recurse -Force

# Copy new build artifacts
$source = "dist\*"
$destination = $deployDir

Write-Host "Deploying to $deployDir..."
Copy-Item -Path $source -Destination $destination -Recurse -Force

# Create .htaccess for SPA routing
$htaccessContent = @"
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /admin/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /admin/index.html [L]
</IfModule>
"@

$htaccessContent | Out-File -FilePath "$deployDir\.htaccess" -Encoding UTF8

Write-Host "Deployment Complete! Admin panel successfully replaced."
