import { describe, expect, it } from 'vitest';
import { validateErmDocument } from '../model/ermFile.ts';
import { getBlogExampleDocument } from './blogExamples.ts';
import { BLOG_POSTS, getBlogPostBySlug } from './blogPosts.ts';

describe('blogPosts SEO & examples', () => {
  it('contains exactly 50 unique blog posts in DE and EN', () => {
    expect(BLOG_POSTS).toHaveLength(50);
    const slugs = new Set(BLOG_POSTS.map((p) => p.slug));
    expect(slugs.size).toBe(50);

    for (const post of BLOG_POSTS) {
      expect(post.de.title.length).toBeGreaterThan(10);
      expect(post.en.title.length).toBeGreaterThan(10);
      expect(post.de.sections.length).toBeGreaterThanOrEqual(3);
      expect(post.en.sections.length).toBeGreaterThanOrEqual(3);
      expect(getBlogPostBySlug(post.slug)).toBe(post);
    }
  });

  it('provides valid DE and EN ErmDocument examples for every post', () => {
    for (const post of BLOG_POSTS) {
      const docDe = getBlogExampleDocument(post.exampleKey, 'de');
      const docEn = getBlogExampleDocument(post.exampleKey, 'en');
      expect(() => validateErmDocument(docDe)).not.toThrow();
      expect(() => validateErmDocument(docEn)).not.toThrow();
      expect(docDe.nodes.length).toBeGreaterThanOrEqual(5);
      expect(docEn.edges.length).toBeGreaterThanOrEqual(4);
    }
  });
});
