# Infrastructure

This directory contains the AWS infrastructure-as-code for the static site,
plus helper scripts that mirror what a real CI/CD pipeline would do.

## Architecture

```
            ┌──────────────────┐
            │     Browser      │
            └────────┬─────────┘
                     │ HTTPS
                     ▼
            ┌──────────────────┐
            │   CloudFront     │  global edge cache, HTTPS, HTTP/2 + HTTP/3
            └────────┬─────────┘
                     │ SigV4 (via OAC)
                     ▼
            ┌──────────────────┐
            │   S3 Bucket      │  private, versioned, encrypted
            └──────────────────┘
```

Key design decisions:

- **The bucket is private.** All public access is blocked. Only the
  specific CloudFront distribution can read objects, enforced by a bucket
  policy condition on `AWS:SourceArn`.
- **Origin Access Control (OAC), not OAI.** OAC is the current best-practice
  mechanism. It signs requests from CloudFront to S3 with SigV4 and supports
  SSE-KMS if you later add it.
- **Versioning + lifecycle.** Versioning is on so a botched deploy is
  recoverable. Old versions auto-expire after 30 days to keep storage cost
  bounded.
- **SPA-friendly error responses.** 403 and 404 are rewritten to
  `/index.html` with status 200, which is the pattern most single-page
  apps need. The current site doesn't use client-side routing yet, but
  this is one of the most common follow-up questions students ask, so it
  is set up by default.

## Deploy

```pwsh
./deploy.ps1
# Optional overrides:
./deploy.ps1 -StackName my-classroom-demo -Region us-west-2 -ProjectName my-demo
```

The script runs `aws cloudformation deploy`, reads the stack outputs, syncs
files to S3, and creates a CloudFront invalidation.

### Cache headers

The sync uses `Cache-Control: public, max-age=31536000, immutable` for all
files. After the sync completes, `index.html` is re-uploaded with
`max-age=60, must-revalidate` so it is the only short-cached entry. This is
the classic pattern: long-cache the assets, short-cache the entry point.

## Teardown

```pwsh
./teardown.ps1
```

The bucket has `DeletionPolicy: Retain` so CloudFormation won't delete it
on a stack delete. The teardown script empties the bucket (including all
prior object versions and delete markers) and then deletes both the bucket
and the stack.

## What to extend in class

Good follow-ups for a hands-on lab:

1. Add a custom domain via Route 53 + ACM, and wire CNAMEs into the
   distribution.
2. Add a CloudFront response headers policy for HSTS,
   `Content-Security-Policy`, and `Referrer-Policy`.
3. Replace the deploy script with a GitHub Actions workflow.
4. Add CloudFront access logging into a separate bucket and inspect with
   Athena.
