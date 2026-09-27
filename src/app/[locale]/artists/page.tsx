import type { Metadata } from "next";
import { ArtistsHubView } from "@/components/artist/ArtistsHubView";
import { artistStats, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const d = dictionaries[locale];
  return {
    title: `${d.nav.artists} | ${d.brand}`,
    description: d.home.artistsDesc,
  };
}

export default async function ArtistsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();

  const artists = site.artists.map((a) => {
    const s = artistStats(site, a.id);
    const portfolioImages = s.portfolios.map((pf) => pf.cover).filter(Boolean);
    const patternImages = s.patterns.map((p) => p.image).filter(Boolean);
    const serviceImages = (a.services ?? []).map((srv) => srv.image).filter(Boolean);
    const allPreviews = Array.from(new Set([...serviceImages, ...patternImages, ...portfolioImages]));

    return {
      ...a,
      featuredPattern: s.patterns[0]
        ? {
            id: s.patterns[0].id,
            title: s.patterns[0].title,
            image: s.patterns[0].image,
          }
        : null,
      portfolioPreview: allPreviews.slice(0, 4),
      counts: {
        patterns: s.patterns.length,
        projects: s.portfolios.length,
        products: s.products.length,
      },
    };
  });

  const heroImage = site.artists[1]?.cover || site.artists[0]?.cover || site.hero.image;

  return <ArtistsHubView artists={artists} heroImage={heroImage} />;
}
