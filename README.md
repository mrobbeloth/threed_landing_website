# Subaru Solterra on Three.js + S3 + CloudFront

A teaching example for showing students how to host a static website backed
by Amazon S3 and Amazon CloudFront. The site renders a procedural 3D Subaru
Solterra using [Three.js](https://threejs.org/).

The model is built entirely from Three.js primitives (no external `.glb` or
`.gltf` files), so the deployable site is a handful of small text files.
That keeps the storage and bandwidth story easy to reason about for the
infrastructure side of the lesson.

## Local preview

There is no build step. Serve the directory with any static file server and
open it in a modern browser.

```pwsh
# from the repo root
python -m http.server 8000
# or
npx --yes http-server -p 8000 .
```

Then visit http://localhost:8000.

## Project layout

```
.
├── index.html              # Page shell, import map for three.js
├── styles.css              # HUD and layout styles
├── src/
│   ├── main.js             # Renderer, camera, controls, animation loop
│   ├── solterra.js         # Procedural Solterra model
│   └── environment.js      # Lights, ground, dome backdrop
└── infrastructure/
    ├── cloudformation.yaml # S3 (private) + CloudFront + OAC
    ├── deploy.ps1          # Deploy stack, sync files, invalidate cache
    └── teardown.ps1        # Empty bucket and delete stack
```

## Deploying to AWS

Make sure you have the AWS CLI v2 installed and configured (`aws configure`).
From PowerShell:

```pwsh
./infrastructure/deploy.ps1
```

The script does three things students should understand:

1. **Provisions infrastructure** with CloudFormation: a private S3 bucket plus
   a CloudFront distribution that pulls from the bucket through an Origin
   Access Control (OAC). The bucket itself stays fully private.
2. **Uploads the site files** with `aws s3 sync`, applying long
   `Cache-Control: max-age` headers to immutable assets and a short TTL to
   `index.html` so updates surface quickly.
3. **Invalidates the CloudFront cache** so the new version is served right
   away instead of waiting for edge TTL expiration.

When you're done:

```pwsh
./infrastructure/teardown.ps1
```

See [`infrastructure/README.md`](./infrastructure/README.md) for a deeper
walkthrough.

## What the example demonstrates

For your students, this project hits several common AWS patterns:

- Using S3 for static asset storage without making the bucket public.
- Fronting S3 with CloudFront so the site is HTTPS, low-latency, and globally
  cached.
- Using Origin Access Control (the modern OAI replacement) and a bucket
  policy that only trusts the specific distribution.
- Versioned bucket + lifecycle rule for cheap, recoverable history.
- Cache-Control discipline at upload time + targeted invalidations after
  deploys.
- Infrastructure-as-code via CloudFormation.

## Not affiliated with Subaru

This is a stylized, procedural rendering for educational use. No Subaru
brand assets, models, or trademarks are included.
