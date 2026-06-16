import os
import time
import re
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
CACHE_DURATION = 3600  # Cache for 1 hour
_cache = {
    "data": None,
    "last_updated": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_content(soup):
    """
    Cleans up HTML content for rendering.
    Makes links open in new tabs, cleans up spacing.
    """
    for a in soup.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
    return str(soup)

def parse_release_notes():
    """
    Fetches the Atom feed and parses it into granular release note updates.
    """
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_content = response.content
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        root = ET.fromstring(xml_content)
        namespace = {'atom': 'http://www.w3.org/2005/Atom'}
        
        updates = []
        update_id_counter = 0

        for entry in root.findall('atom:entry', namespace):
            title = entry.find('atom:title', namespace).text  # e.g. "June 15, 2026"
            updated_str = entry.find('atom:updated', namespace).text  # ISO format date
            link_elem = entry.find("atom:link[@rel='alternate']", namespace)
            link = link_elem.attrib['href'] if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            content_elem = entry.find('atom:content', namespace)
            
            if content_elem is None or not content_elem.text:
                continue

            # Parse HTML content within the entry
            soup = BeautifulSoup(content_elem.text, 'html.parser')
            h3_tags = soup.find_all('h3')

            if not h3_tags:
                # Fallback if there are no H3 tags (single item release note)
                cleaned_html = clean_html_content(soup)
                text_content = soup.get_text().strip()
                updates.append({
                    'id': f"upd_{update_id_counter}",
                    'date': title,
                    'updated': updated_str,
                    'link': link,
                    'type': 'General',
                    'content_html': cleaned_html,
                    'content_text': text_content
                })
                update_id_counter += 1
            else:
                for h3 in h3_tags:
                    update_type = h3.get_text().strip()
                    
                    # Gather all siblings until the next h3
                    sibling_content = []
                    sibling = h3.next_sibling
                    while sibling and sibling.name != 'h3':
                        if sibling.name:
                            sibling_content.append(str(sibling))
                        elif isinstance(sibling, str) and sibling.strip():
                            sibling_content.append(sibling.strip())
                        sibling = sibling.next_sibling

                    html_chunk = "".join(sibling_content).strip()
                    chunk_soup = BeautifulSoup(html_chunk, 'html.parser')
                    cleaned_html = clean_html_content(chunk_soup)
                    text_content = chunk_soup.get_text().strip()

                    # Create a specific anchor if the link points to release-notes
                    # The entry title is typically like "June 15, 2026". 
                    # The Cloud Docs anchor style is typically #June_15_2026
                    anchor_date = title.replace(" ", "_").replace(",", "")
                    specific_link = f"https://cloud.google.com/bigquery/docs/release-notes#{anchor_date}"

                    updates.append({
                        'id': f"upd_{update_id_counter}",
                        'date': title,
                        'updated': updated_str,
                        'link': specific_link,
                        'type': update_type,
                        'content_html': cleaned_html,
                        'content_text': text_content
                    })
                    update_id_counter += 1

        return updates
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

def get_cached_releases(force_refresh=False):
    """
    Returns the release notes. Fetches if cache is stale or force_refresh is True.
    """
    now = time.time()
    if force_refresh or _cache["data"] is None or (now - _cache["last_updated"]) > CACHE_DURATION:
        print("Refreshing releases cache...")
        data = parse_release_notes()
        if data is not None:
            _cache["data"] = data
            _cache["last_updated"] = now
            return data, True
        
        # If fetch fails but we have old cached data, return it
        if _cache["data"] is not None:
            return _cache["data"], False
        return [], False
        
    return _cache["data"], False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    releases, refreshed = get_cached_releases(force_refresh=force_refresh)
    
    # Format last updated timestamp in a friendly way
    last_updated_dt = datetime.fromtimestamp(_cache["last_updated"])
    last_updated_str = last_updated_dt.strftime("%Y-%m-%d %H:%M:%S")
    
    return jsonify({
        "success": True,
        "releases": releases,
        "last_updated": last_updated_str,
        "cache_hit": not refreshed
    })

if __name__ == '__main__':
    # Running locally on port 5001 to avoid default mac port 5000 conflicts
    app.run(host='0.0.0.0', port=5001, debug=True)
