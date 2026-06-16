# BigQuery Release Pulse 🚀

A polished, responsive web application that fetches Google Cloud BigQuery Release Notes, parses them into granular updates, and allows you to customize and tweet them to your audience using pre-designed templates with character limit safeguards.

---

## 🌟 Features

* **Granular Feed Parser**: Automatically fetches Google's Atom XML feed and splits grouped daily releases into individual, category-categorized cards (`Feature`, `Issue`, `Deprecation`, `Change`).
* **Sleek Dark Dashboard**: Modern responsive UI styled with custom variables, smooth transitions, glassmorphic panels, and loading card skeletons.
* **Instant Keyword Filtering**: Filter updates by category pills or search terms locally in real-time.
* **Smart Tweet Composer**:
  * Select any update card to edit and tweet.
  * **Dynamic Style Templates**: Three pre-configured templates: **💼 Professional**, **🔥 Hype**, and **⚡ Quick Snippet**.
  * **Auto-Truncation**: Smartly truncates note content to ensure drafts fit within X/Twitter's **280-character limit** alongside links and hashtags.
  * **Interactive Actions**: Click to copy raw tweet text or click "Tweet on X" to open a pre-filled Web Intent page.
* **Smart Cache Proxy**: Implements a 1-hour memory cache on the Flask server to avoid rate limits, with a manual **Refresh Feed** button that spins during sync.

---

## 🛠️ Tech Stack

* **Backend**: Python 3, Flask, Beautiful Soup 4, Requests
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom layouts & animations), Vanilla JavaScript (ES6+)

---

## 📂 Project Structure

```
├── app.py                  # Flask application (RSS Fetcher, Parser & Cache API)
├── templates/
│   └── index.html          # Dashboard HTML skeleton
├── static/
│   ├── app.js              # State manager, filters, template formatting & Clipboard logic
│   └── style.css           # Styling theme, grids, skeleton frames & keyframe spinner
├── .gitignore              # Ignores python environment caches and IDE logs
└── README.md               # Documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure Python 3 is installed on your computer.

### 1. Install Dependencies
Run the following command in your terminal to install Flask and the required libraries:
```bash
python3 -m pip install flask requests beautifulsoup4
```

### 2. Run the Web Server
Launch the Flask development server:
```bash
python3 app.py
```
*Note: The app runs on port `5001` to prevent conflicts with default services (like AirPlay) running on port `5000` on macOS.*

### 3. Open in Browser
Open your browser and navigate to:
```
http://127.0.0.1:5001/
```

---

## 📝 License
This project is open-source and available under the MIT License.
