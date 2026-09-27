"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  Clock,
  Paintbrush,
  Send,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { PortfolioCard, type PortfolioCardData } from "@/components/cards/PortfolioCard";
import { EducationCard, type EducationCardData } from "@/components/cards/EducationCard";
import { StyleCard } from "@/components/cards/StyleCard";
import { faNum, formatPrice, href, t } from "@/lib/utils";
import type { Artist, ArtistServiceItem, Collection } from "@/lib/types";

interface Props {
  artist?: Artist;
  patterns: PatternCardData[];
  products: ProductCardData[];
  portfolios: PortfolioCardData[];
  education: EducationCardData[];
  collections: Collection[];
  reviews: { name: string; text: string; rating: number }[];
  services?: ArtistServiceItem[];
}

export function ProfileTabs({
  artist,
  patterns,
  products,
  portfolios,
  education,
  collections,
  reviews,
  services = [],
}: Props) {
  const { locale, dict } = useLocale();
  const { user } = useAuth();
  const fa = locale === "fa";

  const artistServices = services.length > 0 ? services : artist?.services ?? [];

  const tabs = [
    ...(artistServices.length > 0
      ? [
          {
            id: "services",
            label: fa ? "غرفه و خدمات اختصاصی (پتینه و آثار)" : "Pro Showcase & Services",
            count: artistServices.length,
          },
        ]
      : []),
    { id: "patterns", label: dict.nav.patterns, count: patterns.length },
    { id: "products", label: dict.common.products, count: products.length },
    ...(portfolios.length ? [{ id: "portfolios", label: dict.nav.portfolio, count: portfolios.length }] : []),
    { id: "collections", label: dict.nav.collections, count: collections.length },
    { id: "education", label: dict.nav.education, count: education.length },
    { id: "reviews", label: dict.common.reviews, count: reviews.length },
  ];

  const defaultTab = artistServices.length > 0 ? "services" : patterns.length ? "patterns" : "products";
  const [tab, setTab] = useState(defaultTab);

  // Inquiry modal state
  const [inquiryService, setInquiryService] = useState<ArtistServiceItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openInquiry = (service: ArtistServiceItem) => {
    setInquiryService(service);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleInquirySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!artist) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const payload = {
      artistId: artist.id,
      artistSlug: artist.slug,
      serviceId: inquiryService?.id,
      serviceTitle: inquiryService?.title,
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
        setSuccessMsg(
          fa
            ? "درخواست شما با موفقیت برای هنرمند ثبت گردید. به‌زودی با شما تماس حاصل خواهد شد."
            : "Your inquiry was sent to the artist successfully. They will contact you shortly.",
        );
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg(null);
        }, 3000);
      }
    } catch {
      alert(fa ? "خطا در ارسال استعلام." : "Error submitting inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-x mt-12">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      
      <div key={tab} className="anim-fade-up py-10">
        
        {/* ══ Services & Pro Showcase Tab ════════════════════════════ */}
        {tab === "services" && (
          <div className="space-y-8">
            {/* VIP Guarantee & Pro Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-accent/30 bg-accent/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {fa ? "غرفه اختصاصی و ثبت سفارش مستقیم هنرمند" : "Artist Pro Showcase & Direct Commissions"}
                    </h3>
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                      {artist?.subscription?.badge ? t(artist.subscription.badge, locale) : (fa ? "تأیید شده" : "Verified")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-secondary leading-relaxed">
                    {artist?.commissionNotice
                      ? t(artist.commissionNotice, locale)
                      : fa
                        ? "این هنرمند دارای پروفایل اقتصادی فعال بوده و امکان سفارش مستقیم اجرای پتینه، طراحی الگو و آثار دست‌ساز با گارانتی کیفیت وجود دارد."
                        : "This creator is actively accepting direct commissions for wall patina, bespoke pattern designs, and fine art."}
                  </p>
                </div>
              </div>

              {artistServices.length > 0 && (
                <button
                  type="button"
                  onClick={() => openInquiry(artistServices[0])}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-accent px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-accent/90"
                >
                  <Send className="h-4 w-4" />
                  <span>{fa ? "استعلام قیمت و ثبت پروژه" : "Request Custom Quote"}</span>
                </button>
              )}
            </div>

            {/* Custom Services Grid */}
            {artistServices.length === 0 ? (
              <EmptyState
                title={fa ? "خدمات اختصاصی ثبت نشده است." : "No custom services listed yet."}
                description={fa ? "این هنرمند به‌زودی نمونه‌کارهای پتینه و خدمات خود را اضافه خواهد کرد." : "This creator will add custom patina and design services soon."}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {artistServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-soft transition-all hover:shadow-medium"
                  >
                    <div>
                      {/* Service Cover */}
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

                        {service.deliveryTime && (
                          <div className="absolute bottom-3 inset-inline-start-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
                            <Clock className="h-3 w-3 text-accent" />
                            <span>{t(service.deliveryTime, locale)}</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="mt-4 font-display text-base font-bold text-foreground leading-snug">
                        {t(service.title, locale)}
                      </h3>
                      <p className="mt-1.5 text-xs text-foreground-secondary leading-relaxed line-clamp-3">
                        {t(service.description, locale)}
                      </p>
                    </div>

                    {/* Pricing and Action */}
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xs text-foreground-secondary">
                          {service.priceUnit ? t(service.priceUnit, locale) : (fa ? "شروع قیمت از" : "Starting from")}
                        </span>
                        <span className="font-display text-base font-bold text-accent tabular">
                          {formatPrice(service.price, locale)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openInquiry(service)}
                        className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-xs font-semibold text-background transition hover:bg-primary"
                      >
                        <Paintbrush className="h-3.5 w-3.5" />
                        <span>{fa ? "استعلام قیمت و ثبت سفارش" : "Request Quote / Order"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ Patterns Tab ═══════════════════════════════════════════ */}
        {tab === "patterns" &&
          (patterns.length ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
              {patterns.map((p) => (
                <PatternCard key={p.id} pattern={p} />
              ))}
            </div>
          ) : (
            <EmptyState />
          ))}

        {/* ══ Products Tab ═══════════════════════════════════════════ */}
        {tab === "products" &&
          (products.length ? (
            <div className="grid gap-5 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState />
          ))}

        {/* ══ Portfolios Tab ═════════════════════════════════════════ */}
        {tab === "portfolios" &&
          (portfolios.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {portfolios.map((p) => (
                <div key={p.id} className="aspect-[16/10]">
                  <PortfolioCard item={p} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          ))}

        {/* ══ Collections Tab ════════════════════════════════════════ */}
        {tab === "collections" &&
          (collections.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((c) => (
                <StyleCard
                  key={c.id}
                  href={href(locale, `/collections/${c.slug}`)}
                  title={t(c.title, locale)}
                  description={t(c.description, locale)}
                  image={c.cover}
                  className="aspect-[4/3]"
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          ))}

        {/* ══ Education Tab ══════════════════════════════════════════ */}
        {tab === "education" &&
          (education.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {education.map((e) => (
                <EducationCard key={e.id} item={e} />
              ))}
            </div>
          ) : (
            <EmptyState />
          ))}

        {/* ══ Reviews Tab ════════════════════════════════════════════ */}
        {tab === "reviews" && (
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r, i) => (
              <li key={i} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-foreground">{r.name}</p>
                  <span className="inline-flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className={`h-3.5 w-3.5 ${k < r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
                      />
                    ))}
                  </span>
                </div>
                <p className="mt-2 text-xs text-foreground-secondary leading-relaxed">{r.text}</p>
                <p className="mt-2 text-[11px] text-muted tabular">{locale === "fa" ? faNum(2026 - i) : 2026 - i}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ══ Modal for Direct Commission Inquiry ══════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 inset-inline-end-4 flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary text-foreground hover:bg-border"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Paintbrush className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {fa ? "استعلام قیمت و ثبت سفارش مستقیم" : "Request Custom Quote"}
                </h3>
                {inquiryService && (
                  <p className="text-xs text-accent font-medium">{t(inquiryService.title, locale)}</p>
                )}
              </div>
            </div>

            {successMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-display text-base font-bold text-foreground">{fa ? "درخواست با موفقیت ثبت شد" : "Inquiry Sent"}</h4>
                <p className="text-xs text-foreground-secondary px-4">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="mt-4 space-y-4">
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
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "نوع پروژه / فضا" : "Project Type"}</label>
                    <input
                      type="text"
                      name="projectType"
                      defaultValue={inquiryService ? t(inquiryService.title, locale) : (fa ? "اجرای پتینه / طراحی پترن" : "Patina / Custom Design")}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "متراژ یا ابعاد تقریبی" : "Dimensions / Sq.m"}</label>
                    <input
                      type="text"
                      name="dimensions"
                      placeholder={fa ? "مثلاً ۲۵ متر مربع" : "e.g. 25 sq.m"}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{fa ? "بودجه تخمینی (تومان)" : "Budget"}</label>
                    <input
                      type="text"
                      name="budget"
                      placeholder={fa ? "مثلاً ۱۰ تا ۱۵ میلیون" : "e.g. $500"}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">{fa ? "توضیحات و نیازمندی‌های پروژه" : "Project Details"}</label>
                  <textarea
                    name="message"
                    required
                    rows={3}
                    placeholder={fa ? "درباره سبک مورد نظر، شهر محل پروژه و مشخصات دیوار یا طرح بنویسید…" : "Describe your project timeline, location and specs…"}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                    {fa ? "انصراف" : "Cancel"}
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting} className="min-w-28">
                    {submitting ? (fa ? "در حال ارسال…" : "Sending…") : (fa ? "ارسال درخواست" : "Send Inquiry")}
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
