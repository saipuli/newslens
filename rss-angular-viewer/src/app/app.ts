import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RssService, RssFeed, RssItem, PresetFeed } from './rss.service';

interface CachedFeed {
  timestamp: number;
  feed: RssFeed;
  items: RssItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private rssService = inject(RssService);
  private sanitizer = inject(DomSanitizer);

  // Dynamic presets configured at runtime
  protected readonly presets = signal<PresetFeed[]>([]);

  // App State Signals
  protected readonly currentFeedUrl = signal<string>('');
  protected readonly feedMeta = signal<RssFeed | null>(null);
  protected readonly feedItems = signal<RssItem[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly searchQuery = signal<string>('');
  protected readonly customUrlInput = signal<string>('');
  
  // Computed states
  protected readonly currentDate = computed(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Filters feed items by the search query
  protected readonly filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.feedItems();
    if (!query) {
      return items;
    }
    return items.filter(item => 
      item.title?.toLowerCase().includes(query) || 
      item.description?.toLowerCase().includes(query) ||
      item.content?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadPresets();
  }

  // Load preset configurations dynamically at runtime
  private loadPresets(): void {
    this.isLoading.set(true);
    this.rssService.getPresets().subscribe({
      next: (data) => {
        this.presets.set(data);
        if (data.length > 0) {
          // Load the default feed (the first item from config)
          this.loadFeed(data[0].url);
        } else {
          this.isLoading.set(false);
          this.errorMessage.set('No feeds configured in presets.json');
        }
      },
      error: (err) => {
        console.error('Error loading presets.json:', err);
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load preset feeds list from configuration.');
      }
    });
  }

  // Load an RSS feed, checking local storage cache first
  protected loadFeed(url: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentFeedUrl.set(url);
    
    // Auto-populate the custom URL input text box if it's not a preset, or clear it if it is
    const isPreset = this.presets().some(p => p.url === url);
    if (!isPreset) {
      this.customUrlInput.set(url);
    } else {
      this.customUrlInput.set('');
    }

    // Cache key for this specific feed URL
    const cacheKey = `rss_cache_${url}`;
    
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const cache: CachedFeed = JSON.parse(cachedData);
        const ageMs = Date.now() - cache.timestamp;
        const oneHourMs = 1000 * 60 * 60;
        
        // If cache is less than an hour old, load it immediately
        if (ageMs < oneHourMs && cache.items && cache.items.length > 0) {
          console.log(`Using cached data for feed: ${url} (Age: ${Math.round(ageMs / 1000 / 60)} minutes)`);
          this.feedMeta.set(cache.feed);
          this.feedItems.set(cache.items);
          this.isLoading.set(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage cache:', e);
    }

    // Fetch from URL if local storage is empty or expired
    console.log(`Fetching feed from network: ${url}`);
    this.rssService.getFeed(url).subscribe({
      next: (response) => {
        if (response.status === 'ok') {
          // Slice up to 100 items from the feed
          const slicedItems = (response.items || []).slice(0, 100);
          
          this.feedMeta.set(response.feed);
          this.feedItems.set(slicedItems);
          
          // Write to local storage cache
          try {
            const cachePayload: CachedFeed = {
              timestamp: Date.now(),
              feed: response.feed,
              items: slicedItems
            };
            localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
          } catch (e) {
            console.warn('Error writing to localStorage cache:', e);
          }
        } else {
          this.errorMessage.set('Failed to parse feed. Please verify the URL.');
          this.feedMeta.set(null);
          this.feedItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching feed:', err);
        this.errorMessage.set('Could not fetch the RSS feed. The URL might be invalid or unreachable.');
        this.feedMeta.set(null);
        this.feedItems.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Submit custom feed URL
  protected loadCustomFeed(): void {
    const url = this.customUrlInput().trim();
    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        this.errorMessage.set('Please enter a valid URL starting with http:// or https://');
        return;
      }
      this.loadFeed(url);
    }
  }

  // Extract article thumbnail image
  protected getArticleImage(item: RssItem): string {
    if (item.thumbnail && !item.thumbnail.includes('placeholder')) {
      return item.thumbnail;
    }

    const htmlContent = item.description || item.content || '';
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = htmlContent.match(imgRegex);
    if (match && match[1]) {
      return match[1];
    }

    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60';
  }

  // Format single article dates
  protected formatArticleDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Clean description text from HTML tags for visual summary
  protected getCleanDescription(item: RssItem): string {
    const raw = item.description || item.content || '';
    let text = raw.replace(/<[^>]*>/g, '').trim();
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    if (text.toUpperCase() === item.title.toUpperCase()) {
      return '';
    }

    if (text.length > 130) {
      return text.substring(0, 130) + '...';
    }
    return text;
  }

  // Trust URL dynamically to prevent sanitization warnings in console
  protected getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
