import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/content/site';

// Policy: public marketing site, so every search, citation and training crawler is welcome.
const SEARCH = ['Googlebot', 'Bingbot', 'Applebot', 'DuckDuckBot'];
const AI_SEARCH = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];
const AI_TRAINING = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: SEARCH, allow: '/' },
      { userAgent: AI_SEARCH, allow: '/' },
      { userAgent: AI_TRAINING, allow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
