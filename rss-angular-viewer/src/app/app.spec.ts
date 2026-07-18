import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { RssService } from './rss.service';

const mockRssService = {
  getPresets: () => of([
    {
      name: 'Test Feed',
      url: 'https://test-feed.com/rss',
      category: 'Test',
      logo: 'https://test-feed.com/logo.png'
    }
  ]),
  getFeed: (url: string) => of({
    status: 'ok',
    feed: {
      url: url,
      title: 'Test Feed Title',
      link: 'https://test-feed.com',
      author: '',
      description: 'Test Feed Description',
      image: 'https://test-feed.com/logo.png'
    },
    items: [
      {
        title: 'Test Item 1',
        pubDate: '2026-07-03 12:00:00',
        link: 'https://test-feed.com/item-1',
        guid: 'item-1',
        author: '',
        thumbnail: '',
        description: 'Test Item 1 Description',
        content: '',
        categories: []
      }
    ]
  })
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: RssService, useValue: mockRssService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render brand title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('NewsLens');
  });
});
