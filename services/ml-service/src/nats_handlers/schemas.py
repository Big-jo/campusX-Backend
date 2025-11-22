"""Pydantic schemas for NATS message validation."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# Event Schemas (fire-and-forget)

class PostCreatedEvent(BaseModel):
    """Event published when a new post is created."""
    post_id: str = Field(..., description="MongoDB ObjectId as string")
    text: str = Field(..., description="Post content")
    campus: str = Field(..., description="Campus identifier")
    author_id: str = Field(..., description="Author's MongoDB ObjectId")
    created_at: int = Field(..., description="Unix timestamp")
    hashtags: Optional[List[str]] = Field(default_factory=list)


class PostUpdatedEvent(BaseModel):
    """Event published when a post is edited."""
    post_id: str
    text: str
    campus: str
    updated_at: int


# Request/Response Schemas

class SearchRequest(BaseModel):
    """Semantic search request."""
    query: str = Field(..., min_length=1)
    campus: str
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    limit: int = Field(default=20, ge=1, le=100)


class SearchResponse(BaseModel):
    """Semantic search response."""
    post_ids: List[str] = Field(default_factory=list)
    scores: List[float] = Field(default_factory=list)
    latency_ms: int
    source: str = Field(default="vector")  # "vector" or "cache"


class TrendingRequest(BaseModel):
    """Request for trending posts."""
    campus: str
    time_window: str = Field(default="6h", pattern="^(6h|24h|7d)$")
    limit: int = Field(default=10, ge=1, le=50)


class TrendingTopic(BaseModel):
    """A trending topic with associated posts."""
    topic: str
    score: float
    post_ids: List[str]
    hashtags: List[str] = Field(default_factory=list)


class TrendingResponse(BaseModel):
    """Trending posts response."""
    topics: List[TrendingTopic]
    computed_at: int
    cache_ttl: int
    source: str = Field(default="cache")


class UserSuggestionsRequest(BaseModel):
    """Request for ML-enhanced user suggestions."""
    user_id: str
    campus: str
    limit: int = Field(default=20, ge=1, le=50)


class UserSuggestion(BaseModel):
    """A suggested user with ML scoring."""
    user_id: str
    ml_score: float = Field(..., ge=0.0, le=1.0)
    reason: str = Field(..., description="'engagement' or 'interests'")


class UserSuggestionsResponse(BaseModel):
    """User suggestions response."""
    users: List[UserSuggestion]
    source: str = Field(default="ml")


# Error Response

class ErrorResponse(BaseModel):
    """Error response for failed requests."""
    error: str
    message: str
    fallback: bool = False
