"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Brush,
  Check,
  Clock,
  Compass,
  Crown,
  Layers,
  MapPin,
  Paintbrush,
  Palette,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { faNum, formatNumber, formatPrice, href, t } from "@/lib/utils";
import type { Artist, ArtistServiceItem } from "@/lib/types";

interface EnrichedArtistData extends Artist {
  featuredPattern?: { id: string; title: { fa: string; en: string }; image: string } | null;
  portfolioPreview: string[];
  counts: { patterns: number; projects: number; products?: number };
}

interface ArtistsHubViewProps {
  artists: EnrichedArtistData[];
  heroImage: string;
}

type DisciplineCategory = "all" | "patina" | "pattern" | "illustration" | "luxury" | "canvas";

export function ArtistsHubView({ artists, heroImage }: ArtistsHubViewProps) {
  const { locale, dict } = useLocale();
  const { user } = useAuth();
  const fa = locale === "fa";

  // Filter & Search state
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "projects" | "newest">("popular");
  const [onlyCommissions, setOnlyCommissions] = useState(false);

  // Following state for artists
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Commission / Inquiry modal state
  const [activeInquiryTarget, setActiveInquiryTarget] = useState<{
    artist: Artist;
    service?: ArtistServiceItem;
  } | null>(null);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null);

  // Toggle follow
  const toggleFollow = (artistId: string) => {
    setFollowingMap((prev) => ({ ...prev, [artistId]: !prev[artistId] }));
  };

  // Collect all unique services from all artists
  const allServices = useMemo(() => {
    const list: { artist: Artist; service: ArtistServiceItem }[] = [];
    artists.forEach((art) => {
      (art.services ?? []).forEach((srv) => {
        if (srv.active !== false) {
          list.push({ artist: art, service: srv });
        }
      });
    });
    return list;
  }, [artists]);

  // Filter and sort artists
  const filteredArtists = useMemo(() => {
    return artists
      .filter((artist) => {
        // Discipline filter
        if (selectedDiscipline !== "all") {
          const tags = artist.tags || [];
          const prof = (t(artist.profession, "fa") + " " + t(artist.profession, "en")).toLowerCase();
          const bio = (t(artist.bio, "fa") + " " + t(artist.bio, "en")).toLowerCase();

          if (selectedDiscipline === "patina") {
            const hasPatinaTag = tags.some((t) => t.includes("patina"));
            const hasPatinaText = prof.includes("پتینه") || bio.includes("پتینه") || prof.includes("patina") || bio.includes("patina");
            const hasPatinaService = (artist.services ?? []).some((s) => s.category === "patina");
            if (!hasPatinaTag && !hasPatinaText && !hasPatinaService) return false;
          } else if (selectedDiscipline === "pattern") {
            const hasPattern = tags.includes("geometric") || tags.includes("botanical") || tags.includes("floral") || prof.includes("کاغذدیواری") || prof.includes("طراح");
            if (!hasPattern) return false;
          } else if (selectedDiscipline === "illustration") {
            const hasIllustration = tags.includes("illustration") || tags.includes("kids") || prof.includes("تصویرگر");
            if (!hasIllustration) return false;
          } else if (selectedDiscipline === "luxury") {
            const hasLuxury = tags.includes("luxury") || tags.includes("persian") || tags.includes("ornament") || prof.includes("لوکس") || prof.includes("اسلیمی");
            if (!hasLuxury) return false;
          } else if (selectedDiscipline === "canvas") {
            const hasCanvas = tags.includes("mural") || tags.includes("decor") || (artist.services ?? []).some((s) => s.category === "canvas_art");
            if (!hasCanvas) return false;
          }
        }

        // Commission only filter
        if (onlyCommissions && !artist.acceptsCommissions && !(artist.services && artist.services.length > 0)) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const name = (t(artist.name, "fa") + " " + t(artist.name, "en")).toLowerCase();
          const prof = (t(artist.profession, "fa") + " " + t(artist.profession, "en")).toLowerCase();
          const loc = (t(artist.location, "fa") + " " + t(artist.location, "en")).toLowerCase();
          const tags = (artist.tags || []).join(" ").toLowerCase();
          const services = (artist.services || []).map((s) => t(s.title, "fa") + " " + t(s.title, "en")).join(" ").toLowerCase();

          const match = name.includes(q) || prof.includes(q) || loc.includes(q) || tags.includes(q) || services.includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "projects") return (b.counts.projects || 0) - (a.counts.projects || 0);
        if (sortBy === "newest") return b.id.localeCompare(a.id);
        return b.followers - a.followers; // default: popular
      });
  }, [artists, selectedDiscipline, searchQuery, sortBy, onlyCommissions]);

  // Featured artists (with active pro subscription or top followers)
  const featuredArtists = useMemo(() => {
    return artists.filter((a) => a.featured || a.subscription?.status === "active").slice(0, 3);
  }, [artists]);

  // Handle inquiry submit
  const handleInquirySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeInquiryTarget) return;

    setInquirySubmitting(true);
    const fd = new FormData(e.currentTarget);

    const payload = {
      artistId: activeInquiryTarget.artist.id,
      artistSlug: activeInquiryTarget.artist.slug,
      serviceId: activeInquiryTarget.service?.id,
      serviceTitle: activeInquiryTarget.service?.title,
      clientName: String(fd.get("clientName") || ""),
      clientPhone: String(fd.get("clientPhone") || ""),
      clientEmail: String(fd.get("clientEmail") || ""),
      projectType: String(fd.get("projectType") || "سفارش پروژه اختصاصی"),
      scopeOrDimensions: String(fd.get("dimensions") || ""),
      estimatedBudget: String(fd.get("budget") || ""),
      message: String(fd.get("message") || ""),
    };

    try {
      const res = await fetch("/api/artist/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok) {
        setInquirySuccess(fa ? "درخواست شما با موفقیت برای هنرمند ارسال گردید. تیم پشتیبانی و هنرمند ظرف ۲۴ ساعت آینده با شما تماس خواهند گرفت." : "Your commission inquiry was sent to the artist successfully. They will get back to you within 24 hours.");
        setTimeout(() => {
          setInquirySuccess(null);
          setActiveInquiryTarget(null);
        }, 3500);
      }
    } catch {
      alert(fa ? "خطا در ارسال درخواست. لطفاً مجدداً تلاش کنید." : "Failed to send request. Please try again.");
    } finally {
      setInquirySubmitting(false);
    }
  };

  const disciplines: { id: DisciplineCategory; labelFa: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: "all", labelFa: "همه رشته‌ها و اساتید", labelEn: "All Crafts & Masters", icon: <Compass className="h-3.5 w-3.5" /> },
    { id: "patina", labelFa: "پتینه و بافت دیوار", labelEn: "Wall Patina & Finishes", icon: <Paintbrush className="h-3.5 w-3.5" /> },
    { id: "pattern", labelFa: "طراحی پترن و سطح", labelEn: "Pattern & Surface", icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "illustration", labelFa: "تصویرسازی و چاپ پارچه", labelEn: "Illustration & Textile", icon: <Brush className="h-3.5 w-3.5" /> },
    { id: "luxury", labelFa: "نقوش لوکس و اسلیمی", labelEn: "Luxury & Ornament", icon: <Crown className="h-3.5 w-3.5" /> },
    { id: "canvas", labelFa: "تابلو و نقاشی دیواری", labelEn: "Canvas Art & Murals", icon: <Palette className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1. HERO SECTION                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-border bg-[#0b0e14] pt-[calc(var(--announce-h,0px)+var(--header-h))] text-white">
        {/* Background ambient lighting and pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/15 to-transparent pointer-events-none" />
        <div className="absolute -top-32 inset-inline-end-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 inset-inline-start-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl pointer-events-none" />

        <div className="container-x relative py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>{fa ? "جامعه برترین طراحان، اساتید پتینه و هنرمندان رزی آتلیه" : "Rosie Atelier Creator Community & Masters Hub"}</span>
              </div>

              {/* Title */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.2]">
                {fa ? (
                  <>
                    اساتید برتر <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/70">طراحی سطح</span>، پتینه و نقاشی دکوراتیو
                  </>
                ) : (
                  <>
                    Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/70">Surface Designers</span>, Patina Artisans & Fine Artists
                  </>
                )}
              </h1>

              {/* Description */}
              <p className="max-w-2xl text-base sm:text-lg text-white/80 leading-relaxed">
                {fa
                  ? "مجموعه‌ای منتخب از طراحان الگوهای تکرارشونده، مجریان پتینه و تکسچرهای لوکس، و هنرمندان نقاشی دکوراتیو. آثار دیجیتال را لایسنس کنید یا برای پروژه‌های مسکونی و هتل سفارش اختصاصی ثبت نمایید."
                  : "Curated directory of repeat pattern designers, luxury wall patina masters, and decorative painters. License exclusive digital patterns or commission bespoke finishes directly for your architectural spaces."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href={href(locale, "/creators/join")}
                  className="inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-medium transition-all hover:bg-accent/90 hover:scale-[1.02]"
                >
                  <Sparkles className="h-4 w-4" />
                  {fa ? "به عنوان هنرمند بپیوندید (غرفه اختصاصی)" : "Join as Creator (Exclusive Pro Hub)"}
                </Link>

                <a
                  href="#custom-services"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  <Briefcase className="h-4 w-4 text-accent" />
                  {fa ? "مشاهده خدمات و استعلام قیمت پتینه" : "Explore Patina & Custom Services"}
                </a>
              </div>

              {/* Statistics Strip */}
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-8 sm:grid-cols-4">
                {[
                  { value: fa ? "۵۰+" : "50+", label: fa ? "هنرمند تأیید شده" : "Verified Artists" },
                  { value: fa ? "۴" : "4", label: fa ? "رشته تخصصی (پتینه تا پترن)" : "Artistic Mediums" },
                  { value: fa ? "۷۰۰+" : "700+", label: fa ? "پروژه و لایسنس فعال" : "Projects & Licenses" },
                  { value: fa ? "۱۰۰٪" : "100%", label: fa ? "تضمین اصالت و تحویل" : "Authenticity Guarantee" },
                ].map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <p className="font-display text-2xl sm:text-3xl font-bold text-white tabular">{stat.value}</p>
                    <p className="text-xs text-white/65">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Right Visual: Master Artist Showcase Collage */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Main Featured Card */}
                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                    <Image
                      src={heroImage || "/images/collections/s01.jpg"}
                      alt="Rosie Atelier Artists"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 inset-inline-start-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow-sm">
                        <Crown className="h-3 w-3" />
                        {fa ? "اساتید برگزیده آتلیه" : "Featured Master Artists"}
                      </span>
                    </div>
                    <div className="absolute bottom-3 inset-inline-start-3 inset-inline-end-3 text-white">
                      <p className="text-sm font-semibold">{fa ? "هنرمندان دارای غرفه اقتصادی و ثبت سفارش مستقیم" : "Artists with Pro Storefronts & Custom Services"}</p>
                      <p className="text-xs text-white/75 mt-0.5">{fa ? "پتینه‌کاری لوکس · طراحی پترن انحصاری · تابلو نقاشی" : "Luxury Patina · Bespoke Patterns · Canvas Murals"}</p>
                    </div>
                  </div>

                  {/* Avatars Strip overlay */}
                  <div className="mt-3 flex items-center justify-between gap-2 px-1">
                    <div className="flex -space-x-2.5 rtl:space-x-reverse">
                      {artists.slice(0, 4).map((a) => (
                        <div key={a.id} className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-surface shadow-sm">
                          <Image src={a.avatar} alt={t(a.name, locale)} fill sizes="36px" className="object-cover" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-white/80">
                      {fa ? "پذیرش مستقیم سفارش بدون واسطه" : "Direct Client Commissions"}
                    </span>
                  </div>
                </div>

                {/* Floating Pro Badge Card */}
                <div className="absolute -bottom-5 -inset-inline-start-5 hidden sm:flex items-center gap-3 rounded-2xl border border-white/25 bg-surface/90 p-3.5 shadow-xl backdrop-blur-lg text-foreground">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{fa ? "پروفایل اقتصادی تأیید شده" : "Verified Pro Profile"}</p>
                    <p className="text-foreground-secondary">{fa ? "سفارش مستقیم و گارانتی تحویل" : "Direct Order & Delivery Guarantee"}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 2. DISCIPLINE TABS & SEARCH / FILTER CONTROLS                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="sticky top-[var(--header-h,4rem)] z-40 border-b border-border bg-surface/95 backdrop-blur-md shadow-soft">
        <div className="container-x py-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            
            {/* Discipline Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
              {disciplines.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedDiscipline(item.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                    selectedDiscipline === item.id
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-background-secondary text-foreground-secondary hover:bg-border/60 hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <span>{fa ? item.labelFa : item.labelEn}</span>
                </button>
              ))}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px] sm:w-64">
                <Search className="absolute inset-inline-start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={fa ? "جستجوی هنرمند، شهر، پتینه یا مهارت…" : "Search artist, city, patina, style…"}
                  className="h-9 w-full rounded-full border border-border bg-background ps-9 pe-8 text-xs placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-inline-end-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Commission Filter Toggle */}
              <button
                type="button"
                onClick={() => setOnlyCommissions((p) => !p)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                  onlyCommissions
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-foreground-secondary hover:border-foreground"
                }`}
                title={fa ? "فقط هنرمندانی که آماده دریافت سفارش پتینه و طراحی اختصاصی هستند" : "Artists accepting direct custom commissions"}
              >
                <Paintbrush className="h-3.5 w-3.5" />
                <span>{fa ? "پذیرش سفارش پتینه و آثار" : "Accepting Commissions"}</span>
              </button>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "popular" | "rating" | "projects" | "newest")}
                className="h-9 rounded-full border border-border bg-background px-3 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value="popular">{fa ? "محبوب‌ترین" : "Most Popular"}</option>
                <option value="rating">{fa ? "بالاترین امتیاز" : "Highest Rated"}</option>
                <option value="projects">{fa ? "بیشترین پروژه‌ها" : "Most Projects"}</option>
                <option value="newest">{fa ? "جدیدترین‌ها" : "Newest"}</option>
              </select>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 3. FEATURED PRO ARTISTS SPOTLIGHT                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="container-x py-14">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider">
              <Crown className="h-4 w-4" />
              <span>{fa ? "طراحان و اساتید برگزیده آتلیه" : "Master Creators & Pro Atelier Artists"}</span>
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-foreground">
              {fa ? "هنرمندان دارای غرفه اختصاصی و ثبت سفارش مستقیم" : "Featured Artists with Dedicated Pro Showcases"}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-foreground-secondary max-w-md">
            {fa
              ? "این اساتید علاوه بر الگوهای تکرارشونده، خدمات اجرای پتینه، نقاشی دیواری و طراحی اختصاصی را با گارانتی آتلیه ارائه می‌دهند."
              : "These creators offer custom wall patina, surface direction, and bespoke fine art alongside pattern licensing."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredArtists.map((artist, idx) => {
            const isFollowing = Boolean(followingMap[artist.id]);
            const artistUrl = href(locale, `/artists/${artist.slug}`);
            const topService = (artist.services ?? [])[0];

            return (
              <Reveal key={artist.id} delay={idx * 80}>
                <SpotlightCard className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-medium">
                  {/* Cover with previews */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-background-secondary">
                    <Image
                      src={artist.cover || artist.avatar}
                      alt={t(artist.name, locale)}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="img-zoom object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    
                    {/* Badge VIP */}
                    <div className="absolute top-3 inset-inline-start-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                        <Crown className="h-3 w-3" />
                        {artist.subscription?.badge ? t(artist.subscription.badge, locale) : (fa ? "هنرمند VIP" : "VIP Creator")}
                      </span>
                    </div>

                    {/* Rating top right */}
                    <div className="absolute top-3 inset-inline-end-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{locale === "fa" ? faNum(artist.rating) : artist.rating.toFixed(1)}</span>
                    </div>

                    {/* Thumbnails preview strip */}
                    <div className="absolute bottom-3 inset-inline-start-3 flex items-center gap-1.5">
                      {((artist.services ?? []).map((s) => s.image).concat(artist.portfolioPreview).slice(0, 3)).map((img, i) => (
                        <span key={i} className="relative h-9 w-9 overflow-hidden rounded-lg border border-white/40 shadow-sm">
                          <Image src={img} alt="" fill sizes="36px" className="object-cover" />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Avatar & Follow button */}
                      <div className="-mt-10 flex items-end justify-between gap-3">
                        <Link href={artistUrl} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-4 border-surface bg-surface shadow-medium ring-1 ring-black/5">
                          <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="64px" className="object-cover" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleFollow(artist.id)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                            isFollowing
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:border-foreground"
                          }`}
                        >
                          {isFollowing ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                          {isFollowing ? (fa ? "دنبال می‌کنید" : "Following") : (fa ? "دنبال کردن" : "Follow")}
                        </button>
                      </div>

                      {/* Name & Profession */}
                      <div className="mt-3">
                        <Link href={artistUrl} className="font-display text-lg font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5">
                          <span>{t(artist.name, locale)}</span>
                          <BadgeCheck className="h-4 w-4 text-accent fill-accent/20" />
                        </Link>
                        <p className="text-xs text-accent font-medium mt-0.5">{t(artist.profession, locale)}</p>
                        <p className="mt-2 line-clamp-2 text-xs text-foreground-secondary leading-relaxed">{t(artist.bio, locale)}</p>
                      </div>

                      {/* Custom Service highlight box */}
                      {topService && (
                        <div className="mt-3.5 rounded-2xl border border-accent/20 bg-accent/5 p-3 text-xs">
                          <div className="flex items-center justify-between font-semibold text-foreground">
                            <span className="flex items-center gap-1.5 text-accent">
                              <Paintbrush className="h-3.5 w-3.5" />
                              {t(topService.categoryLabel ?? { fa: "خدمت اختصاصی", en: "Custom Service" }, locale)}
                            </span>
                            <span className="text-foreground font-bold tabular">{formatPrice(topService.price, locale)}</span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-foreground-secondary text-[11px]">{t(topService.title, locale)}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-3.5">
                      <div className="flex items-center gap-3 text-xs text-foreground-secondary tabular">
                        <span><strong className="text-foreground font-semibold">{artist.counts.patterns}</strong> {fa ? "الگو" : "patterns"}</span>
                        <span><strong className="text-foreground font-semibold">{formatNumber(artist.followers, locale)}</strong> {fa ? "مخاطب" : "followers"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveInquiryTarget({ artist, service: topService })}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-foreground px-3 text-xs font-semibold text-background transition hover:bg-primary"
                        >
                          <Send className="h-3 w-3" />
                          <span>{fa ? "سفارش پتینه / اثر" : "Order / Quote"}</span>
                        </button>
                        <Link
                          href={artistUrl}
                          aria-label={dict.common.viewProfile}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:border-foreground"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 rtl-flip" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 4. ALL ARTISTS DIRECTORY GRID                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="container-x py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {fa ? `تمام هنرمندان و طراحان (${faNum(filteredArtists.length)})` : `All Artists & Creators (${filteredArtists.length})`}
          </h2>
          {selectedDiscipline !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedDiscipline("all")}
              className="text-xs font-medium text-accent hover:underline"
            >
              {fa ? "پاک کردن فیلتر" : "Clear filters"}
            </button>
          )}
        </div>

        {filteredArtists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center">
            <Palette className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-3 font-semibold text-foreground">{fa ? "هنرمندی با این مشخصات یافت نشد." : "No artists found."}</p>
            <p className="mt-1 text-xs text-foreground-secondary">{fa ? "لطفاً عبارت جستجو یا فیلترهای اعمال‌شده را تغییر دهید." : "Try adjusting your search terms or filters."}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setSelectedDiscipline("all"); setOnlyCommissions(false); }}>
              {fa ? "مشاهده همه هنرمندان" : "Show all artists"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredArtists.map((artist, i) => {
              const isFollowing = Boolean(followingMap[artist.id]);
              const artistUrl = href(locale, `/artists/${artist.slug}`);
              const hasServices = (artist.services ?? []).length > 0;

              return (
                <Reveal key={artist.id} delay={(i % 3) * 60}>
                  <SpotlightCard as="article" className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-medium">
                    {/* Cover strip */}
                    <Link href={artistUrl} className="relative block aspect-[16/10] overflow-hidden bg-background-secondary">
                      <Image
                        src={artist.cover || artist.avatar}
                        alt={t(artist.name, locale)}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="img-zoom object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                      
                      {/* Rating badge */}
                      {artist.rating > 0 && (
                        <div className="absolute inset-inline-end-3 top-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{locale === "fa" ? faNum(artist.rating) : artist.rating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Location badge */}
                      <div className="absolute inset-inline-start-3 top-3 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[11px] text-white/90">
                        <MapPin className="h-3 w-3" />
                        <span>{t(artist.location, locale)}</span>
                      </div>

                      {/* Thumbnails */}
                      <div className="absolute bottom-3 inset-inline-start-3 flex gap-1.5">
                        {((artist.services ?? []).map((s) => s.image).concat(artist.portfolioPreview).slice(0, 3)).map((src, k) => (
                          <span key={k} className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/40 shadow-sm">
                            <Image src={src} alt="" fill sizes="40px" className="object-cover" />
                          </span>
                        ))}
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="-mt-10 flex items-end justify-between gap-3">
                          <Link href={artistUrl} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-4 border-surface bg-surface shadow-medium">
                            <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="64px" className="object-cover" />
                          </Link>
                          
                          <button
                            type="button"
                            onClick={() => toggleFollow(artist.id)}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                              isFollowing
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-foreground hover:border-foreground"
                            }`}
                          >
                            {isFollowing ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                            {isFollowing ? (fa ? "دنبال می‌کنید" : "Following") : (fa ? "دنبال کردن" : "Follow")}
                          </button>
                        </div>

                        <div className="mt-3">
                          <Link href={artistUrl} className="font-display text-base font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5">
                            <span>{t(artist.name, locale)}</span>
                            {artist.subscription?.status === "active" && (
                              <span title={fa ? "هنرمند تأیید شده VIP" : "Verified VIP"}>
                                <BadgeCheck className="h-4 w-4 text-accent fill-accent/20" />
                              </span>
                            )}
                          </Link>
                          <p className="text-xs text-accent font-medium">{t(artist.profession, locale)}</p>
                          <p className="mt-2 line-clamp-2 text-xs text-foreground-secondary">{t(artist.bio, locale)}</p>
                        </div>

                        {/* Tags */}
                        {artist.tags && artist.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {artist.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-md border border-border bg-background-secondary px-2 py-0.5 text-[10px] text-foreground-secondary">
                                #{tag}
                              </span>
                            ))}
                            {hasServices && (
                              <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                                {fa ? "غرفه خدمات فعال" : "Pro Showcase"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Info & Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-xs text-foreground-secondary">
                        <div className="flex gap-3 tabular">
                          <span><strong className="text-foreground">{artist.counts.patterns}</strong> {fa ? "الگو" : "patterns"}</span>
                          <span><strong className="text-foreground">{formatNumber(artist.followers, locale)}</strong> {fa ? "مخاطب" : "followers"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasServices && (
                            <button
                              type="button"
                              onClick={() => setActiveInquiryTarget({ artist, service: artist.services?.[0] })}
                              className="inline-flex h-7 items-center gap-1 rounded-full bg-accent/10 px-2.5 text-[11px] font-semibold text-accent transition hover:bg-accent hover:text-white"
                            >
                              <Paintbrush className="h-3 w-3" />
                              <span>{fa ? "سفارش پتینه" : "Commission"}</span>
                            </button>
                          )}
                          <Link href={artistUrl} aria-label={dict.common.viewProfile} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition hover:border-foreground">
                            <ArrowUpRight className="h-3.5 w-3.5 rtl-flip" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 5. ARTISTS CUSTOM SERVICES & PATINA COMMISSIONS SHOWCASE       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section id="custom-services" className="border-t border-border bg-background-secondary/50 py-16">
        <div className="container-x">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent mb-2">
                <Paintbrush className="h-3.5 w-3.5" />
                <span>{fa ? "خدمات و سفارش‌های اختصاصی هنرمندان" : "Custom Services & Direct Commissions"}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {fa ? "سفارش مستقیم اجرای پتینه، بافت دیوار و طراحی الگو" : "Direct Commissions for Wall Patina & Bespoke Patterns"}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-foreground-secondary max-w-lg">
              {fa
                ? "معماران، طراحان داخلی و کارفرمایان می‌توانند برای پروژه‌های ساختمانی، مسکونی و تجاری مستقیماً با اساتید پتینه‌کاری و طراحان آتلیه وارد قرارداد شوند."
                : "Architects and homeowners can directly commission master artisans for Italian wall patina, bespoke wallpaper, and customized artworks."}
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allServices.map(({ artist, service }, idx) => (
              <Reveal key={service.id} delay={idx * 70}>
                <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-soft transition-all hover:shadow-medium">
                  <div>
                    {/* Service Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-background-secondary">
                      <Image
                        src={service.image}
                        alt={t(service.title, locale)}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="img-zoom object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      <div className="absolute top-3 inset-inline-start-3">
                        <span className="rounded-full bg-accent/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
                          {t(service.categoryLabel ?? { fa: "خدمت اختصاصی", en: "Custom Service" }, locale)}
                        </span>
                      </div>

                      {/* Turnaround Time */}
                      {service.deliveryTime && (
                        <div className="absolute bottom-3 inset-inline-start-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
                          <Clock className="h-3 w-3 text-accent" />
                          <span>{t(service.deliveryTime, locale)}</span>
                        </div>
                      )}
                    </div>

                    {/* Artist Header */}
                    <div className="mt-4 flex items-center gap-2.5">
                      <span className="relative h-8 w-8 overflow-hidden rounded-full border border-border">
                        <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="32px" className="object-cover" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{t(artist.name, locale)}</p>
                        <p className="text-[11px] text-foreground-secondary">{t(artist.profession, locale)}</p>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="mt-3 font-display text-base font-bold text-foreground leading-snug">
                      {t(service.title, locale)}
                    </h3>
                    <p className="mt-1.5 text-xs text-foreground-secondary leading-relaxed line-clamp-3">
                      {t(service.description, locale)}
                    </p>
                  </div>

                  {/* Price & CTA */}
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-xs text-foreground-secondary">
                        {service.priceUnit ? t(service.priceUnit, locale) : (fa ? "شروع قیمت از" : "Starting from")}
                      </span>
                      <span className="font-display text-base font-bold text-accent tabular">
                        {formatPrice(service.price, locale)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveInquiryTarget({ artist, service })}
                        className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background transition hover:bg-primary"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{fa ? "استعلام قیمت و ثبت سفارش" : "Request Quote & Order"}</span>
                      </button>
                      <Link
                        href={href(locale, `/artists/${artist.slug}`)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition hover:border-foreground"
                        title={fa ? "مشاهده پروفایل هنرمند" : "View Artist"}
                      >
                        <ArrowUpRight className="h-4 w-4 rtl-flip" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 6. ARTIST PRO MEMBERSHIP & SUBSCRIPTION HUB SECTION             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border bg-[#0b0e14] py-20 text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 inset-inline-end-1/4 h-80 w-80 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

        <div className="container-x relative">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-accent backdrop-blur-md">
              <Crown className="h-4 w-4" />
              <span>{fa ? "پلن‌های اشتراک و عضویت ویژه هنرمندان طراح" : "Artist Pro Membership & Exclusive Storefront"}</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {fa ? "غرفه اختصاصی خود را بسازید و هر اثر هنری را به فروش برسانید" : "Build Your Dedicated Showcase & Sell Any Artistic Craft"}
            </h2>
            <p className="text-sm sm:text-base text-white/75 leading-relaxed">
              {fa
                ? "با اشتراک هنرمند طراح، علاوه بر فروش فایل‌های دیجیتال و پترن‌ها، غرفه اختصاصی در صفحه هنرمندان دریافت کرده و خدمات پتینه، نقاشی سفارشی و کارهای دست‌ساز را مستقیماً به معماران و مشتریان ارائه دهید."
                : "With an Artist Pro subscription, unlock your dedicated storefront on the Artists Hub. Sell physical works, patina executions, and custom commissions with zero friction."}
            </p>
          </div>

          {/* Pricing / Tier Cards */}
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {/* 1. Basic Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">{fa ? "عضویت پایه" : "Basic Tier"}</span>
                <h3 className="mt-1 font-display text-xl font-bold text-white">{fa ? "طراح عضو" : "Member Creator"}</h3>
                <p className="mt-2 text-2xl font-bold text-white">{fa ? "رایگان" : "Free"}</p>
                <p className="mt-2 text-xs text-white/70 leading-relaxed">
                  {fa ? "مناسب طراحانی که فقط قصد فروش الگو در مارکت‌پلیس را دارند." : "For creators selling digital repeat patterns in the marketplace."}
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-white/85">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "فروش پترن و وکتور دیجیتال" : "Sell digital pattern files"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "پروفایل عمومی ساده" : "Basic public profile"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "کارمزد استاندارد پلتفرم" : "Standard platform commission"}</li>
                  <li className="flex items-center gap-2 text-white/40"><X className="h-4 w-4" />{fa ? "بدون غرفه فروش پتینه و خدمات" : "No custom patina storefront"}</li>
                </ul>
              </div>

              <Link
                href={href(locale, "/creators/join")}
                className="mt-8 inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                {fa ? "ثبت‌نام رایگان" : "Register Free"}
              </Link>
            </div>

            {/* 2. Pro Artist Plan (Featured) */}
            <div className="relative flex flex-col justify-between rounded-3xl border-2 border-accent bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="absolute -top-3.5 inset-inline-end-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-white shadow-md">
                  <Sparkles className="h-3 w-3" />
                  {fa ? "پرطرفدارترین انتخاب هنرمندان" : "Most Popular"}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">{fa ? "عضویت حرفه‌ای" : "Pro Tier"}</span>
                <h3 className="mt-1 font-display text-xl font-bold text-white">{fa ? "هنرمند طراح Pro" : "Artist Pro"}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{fa ? "۲۹۰٬۰۰۰" : "$9"}</span>
                  <span className="text-xs text-white/70">{fa ? "تومان / ماه" : "/ month"}</span>
                </div>
                <p className="mt-2 text-xs text-white/80 leading-relaxed">
                  {fa ? "غرفه اختصاصی در صفحه هنرمندان، امکان فروش پتینه و دریافت سفارش مستقیم." : "Dedicated storefront on the Artists Hub, custom patina & commissions enabled."}
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-white/90">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "غرفه اختصاصی و تب خدمات در صفحه هنرمندان" : "Dedicated Pro Showcase tab"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "امکان فروش پتینه، نقاشی و سفارش اختصاصی" : "Sell patina, murals & bespoke crafts"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "دریافت مستقیم استعلام‌ها و شماره تماس کارفرما" : "Direct client leads & project inquiries"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "نشان تأیید VIP Pro در صفحه هنرمندان" : "VIP Verified Badge on directory"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "کارمزد صفر روی پروژه‌های اجرایی مستقیم" : "0% commission on direct client contracts"}</li>
                </ul>
              </div>

              <Link
                href={href(locale, "/creators/join?plan=pro")}
                className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent text-xs font-bold text-white shadow-medium transition hover:bg-accent/90 hover:scale-[1.02]"
              >
                <Crown className="h-4 w-4" />
                {fa ? "شروع عضویت Pro و راه‌اندازی غرفه" : "Unlock Pro Showcase"}
              </Link>
            </div>

            {/* 3. Studio VIP Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">{fa ? "عضویت استودیو و اساتید" : "Studio Master"}</span>
                <h3 className="mt-1 font-display text-xl font-bold text-white">{fa ? "استودیو VIP" : "Studio VIP"}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{fa ? "۶۹۰٬۰۰۰" : "$24"}</span>
                  <span className="text-xs text-white/70">{fa ? "تومان / ماه" : "/ month"}</span>
                </div>
                <p className="mt-2 text-xs text-white/70 leading-relaxed">
                  {fa ? "معرفی اختصاصی به پروژه‌های بزرگ معماری، هتل‌سازی و تالارها." : "Direct introduction to luxury architectural and hospitality developments."}
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-white/85">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "تمام امکانات پلن Pro" : "All Pro features included"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "جایگاه ویژه در صدر صفحه هنرمندان" : "Top featured ranking on directory"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "معرفی به پروژه‌های معماری هتل و لوکس" : "Hospitality & luxury project dispatch"}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />{fa ? "پشتیبانی اختصاصی VIP مدیر مارکت‌پلیس" : "Dedicated VIP account manager"}</li>
                </ul>
              </div>

              <Link
                href={href(locale, "/creators/join?plan=studio")}
                className="mt-8 inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                {fa ? "انتخاب پلن استودیو" : "Select Studio VIP"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 7. COMMISSION INQUIRY MODAL                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeInquiryTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              type="button"
              onClick={() => setActiveInquiryTarget(null)}
              className="absolute top-4 inset-inline-end-4 flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary text-foreground hover:bg-border"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-border">
                <Image
                  src={activeInquiryTarget.artist.avatar}
                  alt={t(activeInquiryTarget.artist.name, locale)}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <div>
                <p className="text-xs text-accent font-semibold">{fa ? "استعلام قیمت و ثبت سفارش مستقیم" : "Request Quote & Custom Order"}</p>
                <h3 className="font-display text-base font-bold text-foreground">{t(activeInquiryTarget.artist.name, locale)}</h3>
                {activeInquiryTarget.service && (
                  <p className="text-xs text-foreground-secondary">{t(activeInquiryTarget.service.title, locale)}</p>
                )}
              </div>
            </div>

            {inquirySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-7 w-7" />
                </div>
                <h4 className="font-display text-lg font-bold text-foreground">{fa ? "درخواست با موفقیت ثبت شد" : "Inquiry Submitted"}</h4>
                <p className="text-xs text-foreground-secondary leading-relaxed px-4">{inquirySuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "نام و نام خانوادگی شما" : "Your Name"}</label>
                    <input
                      type="text"
                      name="clientName"
                      required
                      defaultValue={user?.name || ""}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "شماره تماس همراه" : "Phone Number"}</label>
                    <input
                      type="tel"
                      name="clientPhone"
                      required
                      dir="ltr"
                      placeholder="0912..."
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "ایمیل (اختیاری)" : "Email (Optional)"}</label>
                    <input
                      type="email"
                      name="clientEmail"
                      dir="ltr"
                      defaultValue={user?.email || ""}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "نوع پروژه / فضا" : "Project / Space Type"}</label>
                    <select
                      name="projectType"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    >
                      <option value="پتینه و بافت دیوار مسکونی">{fa ? "پتینه و بافت دیوار مسکونی" : "Residential Wall Patina"}</option>
                      <option value="طراحی پترن و کاغذدیواری اختصاصی">{fa ? "طراحی پترن و کاغذدیواری اختصاصی" : "Bespoke Wallpaper Pattern"}</option>
                      <option value="پروژه هتل، کافه یا فضای تجاری">{fa ? "پروژه هتل، کافه یا فضای تجاری" : "Hospitality / Commercial Project"}</option>
                      <option value="تابلوی نقاشی سفارشی بوم">{fa ? "تابلوی نقاشی سفارشی بوم" : "Custom Canvas Fine Art"}</option>
                      <option value="مشاوره پالت رنگ و طراحی متریال">{fa ? "مشاوره پالت رنگ و طراحی متریال" : "Art Direction Consultation"}</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "متراژ یا ابعاد تقریبی" : "Approximate Dimensions / Sq.m"}</label>
                    <input
                      type="text"
                      name="dimensions"
                      placeholder={fa ? "مثلاً ۳۰ متر مربع یا ابعاد ۱۲۰×۸۰" : "e.g. 30 sq.m or 120x80cm"}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "بودجه تخمینی (تومان)" : "Estimated Budget"}</label>
                    <input
                      type="text"
                      name="budget"
                      placeholder={fa ? "مثلاً ۱۵ تا ۲۰ میلیون" : "e.g. $500 - $1000"}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{fa ? "توضیحات و نیازمندی‌های پروژه" : "Project Details & Scope"}</label>
                  <textarea
                    name="message"
                    required
                    rows={3}
                    placeholder={fa ? "درباره سبک مورد نظر، زمان‌بندی، شهر محل اجرا و مشخصات دیوار یا پروژه بنویسید…" : "Describe your timeline, location, aesthetic preferences…"}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveInquiryTarget(null)}>
                    {fa ? "انصراف" : "Cancel"}
                  </Button>
                  <Button type="submit" size="sm" disabled={inquirySubmitting} className="min-w-28">
                    {inquirySubmitting ? (fa ? "در حال ارسال…" : "Sending…") : (fa ? "ارسال درخواست" : "Send Inquiry")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
