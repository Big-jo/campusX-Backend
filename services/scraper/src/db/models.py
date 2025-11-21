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
