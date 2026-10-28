import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type VenueMapProps = {
  lat: number;
  lng: number;
};

export function VenueMap({ lat, lng }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldInit, setShouldInit] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldInit(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldInit(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldInit) return;

    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [lat, lng],
      zoom: 17.6,
      zoomSnap: 0,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    // Free Amap raster tiles keep this block light; swap the URL for a
    // licensed tile provider without changing the rest of the component.
    const tiles = L.tileLayer(
      "https://webst0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
      {
        subdomains: ["1", "3"],
        minZoom: 1,
        maxZoom: 18,
      },
    );

    tiles.on("tileload", () => {
      container.closest(".venue__map")?.classList.add("venue__map--live");
    });
    tiles.addTo(map);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => map.invalidateSize());
    resizeObserver?.observe(container);
    const frame = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      container.closest(".venue__map")?.classList.remove("venue__map--live");
      map.remove();
    };
  }, [shouldInit, lat, lng]);

  return (
    <div
      ref={containerRef}
      className="venue__map-canvas"
      aria-hidden="true"
    />
  );
}
