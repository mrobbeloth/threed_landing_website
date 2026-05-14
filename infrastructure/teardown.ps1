# Tear down the stack. The bucket has DeletionPolicy: Retain on it, so we
# empty and delete it explicitly here. Run this when you're done with the demo
# to avoid lingering CloudFront / S3 charges.

[CmdletBinding()]
param(
    [string]$StackName = "solterra-threejs",
    [string]$Region    = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Looking up bucket name from stack..." -ForegroundColor Cyan
$bucketName = aws cloudformation describe-stacks `
    --stack-name $StackName --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" `
    --output text

if ($bucketName -and $bucketName -ne "None") {
    Write-Host "==> Emptying bucket $bucketName (including versions)..." -ForegroundColor Cyan
    # `aws s3 rb --force` does not handle versioned objects, so we use the
    # s3api commands to remove all versions and delete markers first.
    aws s3api list-object-versions --bucket $bucketName --region $Region `
        --query "{Objects: Versions[].{Key:Key,VersionId:VersionId}}" `
        --output json | Out-File -Encoding ascii versions.json
    if ((Get-Content versions.json -Raw) -match '"Objects":\s*\[\s*{') {
        aws s3api delete-objects --bucket $bucketName --region $Region --delete file://versions.json | Out-Null
    }
    aws s3api list-object-versions --bucket $bucketName --region $Region `
        --query "{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}" `
        --output json | Out-File -Encoding ascii markers.json
    if ((Get-Content markers.json -Raw) -match '"Objects":\s*\[\s*{') {
        aws s3api delete-objects --bucket $bucketName --region $Region --delete file://markers.json | Out-Null
    }
    Remove-Item versions.json, markers.json -ErrorAction SilentlyContinue

    Write-Host "==> Deleting bucket $bucketName..." -ForegroundColor Cyan
    aws s3api delete-bucket --bucket $bucketName --region $Region
}

Write-Host "==> Deleting stack $StackName..." -ForegroundColor Cyan
aws cloudformation delete-stack --stack-name $StackName --region $Region
aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region

Write-Host "Done." -ForegroundColor Green
