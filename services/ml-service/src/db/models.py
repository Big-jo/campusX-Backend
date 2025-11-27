from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _schema_generator):
        return {"type": "string"}


class BotConfig(BaseModel):
    """Bot configuration"""

    postingFrequency: str = "daily"  # 'hourly', 'daily', 'weekly'
    maxPostsPerDay: int = 3
    autoPostEnabled: bool = True
    dataSources: List[str] = []
    keywords: List[str] = []
    hashtags: List[str] = []


class BotStats(BaseModel):
    """Bot statistics"""

    totalPosts: int = 0
    totalInteractions: int = 0
    lastPostAt: Optional[datetime] = None


class Bot(BaseModel):
    """Bot model (matches TypeScript Bot schema)"""

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    botType: str  # Interest category name
    config: BotConfig = BotConfig()
    status: str = "active"  # 'active', 'paused'
    stats: BotStats = BotStats()
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ScrapedContentMetadata(BaseModel):
    """Scraped content metadata"""

    author: Optional[str] = None
    publishedAt: Optional[datetime] = None
    wordCount: int = 0


class EnrichedContentData(BaseModel):
    """Enriched content data from LLM"""

    summary: str = ""
    caption: str = ""
    insights: List[str] = []
    context: str = ""
    conversation_starter: str = ""
    hashtags: List[str] = []


class ContentQualityMetrics(BaseModel):
    """Content quality metrics"""

    score: float = 0.0
    word_count: int = 0
    readability: Optional[float] = None
    source_reputation: Optional[float] = None


class ContentDeduplication(BaseModel):
    """Deduplication metadata"""

    fingerprint: Optional[str] = None
    canonical_url: Optional[str] = None
    duplicate_of: Optional[PyObjectId] = None


class ScrapedContent(BaseModel):
    """Scraped content model (matches TypeScript ScrapedContent schema)"""

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    url: str
    title: str
    content: str  # Markdown
    images: List[str] = []  # GCS URLs
    keywords: List[str] = []
    sourceDomain: str
    interestCategory: str
    scrapedAt: datetime = Field(default_factory=datetime.utcnow)
    qualityScore: float = 0.0
    status: str = "pending"  # 'pending', 'posted', 'rejected'
    usedByBots: List[PyObjectId] = []
    metadata: ScrapedContentMetadata = ScrapedContentMetadata()

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class EnrichedContent(BaseModel):
    """Enriched content model with pipeline metadata"""

    id: Optional[PyObjectId] = Field(alias="_id", default=None)

    # Original scraped data
    url: str
    title: str
    content: str  # Markdown from scraper
    images: List[str] = []  # Raw URLs or GCS URLs
    keywords: List[str] = []
    sourceDomain: str
    interestCategory: str

    # Enriched data (from LLM)
    enriched: Optional[EnrichedContentData] = None

    # Quality metrics
    quality: ContentQualityMetrics = ContentQualityMetrics()

    # Deduplication
    dedup: ContentDeduplication = ContentDeduplication()

    # Metadata
    scrapedAt: datetime = Field(default_factory=datetime.utcnow)
    enrichedAt: Optional[datetime] = None
    sourceType: str = "rss"  # 'rss', 'serper', 'gemini'
    discoveredTitle: str = ""

    # Status tracking
    status: str = "pending"  # 'pending', 'processing', 'enriched', 'published', 'rejected', 'failed'

    # Usage tracking
    usedByBots: List[PyObjectId] = []
    images_processed: bool = False

    # Original metadata
    metadata: ScrapedContentMetadata = ScrapedContentMetadata()

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class RSSSource(BaseModel):
    """RSS feed source"""

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    url: str
    category: str  # Category or topic name
    category_id: Optional[str] = None  # Links to InterestCategory.id
    topic_id: Optional[str] = None  # Links to InterestCategory.topics[].id if applicable
    discovered_via: str = "manual"  # 'manual', 'serper', 'gemini'
    quality_score: float = 0.0
    last_fetched: Optional[datetime] = None
    active: bool = True
    metadata: Dict = {}
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserInterest(BaseModel):
    """User interest tracking"""

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId

    # Interest vector (category → weight)
    interest_vector: Dict[str, float] = {}

    # Interest transitions over time
    transitions: List[Dict] = []  # [{from, to, timestamp}]

    # Link to Qdrant vector store
    qdrant_point_id: Optional[str] = None

    # Timestamps
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
