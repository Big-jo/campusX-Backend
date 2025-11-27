# Storyboard Seed Script

Generates realistic social platform activity with **Nigerian university context** for testing and development.

## Features

✅ **60 Realistic Users**
- Nigerian names (Yoruba, Igbo, Hausa, etc.)
- Real Nigerian universities
- Departments, levels, interests
- Power law distribution: 20% active, 30% moderate, 50% lurkers

✅ **Small-World Social Network**
- Watts-Strogatz algorithm (mimics real social networks)
- ~12-15 follows/user average
- 10% influencers with 30-50 followers
- Campus-based clustering
- 40% mutual follow rate

✅ **Realistic Posts (300-500 total)**
- Nigerian campus slang and context
- Academic, social, food, sports content
- Power law distribution (active users post 8-15x, lurkers 0-2x)
- Time-based patterns (peak hours: 7-9am, 12-2pm, 6-11pm)
- 20% include media

✅ **Organic Interactions**
- Zipf distribution (few posts get most engagement)
- Time decay (recent posts more engagement)
- Views → Likes (10-15%) → Comments (20-30% of likes) → Shares (5-10% of likes)
- Realistic timing and patterns

## Quick Start

```bash
# Install dependencies
npm install @faker-js/faker

# Run with defaults (60 users)
npm run seed:storyboard

# Fresh start (clear existing data)
npm run seed:storyboard -- --fresh

# Custom user count
npm run seed:storyboard -- --count=100

# Deterministic seed (reproducible)
npm run seed:storyboard -- --seed=12345
```

## Usage

### Command Line

```bash
cd services/core

# Basic
npx ts-node src/seed/storyboard/seed.ts

# Options
npx ts-node src/seed/storyboard/seed.ts --fresh --count=80 --seed=42
```

### Programmatic

```typescript
import seedStoryboard from './seed/storyboard/seed';

await seedStoryboard({
  userCount: 60,
  fresh: true,
  seed: 12345
});
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--fresh` | Clear existing data before seeding | `false` |
| `--count=N` | Number of users to generate | `60` |
| `--seed=N` | Random seed for reproducibility | Random |

## Generated Data Structure

### Users
```typescript
{
  username: "adeolaadeyemi",
  name: "Adeola Adeyemi",
  email: "adeolaadeyemi@unilag.edu.ng",
  bio: "Computer Science student | Football & Tech enthusiast | Living my best campus life 🎓",
  campus: "University of Lagos",
  campusMetadata: {
    acronym: "UNILAG",
    department: "Computer Science",
    level: 300
  },
  interests: ["Tech", "Football", "Music"],
  userType: "active", // or "moderate", "lurker"
  verified: true
}
```

### Posts
```typescript
{
  user: "userId",
  content: "Just finished my GST assignment after 5 hours 😭",
  hashtags: ["StudentLife", "ExamPrep"],
  media: [{ type: "image", url: "..." }],
  likesCount: 45,
  commentsCount: 12,
  sharesCount: 3,
  createdAt: "2024-11-20T14:30:00Z"
}
```

### Follows
```typescript
{
  follower: "userId1",
  following: "userId2",
  createdAt: "2024-11-15T09:00:00Z"
}
```

## Statistics

Expected output for 60 users:

- **Users:** 60 (12 active, 18 moderate, 30 lurkers)
- **Follows:** ~720-850 relationships
- **Posts:** ~300-500 total
- **Interactions:** ~3,000-5,000 total
  - Views: ~2,000-3,000
  - Likes: ~600-1,000
  - Comments: ~200-400
  - Shares: ~30-60

## Algorithms Used

### Social Graph
- **Watts-Strogatz:** Small-world network with clustering
- **Preferential Attachment:** Popular users get more followers
- **Campus Clustering:** Same-campus users follow each other

### Content Distribution
- **Power Law:** 20% users create 80% content
- **Poisson Distribution:** Post timing
- **Activity Multipliers:** Peak hours get more activity

### Engagement
- **Zipf's Law:** Few posts get most engagement
- **Time Decay:** Recent content more engagement
- **Follower Boost:** Followers more likely to engage

## Nigerian Context

### Universities
Uses real Nigerian universities from seed data:
- University of Lagos (UNILAG)
- University of Ibadan (UI)
- Obafemi Awolowo University (OAU)
- University of Nigeria, Nsukka (UNN)
- And 16 more...

### Names
Authentic Nigerian names from major ethnic groups:
- **Yoruba:** Adeola, Babatunde, Oluwaseun, etc.
- **Igbo:** Chukwuemeka, Obiora, Chiamaka, etc.
- **Hausa:** Ibrahim, Musa, Fatima, Aisha, etc.

### Campus Slang
- "gbese don enter my transcript"
- "ASUU strike loading"
- "mama put rice hit different"
- "hostel wahala"
- And 20+ more authentic phrases

## Testing ML Service Integration

The generated data is perfect for testing:

1. **Interest Tracking:** Users have defined interests
2. **Content Discovery:** Various categories and hashtags
3. **Engagement Patterns:** Realistic Zipf distribution
4. **Social Graph:** Small-world properties for recommendations

### NATS Integration Test

```typescript
// Interactions automatically trigger NATS events
// user.interaction.like
// user.interaction.comment
// user.interaction.share
```

## Troubleshooting

**Error: MONGO_URI not found**
```bash
# Add to .env
MONGO_URI=mongodb://localhost:27017/campusx
```

**Slow performance**
```bash
# Use smaller user count for testing
npm run seed:storyboard -- --count=20
```

**Duplicate usernames**
```bash
# Use --fresh flag
npm run seed:storyboard -- --fresh
```

## Development

File structure:
```
storyboard/
├── seed.ts                    # Main orchestrator
├── generators/
│   ├── user.generator.ts      # User profiles
│   ├── post.generator.ts      # Posts
│   └── interaction.generator.ts # Likes, comments, shares
├── utils/
│   ├── distributions.ts       # Zipf, power law, etc.
│   └── social-graph.ts        # Network algorithms
└── data/
    └── nigerian-names.ts      # Names, slang, context
```

## License

Part of CampusX platform - Nigerian university social network.
