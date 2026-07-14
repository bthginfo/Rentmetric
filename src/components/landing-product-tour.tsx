"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";

type TourItem = { src: string; eyebrow: string; title: string; copy: string };

export function LandingProductTour({ items }: { items: TourItem[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.82, behavior: "smooth" });
  return <div className="tour-shell">
    <div className="tour-controls"><button type="button" onClick={() => move(-1)} aria-label="Vorherige Produktansicht"><ArrowLeft /></button><button type="button" onClick={() => move(1)} aria-label="Nächste Produktansicht"><ArrowRight /></button></div>
    <div className="tour-rail" ref={rail} tabIndex={0} aria-label="Produktansichten" onKeyDown={(event) => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }}>
      {items.map((item, index) => <article className="tour-slide" key={item.src} tabIndex={0}><div className="tour-screen"><div className="tour-screen-bar"><i /><i /><i /><span>Rentmetric · Demo</span></div><Image src={item.src} width={1280} height={800} alt={`${item.title} – sanitisierte Produktansicht`} loading={index === 0 ? "eager" : "lazy"} /></div><div className="tour-caption"><span>{String(index + 1).padStart(2, "0")} · {item.eyebrow}</span><h3>{item.title}</h3><p>{item.copy}</p></div></article>)}
    </div>
  </div>;
}
