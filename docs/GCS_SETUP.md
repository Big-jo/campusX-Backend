# Google Cloud Storage Setup Guide

## Migration from Cloudflare R2 → GCP Cloud Storage

### Prerequisites

1. **GCP Project**: Create/select a project in [Google Cloud Console](https://console.cloud.google.com)
2. **Enable Cloud Storage API**: Navigate to APIs & Services → Enable "Cloud Storage API"
3. **Create Service Account** (for authentication):
   - IAM & Admin → Service Accounts → Create Service Account
   - Grant role: "Storage Object Admin"
   - Create & download JSON key

### 1. Create GCS Buckets

```bash
# Install gcloud CLI (if not already)
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Create single bucket with folder structure
gcloud storage buckets create gs://campusx-storage --location=us-central1

# Make bucket publicly readable (optional - for public URLs)
gcloud storage buckets add-iam-policy-binding gs://campusx-storage \
  --member=allUsers --role=roles/storage.objectViewer
```

### 2. Configure Environment Variables

Update your `.env` file:

```env
# GCP Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET=campusx-storage

# Authentication: Choose ONE method below

# Option A: Service Account JSON (as string)
GCS_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'

# Option B: Path to service account JSON file
# GCS_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json

# Optional: Custom domain (if using Cloud CDN/Load Balancer)
# GCS_PUBLIC_URL=https://cdn.campusx.com
```

### 3. Railway Deployment

**Add environment variables in Railway:**

1. Go to your Railway project → Variables
2. Add: `GCS_PROJECT_ID`, `GCS_BUCKET`, `GCS_SERVICE_ACCOUNT_KEY`
3. For `GCS_SERVICE_ACCOUNT_KEY`:
   - Paste the **entire JSON content** as a single-line string
   - Or use Railway's file upload for the JSON file

**Important**: Don't commit service account keys to git!

**Folder structure** (automatic via code):
```
campusx-storage/
  avatars/{file-id}
  image/{file-id}
  video/{file-id}
  expressions/{file-id}
  circle-avatars/{file-id}
  circle-cover-image/{file-id}
```

### 4. Authentication Methods

#### Method 1: Service Account JSON (Recommended for Railway)
```env
GCS_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

#### Method 2: Application Default Credentials (For local dev)
```bash
gcloud auth application-default login
# Then omit GCS_SERVICE_ACCOUNT_KEY env var
```

### 5. Set CORS (if needed for browser uploads)

```bash
# Create cors.json
cat > cors.json << 'EOF'
[
  {
    "origin": ["https://campusx.com", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply to bucket
gcloud storage buckets update gs://campusx-storage --cors-file=cors.json
```

### 6. Cost Optimization

**Lifecycle policies** (delete old files):
```bash
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://campusx-storage --lifecycle-file=lifecycle.json
```

**Storage classes**:
- Standard: Frequently accessed (avatars, images)
- Nearline: Monthly access (old videos)
- Coldline: Quarterly access (archives)

### 7. Migration Script (Optional)

To migrate existing files from R2 to GCS:

```typescript
// migrate-r2-to-gcs.ts
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

async function migrate() {
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const gcs = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_SERVICE_ACCOUNT_KEY,
  });

  // List all objects in R2 bucket
  const { Contents } = await r2.send(new ListObjectsV2Command({
    Bucket: 'your-r2-bucket',
  }));

  for (const obj of Contents || []) {
    // Download from R2
    const { Body } = await r2.send(new GetObjectCommand({
      Bucket: 'your-r2-bucket',
      Key: obj.Key!,
    }));

    // Upload to GCS
    const buffer = await Body!.transformToByteArray();
    await gcs.bucket('your-gcs-bucket').file(obj.Key!).save(Buffer.from(buffer));

    console.log(`Migrated: ${obj.Key}`);
  }
}
```

### 8. URLs Generated

**Public URLs** (if bucket is public):
```
https://storage.googleapis.com/campusx-storage/{folder}/{file-id}
```

**Custom domain** (if using CDN):
```
https://cdn.campusx.com/{file-id}
```

### 9. Pricing Comparison

**GCS Pricing** (us-central1):
- Storage: $0.020/GB/month (Standard)
- Class A operations (writes): $0.05/10k ops
- Class B operations (reads): $0.004/10k ops
- Network egress: $0.12/GB (to internet)

**R2 Pricing**:
- Storage: $0.015/GB/month
- No egress fees
- Operations: $4.50/million writes, $0.36/million reads

**Winner**: R2 is cheaper if you have high egress. GCS is better with CDN/Firebase integration.

### 10. Monitoring

**Cloud Console**: https://console.cloud.google.com/storage
- View storage usage
- Monitor requests/bandwidth
- Set up billing alerts

### Troubleshooting

**"Permission denied" errors**:
```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_SERVICE_ACCOUNT_EMAIL"
```

**"Bucket not found"**:
```bash
# List all buckets
gcloud storage buckets list
```

**Authentication issues**:
```bash
# Test authentication
gcloud storage ls
```
