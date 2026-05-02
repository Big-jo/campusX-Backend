"""
Unit tests for InterestTracker.
All tests mock MongoDB — no real database needed.
"""
import pytest
from unittest.mock import MagicMock, patch, call
from datetime import datetime
from bson import ObjectId

# Valid 24-char hex ObjectId strings for test fixtures
OID1 = str(ObjectId())
OID2 = str(ObjectId())
OID3 = str(ObjectId())


def _make_tracker():
    """Create InterestTracker with all external dependencies mocked."""
    with patch("src.interest_graph.interest_tracker.get_sync_db"), \
         patch("src.interest_graph.interest_tracker.get_embeddings_generator"), \
         patch("src.interest_graph.interest_tracker.get_vector_store"):
        from src.interest_graph.interest_tracker import InterestTracker
        tracker = InterestTracker.__new__(InterestTracker)
        tracker.content_collection = MagicMock()
        tracker.interests_collection = MagicMock()
        tracker.posts_collection = MagicMock()
        tracker.embeddings_generator = MagicMock()
        tracker.vector_store = MagicMock()
        return tracker


def test_weight_accumulates_for_same_category():
    tracker = _make_tracker()
    tracker.content_collection.find_one.return_value = {"interestCategory": "Technology"}

    # First interaction — no existing record
    tracker.interests_collection.find_one.return_value = None
    tracker.track_interaction("user1", OID1, "like", weight=0.5)

    # Second interaction — existing record with first weight applied
    tracker.interests_collection.find_one.return_value = {
        "user_id": "user1",
        "interest_vector": {"Technology": 0.5},
        "transitions": [],
    }
    tracker.track_interaction("user1", OID1, "like", weight=0.5)

    last_call = tracker.interests_collection.update_one.call_args_list[-1]
    saved_vector = last_call[0][1]["$set"]["interest_vector"]
    assert saved_vector["Technology"] == pytest.approx(1.0)


def test_different_categories_tracked_separately():
    tracker = _make_tracker()

    # First: Technology
    tracker.content_collection.find_one.return_value = {"interestCategory": "Technology"}
    tracker.interests_collection.find_one.return_value = None
    tracker.track_interaction("user2", OID2, "like", weight=0.5)

    # Second: Sports — existing record has Technology
    tracker.content_collection.find_one.return_value = {"interestCategory": "Sports"}
    tracker.interests_collection.find_one.return_value = {
        "user_id": "user2",
        "interest_vector": {"Technology": 0.5},
        "transitions": [],
    }
    tracker.track_interaction("user2", OID3, "view", weight=0.1)

    last_call = tracker.interests_collection.update_one.call_args_list[-1]
    saved_vector = last_call[0][1]["$set"]["interest_vector"]
    assert "Technology" in saved_vector
    assert "Sports" in saved_vector
    assert saved_vector["Sports"] == pytest.approx(0.1)


def test_category_override_used_when_no_content():
    """User-post likes (no contentId) should update interests via category_override."""
    tracker = _make_tracker()
    tracker.interests_collection.find_one.return_value = None

    tracker.track_interaction(
        "user3", "", "like", weight=0.5, category_override="Education"
    )

    # content_collection should NOT have been queried (content_id is empty)
    tracker.content_collection.find_one.assert_not_called()

    last_call = tracker.interests_collection.update_one.call_args_list[-1]
    saved_vector = last_call[0][1]["$set"]["interest_vector"]
    assert saved_vector.get("Education") == pytest.approx(0.5)


def test_compute_interest_drift_returns_zero_for_no_transitions():
    tracker = _make_tracker()
    tracker.interests_collection.find_one.return_value = {
        "user_id": "user4",
        "interest_vector": {"Technology": 2.0},
        "transitions": [],
    }

    result = tracker.compute_interest_drift("user4")
    assert result["drift_score"] == 0.0
    assert result["stable"] is True


def test_track_interaction_silent_noop_when_content_missing():
    """No content and no override — should not crash or call update_one."""
    tracker = _make_tracker()
    tracker.content_collection.find_one.return_value = None

    tracker.track_interaction("user5", "nonexistent_id", "like", weight=0.5)

    tracker.interests_collection.update_one.assert_not_called()
