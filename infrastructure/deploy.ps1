# One-shot deploy script.
#
# Steps:
#   1. Deploy / update the CloudFormation stack.
#   2. Read the bucket name and distribution ID from stack outputs.
#   3. Sync the site files to S3 with sensible Cache-Control headers.
#   4. Invalidate the CloudFront cache so students see the latest version.
#
# Prereqs: AWS CLI v2, credentials configured (`aws configure`), and
# permission to create CloudFormation, S3, and CloudFront resources.

[CmdletBinding()]
param(
    [string]$StackName = "solterra-threejs",
    [string]$Region    = "us-east-1",
    [string]$ProjectName = "solterra-threejs"
)

$ErrorActionPreference = "Stop"

# Resolve paths relative to this script so it works no matter where it's run.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$template  = Join-Path $scriptDir "cloudformation.yaml"

Write-Host "==> Deploying CloudFormation stack '$StackName' in $Region..." -ForegroundColor Cyan
aws cloudformation deploy `
    --stack-name $StackName `
    --template-file $template `
    --region $Region `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides ProjectName=$ProjectName
if ($LASTEXITCODE -ne 0) { throw "Stack deploy failed." }

Write-Host "==> Reading stack outputs..." -ForegroundColor Cyan
$bucketName = aws cloudformation describe-stacks `
    --stack-name $StackName --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
    --output text
$distId = aws cloudformation describe-stacks `
    --stack-name $StackName --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" `
    --output text
$siteUrl = aws cloudformation describe-stacks `
    --stack-name $StackName --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" `
    --output text

Write-Host "    bucket = $bucketName"
Write-Host "    distId = $distId"

# Sync everything except the index with a long cache (the URLs are stable).
# index.html gets a short TTL so updates show up quickly.
Write-Host "==> Syncing site to s3://$bucketName ..." -ForegroundColor Cyan
aws s3 sync $repoRoot "s3://$bucketName/" `
    --region $Region `
    --delete `
    --exclude "infrastructure/*" `
    --exclude ".git/*" `
    --exclude ".gitignore" `
    --exclude "README.md" `
    --exclude "*.ps1" `
    --exclude ".DS_Store" `
    --cache-control "public, max-age=31536000, immutable"
if ($LASTEXITCODE -ne 0) { throw "S3 sync failed." }

# Re-upload index.html with a no-cache header so changes propagate fast.
$indexPath = Join-Path $repoRoot "index.html"
Write-Host "==> Re-uploading index.html with short cache..." -ForegroundColor Cyan
aws s3 cp $indexPath "s3://$bucketName/index.html" `
    --region $Region `
    --cache-control "public, max-age=60, must-revalidate" `
    --content-type "text/html; charset=utf-8"
if ($LASTEXITCODE -ne 0) { throw "Index upload failed." }

Write-Host "==> Creating CloudFront invalidation..." -ForegroundColor Cyan
aws cloudfront create-invalidation `
    --distribution-id $distId `
    --paths "/*" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Invalidation failed." }

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "Site: $siteUrl"
Write-Host "Note: CloudFront's first deploy can take 5-15 minutes to fully propagate."
