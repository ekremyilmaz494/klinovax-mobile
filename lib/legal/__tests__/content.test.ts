import { LEGAL_CONTENT, type LegalSlug } from '../content';

const SLUGS: LegalSlug[] = ['kvkk', 'terms', 'privacy'];

describe('LEGAL_CONTENT', () => {
  it('üç slug için de doküman içerir', () => {
    for (const slug of SLUGS) {
      expect(LEGAL_CONTENT[slug]).toBeDefined();
    }
  });

  it('her dokümanın başlığı ve en az bir dolu bölümü var', () => {
    for (const slug of SLUGS) {
      const doc = LEGAL_CONTENT[slug];
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const section of doc.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        // Her bölüm ya paragraf ya da madde listesi taşımalı (boş bölüm olmamalı).
        const hasBody = (section.body?.length ?? 0) > 0;
        const hasItems = (section.items?.length ?? 0) > 0;
        expect(hasBody || hasItems).toBe(true);
      }
    }
  });
});
