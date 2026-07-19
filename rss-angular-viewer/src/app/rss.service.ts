import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RssFeed {
  url: string;
  title: string;
  link: string;
  author: string;
  description: string;
  image: string;
}

export interface RssItem {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string;
  categories: string[];
}

export interface RssResponse {
  status: string;
  feed: RssFeed;
  items: RssItem[];
}

export interface PresetFeed {
  name: string;
  url: string;
  category: string;
  logo: string;
}

interface AllOriginsResponse {
  contents: string;
  status: {
    url: string;
    content_type: string;
    http_code: number;
    response_time: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RssService {
  private http = inject(HttpClient);
  private proxyUrl = 'https://api.allorigins.win/get?url=';

  // Loads presets config dynamically from static assets
  getPresets(): Observable<PresetFeed[]> {
    return this.http.get<PresetFeed[]>('presets.json');
  }

  // Fetches XML wrapped in JSON via CORS proxy and parses client-side
  getFeed(feedUrl: string): Observable<RssResponse> {
    // const url = `${this.proxyUrl}${encodeURIComponent(feedUrl)}`;
    return this.http.get<AllOriginsResponse>(feedUrl).pipe(
      map(response => this.parseRssXml(response.contents, feedUrl))
    );
  }

  // Parser using browser-native DOMParser for RSS and Atom
  private parseRssXml(xmlString: string, feedUrl: string): RssResponse {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for XML parser errors
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      throw new Error('XML parsing error: ' + parserError.textContent);
    }

    const isAtom = xmlDoc.getElementsByTagName('feed').length > 0;
    
    if (isAtom) {
      const feedEl = xmlDoc.getElementsByTagName('feed')[0];
      const feedTitle = feedEl.getElementsByTagName('title')[0]?.textContent || '';
      const feedLinkEl = feedEl.getElementsByTagName('link')[0];
      const feedLink = feedLinkEl ? feedLinkEl.getAttribute('href') || '' : '';
      const feedDesc = feedEl.getElementsByTagName('subtitle')[0]?.textContent || '';
      const feedLogo = feedEl.getElementsByTagName('logo')[0]?.textContent || 
                       feedEl.getElementsByTagName('icon')[0]?.textContent || '';
      
      const feedMeta: RssFeed = {
        url: feedUrl,
        title: feedTitle,
        link: feedLink,
        author: '',
        description: feedDesc,
        image: feedLogo
      };

      const entryNodes = xmlDoc.getElementsByTagName('entry');
      const items: RssItem[] = [];
      
      for (let i = 0; i < entryNodes.length; i++) {
        const entryEl = entryNodes[i];
        const title = entryEl.getElementsByTagName('title')[0]?.textContent || '';
        
        const linkEl = entryEl.getElementsByTagName('link')[0];
        let link = '';
        if (linkEl) {
          link = linkEl.getAttribute('href') || '';
          if (entryEl.getElementsByTagName('link').length > 1) {
            for (let j = 0; j < entryEl.getElementsByTagName('link').length; j++) {
              const l = entryEl.getElementsByTagName('link')[j];
              if (l.getAttribute('rel') === 'alternate') {
                link = l.getAttribute('href') || link;
                break;
              }
            }
          }
        }
        
        const pubDate = entryEl.getElementsByTagName('published')[0]?.textContent || 
                        entryEl.getElementsByTagName('updated')[0]?.textContent || '';
        
        const summary = entryEl.getElementsByTagName('summary')[0]?.textContent || '';
        const content = entryEl.getElementsByTagName('content')[0]?.textContent || '';
        
        let thumbnail = '';
        const mediaEl = entryEl.getElementsByTagName('media:thumbnail')[0] || 
                        entryEl.getElementsByTagName('thumbnail')[0] ||
                        entryEl.getElementsByTagNameNS('*', 'thumbnail')[0];
        if (mediaEl) {
          thumbnail = mediaEl.getAttribute('url') || '';
        }
        
        if (!thumbnail) {
          const html = summary || content;
          const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match && match[1]) {
            thumbnail = match[1];
          }
        }

        items.push({
          title,
          pubDate,
          link,
          guid: entryEl.getElementsByTagName('id')[0]?.textContent || link,
          author: entryEl.getElementsByTagName('author')[0]?.getElementsByTagName('name')[0]?.textContent || '',
          thumbnail,
          description: summary,
          content,
          categories: []
        });
      }

      return {
        status: 'ok',
        feed: feedMeta,
        items
      };

    } else {
      // RSS 2.0 / 1.0 / 0.9
      const channelEl = xmlDoc.getElementsByTagName('channel')[0];
      if (!channelEl) {
        throw new Error('Invalid RSS feed structure (no channel element found)');
      }

      const feedTitle = channelEl.getElementsByTagName('title')[0]?.textContent || '';
      const feedLink = channelEl.getElementsByTagName('link')[0]?.textContent || '';
      const feedDesc = channelEl.getElementsByTagName('description')[0]?.textContent || '';
      
      const imageEl = channelEl.getElementsByTagName('image')[0];
      let feedLogo = '';
      if (imageEl) {
        feedLogo = imageEl.getElementsByTagName('url')[0]?.textContent || '';
      }

      const feedMeta: RssFeed = {
        url: feedUrl,
        title: feedTitle,
        link: feedLink,
        author: '',
        description: feedDesc,
        image: feedLogo
      };

      const itemNodes = xmlDoc.getElementsByTagName('item');
      const items: RssItem[] = [];

      for (let i = 0; i < itemNodes.length; i++) {
        const itemEl = itemNodes[i];
        const title = itemEl.getElementsByTagName('title')[0]?.textContent || '';
        const link = itemEl.getElementsByTagName('link')[0]?.textContent || '';
        const pubDate = itemEl.getElementsByTagName('pubDate')[0]?.textContent || 
                        itemEl.getElementsByTagName('pubdate')[0]?.textContent || '';
        const description = itemEl.getElementsByTagName('description')[0]?.textContent || '';
        const content = itemEl.getElementsByTagName('content:encoded')[0]?.textContent || '';

        // Extract thumbnail image URL
        let thumbnail = '';
        let mediaEl = itemEl.getElementsByTagName('media:thumbnail')[0] || 
                      itemEl.getElementsByTagName('thumbnail')[0] ||
                      itemEl.getElementsByTagNameNS('*', 'thumbnail')[0];
        if (mediaEl) {
          thumbnail = mediaEl.getAttribute('url') || '';
        }

        if (!thumbnail) {
          mediaEl = itemEl.getElementsByTagName('media:content')[0] ||
                    itemEl.getElementsByTagName('content')[0] ||
                    itemEl.getElementsByTagNameNS('*', 'content')[0];
          if (mediaEl) {
            thumbnail = mediaEl.getAttribute('url') || '';
          }
        }

        if (!thumbnail) {
          const enclosureEl = itemEl.getElementsByTagName('enclosure')[0];
          if (enclosureEl && enclosureEl.getAttribute('type')?.startsWith('image/')) {
            thumbnail = enclosureEl.getAttribute('url') || '';
          }
        }

        if (!thumbnail) {
          const match = description.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match && match[1]) {
            thumbnail = match[1];
          }
        }

        items.push({
          title,
          pubDate,
          link,
          guid: itemEl.getElementsByTagName('guid')[0]?.textContent || link,
          author: itemEl.getElementsByTagName('author')[0]?.textContent || 
                  itemEl.getElementsByTagName('dc:creator')[0]?.textContent || '',
          thumbnail,
          description,
          content,
          categories: []
        });
      }

      return {
        status: 'ok',
        feed: feedMeta,
        items
      };
    }
  }
}
