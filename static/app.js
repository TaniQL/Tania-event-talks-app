// State management
let state = {
    releases: [],
    filteredReleases: [],
    selectedRelease: null,
    activeFilter: 'all',
    searchQuery: '',
    activeTemplate: 'professional',
    isRefreshing: false
};

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const searchInput = document.getElementById('search-input');
const typeFilters = document.getElementById('type-filters');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedTime = document.getElementById('last-updated-time');
const totalUpdatesCount = document.getElementById('total-updates-count');
const visibleCountBadge = document.getElementById('visible-count-badge');

// Composer DOM Elements
const composerCard = document.getElementById('composer-card');
const composerEmpty = document.getElementById('composer-empty');
const composerActive = document.getElementById('composer-active');
const compDate = document.getElementById('comp-date');
const compBadge = document.getElementById('comp-badge');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const charWarning = document.getElementById('char-warning');
const tweetBtn = document.getElementById('tweet-btn');
const copyBtn = document.getElementById('copy-btn');
const copyBtnText = document.getElementById('copy-btn-text');
const sourceLink = document.getElementById('source-link');
const templateButtons = document.querySelectorAll('.tpl-btn');

// Initialize the App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Setup Events
function setupEventListeners() {
    // Refresh button click
    refreshBtn.addEventListener('click', () => {
        if (!state.isRefreshing) {
            fetchReleases(true);
        }
    });

    // Search input typing
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });

    // Type filters clicking (event delegation)
    typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            // Remove active class from all pills
            document.querySelectorAll('.filter-pills .pill').forEach(pill => {
                pill.classList.remove('active');
            });
            
            // Add active class to clicked pill
            e.target.classList.add('active');
            
            state.activeFilter = e.target.getAttribute('data-filter');
            renderFeed();
        }
    });

    // Textarea typing character count
    tweetTextarea.addEventListener('input', updateCharCount);

    // Template selection clicks
    templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            templateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            state.activeTemplate = btn.getAttribute('data-template');
            if (state.selectedRelease) {
                generateTweetContent(state.selectedRelease);
            }
        });
    });

    // Action buttons
    copyBtn.addEventListener('click', copyTweetText);
    tweetBtn.addEventListener('click', tweetOnX);
}

// Fetch releases from Backend API
async function fetchReleases(forceRefresh = false) {
    state.isRefreshing = true;
    refreshBtn.classList.add('refreshing');
    refreshBtn.disabled = true;

    // Show skeletons in feed during loading
    showSkeletons();

    try {
        const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            state.releases = data.releases;
            lastUpdatedTime.textContent = formatTime(data.last_updated);
            totalUpdatesCount.textContent = data.releases.length;
        } else {
            console.error("Failed to parse releases:", data.error);
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        feedContainer.innerHTML = `
            <div class="empty-feed-error">
                <p>⚠️ Error fetching release notes. Check your server connection.</p>
                <button class="btn btn-secondary btn-retry" onclick="fetchReleases()">Retry</button>
            </div>
        `;
    } finally {
        state.isRefreshing = false;
        refreshBtn.classList.remove('refreshing');
        refreshBtn.disabled = false;
        renderFeed();
    }
}

// Render Skeletons during Loading
function showSkeletons() {
    feedContainer.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton skeleton-header"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton skeleton-header"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton skeleton-header"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
        </div>
    `;
}

// Render Feed items based on filters and search
function renderFeed() {
    // Filter logic
    state.filteredReleases = state.releases.filter(item => {
        // Filter by Type
        let matchesType = false;
        if (state.activeFilter === 'all') {
            matchesType = true;
        } else if (state.activeFilter === 'Other') {
            // "Other" matches everything that is not standard
            matchesType = !['Feature', 'Issue', 'Deprecation', 'Change'].includes(item.type);
        } else {
            matchesType = item.type === state.activeFilter;
        }

        // Filter by Search Query
        const matchesSearch = item.date.toLowerCase().includes(state.searchQuery) ||
                             item.type.toLowerCase().includes(state.searchQuery) ||
                             item.content_text.toLowerCase().includes(state.searchQuery);

        return matchesType && matchesSearch;
    });

    // Update count badge
    visibleCountBadge.textContent = `Showing ${state.filteredReleases.length} updates`;

    if (state.filteredReleases.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-feed">
                <h3>No updates found</h3>
                <p>Try clearing your filters or search keywords.</p>
            </div>
        `;
        return;
    }

    feedContainer.innerHTML = '';
    
    state.filteredReleases.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('release-card');
        if (state.selectedRelease && state.selectedRelease.id === item.id) {
            card.classList.add('selected');
        }

        const typeLower = item.type.toLowerCase();
        let badgeClass = 'badge-general';
        if (['feature', 'issue', 'deprecation', 'change'].includes(typeLower)) {
            badgeClass = `badge-${typeLower}`;
        }

        card.innerHTML = `
            <div class="card-header">
                <span class="card-date">${item.date}</span>
                <span class="badge ${badgeClass}">${item.type}</span>
            </div>
            <div class="card-content">
                ${item.content_html}
            </div>
        `;

        card.addEventListener('click', () => selectRelease(item));
        feedContainer.appendChild(card);
    });
}

// Select a release card
function selectRelease(release) {
    state.selectedRelease = release;
    
    // Highlight correct card in feed UI
    document.querySelectorAll('.release-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Re-render feed elements will set the selection, or we can look up the element
    // To avoid refetching/re-rendering feed just to toggle selected class:
    const cards = feedContainer.children;
    state.filteredReleases.forEach((item, index) => {
        if (item.id === release.id) {
            if (cards[index]) cards[index].classList.add('selected');
        }
    });

    // Toggle Composer views
    composerEmpty.classList.add('hidden');
    composerActive.classList.remove('hidden');
    composerCard.classList.remove('empty-state');

    // Update fields in composer
    compDate.textContent = release.date;
    compBadge.textContent = release.type;
    
    // Set badge style in composer
    compBadge.className = 'badge';
    const typeLower = release.type.toLowerCase();
    if (['feature', 'issue', 'deprecation', 'change'].includes(typeLower)) {
        compBadge.classList.add(`badge-${typeLower}`);
    } else {
        compBadge.classList.add('badge-general');
    }

    // Set doc source link
    sourceLink.href = release.link;

    // Generate Tweet content
    generateTweetContent(release);
}

// Generate Tweet Content based on chosen template
function generateTweetContent(release) {
    const textContent = release.content_text.replace(/\s+/g, ' '); // Clean duplicate whitespaces/newlines
    const date = release.date;
    const type = release.type;
    const link = release.link;
    
    let tweetDraft = '';

    // Calculate maximum available space for the text snippet
    // Limit is 280. We need to leave space for titles, punctuation, tags and link
    const linkLength = link.length; // Actual link length
    let baseTextLength = 0;
    
    if (state.activeTemplate === 'professional') {
        // Template: "Google Cloud BigQuery Update ({date}) - {type}:\n\n{snippet}\n\nRead official notes: {link}"
        const prefix = `Google Cloud BigQuery Update (${date}) - ${type}:\n\n`;
        const suffix = `\n\nRead official notes: ${link}`;
        baseTextLength = prefix.length + suffix.length;
        const maxSnippetLength = 280 - baseTextLength;
        const truncatedSnippet = getTruncatedSnippet(textContent, maxSnippetLength);
        
        tweetDraft = `${prefix}${truncatedSnippet}${suffix}`;
    } 
    else if (state.activeTemplate === 'hype') {
        // Template: "🚀 New BigQuery update! ({type})\n\n{snippet}\n\nDocumentation: {link} #GoogleCloud #BigQuery"
        const prefix = `🚀 New BigQuery update! (${type})\n\n`;
        const suffix = `\n\nDocumentation: ${link} #GoogleCloud #BigQuery`;
        baseTextLength = prefix.length + suffix.length;
        const maxSnippetLength = 280 - baseTextLength;
        const truncatedSnippet = getTruncatedSnippet(textContent, maxSnippetLength);
        
        tweetDraft = `${prefix}${truncatedSnippet}${suffix}`;
    } 
    else { // 'short'
        // Template: "BigQuery {type} ({date}): {snippet}\n{link}"
        const prefix = `BigQuery ${type} (${date}): `;
        const suffix = `\n${link}`;
        baseTextLength = prefix.length + suffix.length;
        const maxSnippetLength = 280 - baseTextLength;
        const truncatedSnippet = getTruncatedSnippet(textContent, maxSnippetLength);
        
        tweetDraft = `${prefix}${truncatedSnippet}${suffix}`;
    }

    tweetTextarea.value = tweetDraft;
    updateCharCount();
}

// Helper to truncate text snippet nicely
function getTruncatedSnippet(text, maxLength) {
    if (maxLength <= 10) return "...";
    if (text.length <= maxLength) return text;
    // Try to cut at word boundary
    const subText = text.substring(0, maxLength - 3);
    const lastSpace = subText.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
        return subText.substring(0, lastSpace) + '...';
    }
    return subText + '...';
}

// Update Character count UI
function updateCharCount() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;

    if (len > 280) {
        charCounter.classList.add('warning');
        charWarning.className = 'char-warning-msg visible-warn';
        charWarning.style.color = '#f43f5e';
        charWarning.textContent = `Too long by ${len - 280} characters!`;
    } else {
        charCounter.classList.remove('warning');
        charWarning.className = 'char-warning-msg hidden-warn';
    }
}

// Copy Tweet text to Clipboard
async function copyTweetText() {
    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success visual feedback
        copyBtnText.textContent = "Copied!";
        copyBtn.classList.add('btn-success');
        
        // Save original HTML icon
        const originalIcon = copyBtn.querySelector('.copy-icon').innerHTML;
        // Swap to checkmark icon
        copyBtn.querySelector('.copy-icon').innerHTML = `
            <polyline points="20 6 9 17 4 12"></polyline>
        `;

        setTimeout(() => {
            copyBtnText.textContent = "Copy Text";
            copyBtn.classList.remove('btn-success');
            copyBtn.querySelector('.copy-icon').innerHTML = originalIcon;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert("Could not copy text automatically. Please select the text and copy manually.");
    }
}

// Tweet on X / open intent
function tweetOnX() {
    const text = tweetTextarea.value;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

// Format date time helper
function formatTime(timeStr) {
    if (!timeStr) return 'Unknown';
    // Format YYYY-MM-DD HH:MM:SS to a readable local string
    try {
        const parts = timeStr.split(' ');
        if (parts.length === 2) {
            return `${parts[0]} ${parts[1]}`;
        }
        return timeStr;
    } catch (e) {
        return timeStr;
    }
}
