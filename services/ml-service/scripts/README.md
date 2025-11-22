# ML Service Setup Scripts

This directory contains scripts for setting up and maintaining the ML service infrastructure.

## Scripts

### 1. setup_qdrant.py

Initialize Qdrant vector database collections.

**Usage:**
```bash
cd services/ml-service
python scripts/setup_qdrant.py
```

**What it does:**
- Creates `posts` collection for post embeddings (384-dim vectors)
- Creates `user_profiles` collection for user taste profiles
- Verifies collection creation and displays stats

**Environment variables:**
- `QDRANT_URL` - Qdrant connection URL (default: `http://localhost:6333`)

---

### 2. backfill_embeddings.py

Generate embeddings for existing posts in MongoDB and store in Qdrant.

**Usage:**
```bash
cd services/ml-service

# Backfill all posts
python scripts/backfill_embeddings.py

# Backfill only 1000 posts
python scripts/backfill_embeddings.py --limit 1000

# Custom batch size (default: 32)
python scripts/backfill_embeddings.py --batch-size 64
```

**What it does:**
- Fetches posts from MongoDB
- Generates sentence embeddings using all-MiniLM-L6-v2
- Stores embeddings in Qdrant with metadata (campus, author, hashtags)
- Processes in batches for efficiency
- Shows progress and error stats

**Arguments:**
- `--limit N` - Max number of posts to process (default: all)
- `--batch-size N` - Parallel processing batch size (default: 32)

**Environment variables:**
- `MONGODB_URI` - MongoDB connection string
- `QDRANT_URL` - Qdrant connection URL
- `ML_MODEL` - Sentence Transformers model (default: all-MiniLM-L6-v2)

---

## Setup Workflow

### First-time setup:

```bash
# 1. Start services
docker-compose up -d nats qdrant mongodb

# 2. Initialize Qdrant collections
cd services/ml-service
python scripts/setup_qdrant.py

# 3. Backfill existing posts
python scripts/backfill_embeddings.py --limit 100  # Test with 100 first
python scripts/backfill_embeddings.py              # Then run full backfill
```

### Monitoring progress:

```bash
# Check Qdrant stats
curl http://localhost:6333/collections/posts

# Check collection size
curl http://localhost:6333/collections/posts | jq '.result.points_count'
```

---

## Troubleshooting

**Connection errors:**
- Ensure NATS, Qdrant, MongoDB are running: `docker-compose ps`
- Check environment variables: `echo $QDRANT_URL`

**Out of memory:**
- Reduce batch size: `--batch-size 16`
- Process in chunks: `--limit 5000`

**Model download fails:**
- Sentence Transformers downloads on first run (~80MB)
- Ensure internet connection or pre-download model
- Check disk space for model cache (~/.cache/torch/sentence_transformers/)

---

## Next Steps

After running these scripts:
1. Verify collections exist: `scripts/setup_qdrant.py`
2. Test search: Use NATS client to send search requests
3. Monitor performance: Check Qdrant metrics at `http://localhost:6333/metrics`
