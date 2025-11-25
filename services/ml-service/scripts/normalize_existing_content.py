import os
import sys
from src.scraper.content_formatter import normalize_content 
from src.db.mongodb import COLLECTIONS, get_sync_db

# Add src directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from scraper.content_formatter import normalize_content

def backfill_content_formatting():
    """
    Connects to MongoDB, fetches scraped content, normalizes it,
    and updates the documents in the database.
    """
    db = get_sync_db()  # sync client
    
    scraped_content_collection = db[COLLECTIONS['scraped_content']]
    print("Connected to MongoDB and accessed scraped content collection.")
    if scraped_content_collection is None:
        print("Scraped content collection not found in the database.")
        return
    
    cursor = scraped_content_collection.find({
        'isNormalized': {'$ne': True},
        'content': {'$exists': True, '$ne': ''}
    })
    
    documents_to_process = list(cursor)

    if not documents_to_process:
        print("No content to normalize. Everything is up to date.")
        return

    print(f"Found {len(documents_to_process)} documents to normalize...")
    
    updated_count = 0
    for doc in documents_to_process:
        original_content = doc.get('content', '')

        if not original_content or not original_content.strip():
            continue

        extracted_title, normalized_body = normalize_content(original_content)
        
        # print({
        #     'doc_id': str(doc['_id']),
        #     'extracted_title': extracted_title,
        #     'original_content_snippet': original_content[:60],
        #     'normalized_body_snippet': normalized_body[:60],
        # })
        
        update_payload = {
            'content': normalized_body,
            'isNormalized': True,
        }

        # Add original content backup
        if 'originalContent' not in doc:
            update_payload['originalContent'] = original_content
        
        # Auto-title update
        if extracted_title and not doc.get('title'):
            update_payload['title'] = extracted_title

        result = scraped_content_collection.update_one(
            {'_id': doc['_id']},
            {'$set': update_payload}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            print(f"  - Normalized and updated document: {doc['_id']}")

    print(f"\nNormalization complete. {updated_count} documents were updated.")


if __name__ == '__main__':
    backfill_content_formatting()
