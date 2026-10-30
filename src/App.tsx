import { useEffect, useRef, useState, type CSSProperties } from "react";
import coomenLogo from "./assets/figma-2026-10/coomen-logo.webp";
import footerDesktop from "./assets/figma-2026-10/footer-desktop.webp";
import heroDesktop from "./assets/figma-2026-10/hero-desktop.webp";
import heroMobile from "./assets/figma-2026-10/hero-mobile.webp";
import locationTarget from "./assets/figma-2026-10/location-target.svg";
import logo2ndStreet from "./assets/figma-2026-10/logo-2nd-street.webp";
import marketPlan from "./assets/figma-2026-10/market-plan.webp";
import mobileFooter from "./assets/figma-2026-10/mobile-footer.png";
import socialInstagram from "./assets/figma-2026-10/social-instagram.png";
import socialTiktok from "./assets/figma-2026-10/social-tiktok.png";
import socialWechat from "./assets/figma-2026-10/social-wechat.png";
import socialWechatQr from "./assets/figma-2026-10/social-wechat-qr.webp";
import socialXiaohongshu from "./assets/figma-2026-10/social-xiaohongshu.png";
import supportLogo from "./assets/figma-2026-10/support-logo.webp";
import tabMainContents from "./assets/figma-2026-10/tab-main-contents.png";
import tabSpecialContents from "./assets/figma-2026-10/tab-special-contents.png";
import ticketsCtaDesktop from "./assets/figma-2026-10/tickets-cta-desktop.png";
import ticketsCtaMobile from "./assets/figma-2026-10/tickets-cta-mobile.png";
import ticketQr from "./assets/figma-2026-10/ticket-qr.webp";
import { ArrowIcon } from "./ArrowIcon";
import { VenueMap } from "./VenueMap";
import { VENUE } from "./venue";

const IS_STANDALONE_BUILD =
  typeof document !== "undefined" &&
  document.documentElement.dataset.standalone === "true";
const APPLY_HREF = IS_STANDALONE_BUILD
  ? "./apply-standalone.html"
  : "./apply.html";

const workshopItems = [
  { title: "工作坊 壹", description: "详情介绍" },
  { title: "工作坊 贰", description: "详情介绍" },
  { title: "工作坊 叁", description: "详情介绍" },
] as const;

const fashionShows = [
  {
    title: "Regular Vintage Fashion Show",
    date: "2026.12.25 Fri.",
    time: "15:00 - 15:30",
  },
  {
    title: "Future Vintage Fashion Show",
    date: "2026.12.26 Sat.",
    time: "14:00 - 14:30",
  },
  {
    title: "Special Vintage Fashion Show",
    date: "2026.12.26 Sat.",
    time: "15:30 - 16:00",
  },
] as const;

type Vendor = { name: string; lines?: readonly string[] };

const desktopVendors: readonly Vendor[] = [
  { name: "Inner Archive" },
  { name: "Full Moon" },
  { name: "In Tatters" },
  { name: "BUY 42" },
  { name: "不设季" },
  { name: "Ballo Space" },
  { name: "Timber Vintage" },
  { name: "Past Vintage" },
  { name: "世集卡牌" },
  { name: "Past Vintage / 布雷德男士理发", lines: ["Past Vintage", "布雷德男士理发"] },
  { name: "Farm" },
  { name: "Swing Vintage" },
  { name: "光荣二手" },
  { name: "Zoom Ink" },
  { name: "雅昌印刷" },
];

const mobileVendors: readonly Vendor[] = [
  { name: "Inner Archive" },
  { name: "Daddy Farm" },
  { name: "In Tatters" },
  { name: "BUY 42" },
  { name: "不设季" },
  { name: "Ballo Space" },
  { name: "Timber Vintage" },
  { name: "Past Vintage" },
  { name: "光荣二手" },
  { name: "Full Moon" },
  { name: "世集卡牌" },
  { name: "Past Vintage / 布雷德男士理发", lines: ["Past Vintage", "布雷德男士理发"] },
  { name: "Farm" },
  { name: "Swing Vintage" },
  { name: "Zoom Ink" },
  { name: "雅昌印刷" },
];

const mobileVendorPreviewCount = 9;

const foodItems = [
  "beko beko",
  "巴耶尔的厨房",
  "艾薇达",
  "Gelato",
  "安可咖啡",
] as const;

const socialItems = [
  {
    id: "xiaohongshu",
    label: "66th & 2nd Ave.",
    icon: socialXiaohongshu,
    url: "https://www.xiaohongshu.com/user/profile/6a3671e3000000000f03ac00",
  },
  {
    id: "wechat",
    label: "巴洛塔",
    icon: socialWechat,
  },
  {
    id: "instagram",
    label: "66th2nd_ave",
    icon: socialInstagram,
    url: "https://www.instagram.com/66th2nd_ave/",
  },
  {
    id: "douyin",
    label: "66th & 2nd Ave.",
    icon: socialTiktok,
    url: "https://www.douyin.com/user/MS4wLjABAAAAhrS6VG4Y9wtjpxDhlNe0SuMPU9rIo37IXlNkAEVVnq27763q07Cp1YcDppVmoHKE",
  },
] as const;

function VendorList({
  items,
  className = "",
}: {
  items: readonly Vendor[];
  className?: string;
}) {
  return (
    <ul className={`vendor-list ${className}`.trim()}>
      {items.map((item) => (
        <li className="vendor-item" key={item.name}>
          <span className="vendor-swatch" aria-hidden="true" />
          <span className="vendor-name">
            {(item.lines ?? [item.name]).map((line) => (
              <span className="vendor-name__line" key={line}>
                {line}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ContentsDivider({
  image,
  label,
}: {
  image: string;
  label: string;
}) {
  return (
    <div className="contents-divider">
      <span className="contents-divider__rule" aria-hidden="true" />
      <img
        className="contents-divider__tab"
        src={image}
        width="164"
        height="48"
        loading="lazy"
        decoding="async"
        alt={label}
      />
      <span className="contents-divider__rule" aria-hidden="true" />
    </div>
  );
}

function RuleDivider() {
  return <div className="rule-divider" aria-hidden="true" />;
}

const introBurstPieces = [
  { x: "-13vmin", y: "-18vmin", rotation: "-42deg", scale: 0.95 },
  { x: "4vmin", y: "-23vmin", rotation: "24deg", scale: 0.7 },
  { x: "17vmin", y: "-15vmin", rotation: "62deg", scale: 1.05 },
  { x: "25vmin", y: "-4vmin", rotation: "-18deg", scale: 0.8 },
  { x: "22vmin", y: "11vmin", rotation: "43deg", scale: 0.65 },
  { x: "13vmin", y: "21vmin", rotation: "-66deg", scale: 1.1 },
  { x: "-1vmin", y: "25vmin", rotation: "18deg", scale: 0.75 },
  { x: "-15vmin", y: "19vmin", rotation: "82deg", scale: 1.15 },
  { x: "-24vmin", y: "7vmin", rotation: "-34deg", scale: 0.7 },
  { x: "-26vmin", y: "-6vmin", rotation: "52deg", scale: 0.85 },
  { x: "-8vmin", y: "-11vmin", rotation: "112deg", scale: 0.5 },
  { x: "9vmin", y: "-9vmin", rotation: "-71deg", scale: 0.55 },
  { x: "11vmin", y: "7vmin", rotation: "31deg", scale: 0.48 },
  { x: "-7vmin", y: "9vmin", rotation: "-101deg", scale: 0.62 },
] as const;

type IntroPhase = "ready" | "popping" | "complete";

const introSeenKey = "activity-66:intro-seen";

function shouldPlayIntro() {
  if (new URLSearchParams(window.location.search).has("balloon")) return true;
  // 站内锚点链接直接进到某个板块时，没必要先炸一遍气球。
  if (window.location.hash.length > 1) return false;

  try {
    return window.sessionStorage.getItem(introSeenKey) !== "1";
  } catch {
    return true;
  }
}

function BalloonIntro({
  phase,
  onPop,
}: {
  phase: Exclude<IntroPhase, "complete">;
  onPop: () => void;
}) {
  return (
    <div
      className={`balloon-intro balloon-intro--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="balloon-intro-title"
      aria-describedby="balloon-intro-description"
    >
      <div className="balloon-intro__grid" aria-hidden="true" />
      <p className="visually-hidden" id="balloon-intro-title">
        66th &amp; 2nd Ave.
      </p>
      <p className="visually-hidden" id="balloon-intro-description">
        点击银色 66 气球，打开活动网站。
      </p>

      <div className="balloon-intro__stage">
        <button
          className="intro-balloon"
          type="button"
          aria-label="点击气球，打开 66th & 2nd Ave. 网站"
          onClick={onPop}
        >
          <span className="intro-balloon__body" aria-hidden="true">
            <span className="intro-balloon__crease intro-balloon__crease--one" />
            <span className="intro-balloon__crease intro-balloon__crease--two" />
            <span className="intro-balloon__number">66</span>
            <span className="intro-balloon__knot" />
          </span>
          <svg
            className="intro-balloon__string"
            viewBox="0 0 80 210"
            aria-hidden="true"
          >
            <path d="M41 2C35 48 48 74 39 113c-8 37 4 56 1 95" />
          </svg>
        </button>

        <div className="intro-balloon__burst" aria-hidden="true">
          {introBurstPieces.map((piece, index) => (
            <span
              className="intro-balloon__shard"
              key={index}
              style={
                {
                  "--piece-x": piece.x,
                  "--piece-y": piece.y,
                  "--piece-rotation": piece.rotation,
                  "--piece-scale": piece.scale,
                  "--piece-delay": `${index * 7}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
      <div className="balloon-intro__flash" aria-hidden="true" />
    </div>
  );
}

function App() {
  const [playIntro] = useState(shouldPlayIntro);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(
    playIntro ? "ready" : "complete",
  );
  const [wechatOpen, setWechatOpen] = useState(false);
  const [vendorsExpanded, setVendorsExpanded] = useState(false);
  const wechatTriggerRef = useRef<HTMLButtonElement>(null);
  const wechatDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playIntro || introPhase !== "complete") return;

    try {
      window.sessionStorage.setItem(introSeenKey, "1");
    } catch {
      // 隐私模式下写入失败时，下次照常播放即可。
    }
  }, [introPhase, playIntro]);

  // 页面内容要等 React 挂载后才存在，原生锚点这时已经错过了滚动时机。
  useEffect(() => {
    const { hash } = window.location;
    if (hash.length < 2) return;

    const scrollToHash = () => {
      const target = document.getElementById(
        decodeURIComponent(hash.slice(1)),
      );
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    };

    scrollToHash();
    window.addEventListener("load", scrollToHash);
    return () => window.removeEventListener("load", scrollToHash);
  }, []);

  useEffect(() => {
    if (introPhase !== "complete") {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [introPhase]);

  useEffect(() => {
    if (introPhase !== "popping") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealTimer = window.setTimeout(() => {
      setIntroPhase("complete");
    }, prefersReducedMotion ? 460 : 1120);

    return () => window.clearTimeout(revealTimer);
  }, [introPhase]);

  useEffect(() => {
    if (!wechatOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = wechatTriggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWechatOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    wechatDialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [wechatOpen]);

  const visibleMobileVendors = vendorsExpanded
    ? mobileVendors
    : mobileVendors.slice(0, mobileVendorPreviewCount);

  const siteClassName = [
    "site",
    playIntro
      ? introPhase === "ready"
        ? "site--intro-waiting"
        : "site--intro-revealed"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={siteClassName}
        id="top"
        inert={introPhase !== "complete"}
        aria-hidden={introPhase !== "complete"}
      >
        <header className="site-header">
          <div className="site-header__stripe" aria-hidden="true" />
          <div className="site-header__bar">
            <a className="brand" href="#top" aria-label="66th & 2nd Ave. 首页">
              <span>66th &amp; 2nd Ave.</span>
              <span>Vintage Fashion Market &amp; Show</span>
            </a>

            <nav className="desktop-nav" aria-label="主导航">
              <a href="#about">About</a>
              <a href="#market">Vintage market</a>
              <a href="#workshop">Workshop</a>
              <a href={APPLY_HREF}>Vendors</a>
              <a className="nav-tickets" href="#visit">
                Tickets<ArrowIcon className="arrow" />
              </a>
            </nav>
          </div>

          <nav className="mobile-nav" aria-label="移动端导航">
            <a href="#about">About</a>
            <a href="#market">Vintage market</a>
            <a href="#workshop">Workshop</a>
            <a href={APPLY_HREF}>Vendors</a>
            <a className="nav-tickets" href="#visit">
              Tickets<ArrowIcon className="arrow" />
            </a>
          </nav>
        </header>

        <main>
          <section className="campaign" aria-label="活动主视觉">
            <picture>
              <source media="(max-width: 899px)" srcSet={heroMobile} />
              <img
                src={heroDesktop}
                width="1452"
                height="1066"
                fetchPriority="high"
                alt="66th & 2nd Ave. Vintage Fashion Market，2026.12.25 至 27，深圳华侨城创意文化园北区 C2 展厅"
              />
            </picture>
          </section>

          <section className="about" id="about" aria-labelledby="about-title">
            <a className="tickets-cta" href="#visit" aria-label="购票 Tickets">
              <picture>
                <source media="(min-width: 900px)" srcSet={ticketsCtaDesktop} />
                <img
                  src={ticketsCtaMobile}
                  width="204"
                  height="39"
                  alt="Tickets"
                />
              </picture>
            </a>
            <h2 id="about-title">About</h2>
            <div className="about__band">
              <div className="about__content">
                <p className="about__copy">
                  {"一个以当代潮流、复古文化、二手商品交易为主题的Vintage Fashion Market。"}
                  <br className="br-desktop" />
                  {"市集以纽约上东街区为灵感，集合Vintage Culture / Designer Archive / 街头潮流 / 古着与各一线品牌的二手商品，以现代的购物"}
                  <br className="br-desktop" />
                  {"物体验、生活方式为表现形式。"}
                  <br className="br-desktop" />
                  {"我们邀请风格鲜明的店铺相聚深圳，通过售卖、陈列与穿搭，让观众认识货品，" }
                  <br className="br-desktop" />
                  {"了解每家店铺的审美与故事。"}
                </p>
                <p className="about__copy about__copy--en">
                  <span className="about__copy-line">
                    {"A multidisciplinary creative designer specializing in brand strategy, visual communication, product and spatial design, "}
                  </span>
                  <span className="about__copy-line">
                    {"and event planning. Experienced in fashion weeks, brand launches, and runway shows, with expertise in venue planning, spatial experiences, and art installations. Also "}
                  </span>
                  <span className="about__copy-line">
                    the founder of an independent electronic music label and tea
                    brand, continuously exploring the intersection of design,
                    fashion, art, and culture.
                  </span>
                </p>
                <ul className="social-list">
                  {socialItems.map((item) => {
                    const body = (
                      <>
                        <img
                          className="social-item__icon"
                          src={item.icon}
                          alt=""
                          aria-hidden="true"
                        />
                        <span className="social-item__label">{item.label}</span>
                      </>
                    );

                    return (
                      <li
                        className={`social-item social-item--${item.id}`}
                        key={item.id}
                      >
                        {"url" in item ? (
                          <a
                            className="social-item__link"
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {body}
                          </a>
                        ) : (
                          <>
                            <button
                              ref={wechatTriggerRef}
                              className="social-item__link social-wechat__trigger"
                              type="button"
                              aria-haspopup="dialog"
                              aria-expanded={wechatOpen}
                              aria-controls="wechat-dialog"
                              onClick={() => setWechatOpen(true)}
                            >
                              {body}
                            </button>
                            <div className="wechat-popover" aria-hidden="true">
                              <img src={socialWechatQr} alt="" />
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>

          <ContentsDivider image={tabMainContents} label="Main Contents" />

          <section className="market" id="market" aria-labelledby="market-title">
            <h2 id="market-title">Vintage Fashion show</h2>

            <div className="fashion__schedule-text">
              {fashionShows.map((show) => (
                <div className="fashion-show" key={show.title}>
                  <span className="fashion-show__title">{show.title}</span>
                  <span className="fashion-show__date">
                    <span className="fashion-show__prefix">Date</span>
                    <span>{show.date}</span>
                  </span>
                  <span className="fashion-show__time">{show.time}</span>
                </div>
              ))}
            </div>

            <picture className="market-plan">
              <img
                src={marketPlan}
                width="882"
                height="1030"
                loading="lazy"
                decoding="async"
                alt="Vintage Market 场地图，包含 A、B、C 摊位区、美食区、Backstage 和入口"
              />
            </picture>

            <div className="vendors">
              <VendorList
                items={desktopVendors}
                className="vendor-list--desktop"
              />
              <VendorList
                items={visibleMobileVendors}
                className="vendor-list--mobile"
              />
              <button
                className="view-more"
                type="button"
                aria-expanded={vendorsExpanded}
                onClick={() => setVendorsExpanded((value) => !value)}
              >
                {vendorsExpanded ? "收起 Less" : "More 查看更多"}
              </button>
            </div>

            <div className="food-area">
              <h3>Food</h3>
              <ul className="food-list">
                {foodItems.map((name) => (
                  <li className="food-item" key={name}>
                    <span className="vendor-swatch" aria-hidden="true" />
                    <span className="vendor-name">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <RuleDivider />

          <section
            className="workshop"
            id="workshop"
            aria-labelledby="workshop-title"
          >
            <h2 id="workshop-title">Work Shop</h2>
            <div className="workshop-list">
              {workshopItems.map((item) => (
                <article className="workshop-item" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <ContentsDivider
            image={tabSpecialContents}
            label="Special Contents"
          />

          <section className="visit" id="visit" aria-labelledby="visit-title">
            <h2 id="visit-title">Tickets</h2>
            <p className="visit__eyebrow">立刻购票</p>
            <p className="visit__lead">识别下方小程序码，立刻购票</p>
            <img
              className="ticket-qr"
              src={ticketQr}
              width="360"
              height="360"
              loading="lazy"
              decoding="async"
              alt="购票小程序码"
            />

            <dl className="event-meta">
              <div>
                <dt>Date / 日期</dt>
                <dd>2026.12.25 Fri. - 27 Sun</dd>
              </div>
              <div>
                <dt>Opening Hours / 时间</dt>
                <dd>11:00 - 19:00</dd>
              </div>
            </dl>
          </section>

          <section className="venue" aria-labelledby="venue-title">
            <h2 className="venue__map-title">Map</h2>

            <div
              className="venue__map"
              role="group"
              aria-label="深圳华侨城创意园 C2 空间位置"
            >
              <div className="venue__map-grid" aria-hidden="true" />
              <VenueMap lat={VENUE.gcj02.lat} lng={VENUE.gcj02.lng} />
              <div className="venue__map-heading">
                <p className="venue__map-label">SHENZHEN / 深圳</p>
                <p className="venue__orientation">
                  N <ArrowIcon direction="up" />
                </p>
              </div>
              <div className="venue__marker">
                <img src={locationTarget} alt="" aria-hidden="true" />
                <p>{VENUE.label}</p>
              </div>
              <a
                className="venue__map-link"
                href={VENUE.amapUrl}
                target="_blank"
                rel="noreferrer"
              >
                在高德地图中查看 <ArrowIcon />
              </a>
              <p className="venue__map-credit">© 高德地图</p>
            </div>

            <div className="venue__address">
              <h2 id="venue-title">Address</h2>
              <div>
                <p>{VENUE.address}</p>
                <p className="venue__address-en">
                  Exhibition Hall C2, North Zone, OCT Creative Culture Park,
                  <br />
                  Nanshan District, Shenzhen City
                </p>
              </div>
            </div>

            <div className="venue__transport">
              <p className="venue__label venue__label--transport">
                <span className="venue__label-mobile">GETTING HERE</span>
                <span className="venue__label-desktop">GETTING HERE / 交通</span>
              </p>
              <p>
                侨城北站B出口，
                <br />
                步行约800米侨城东站A出口，
                <br />
                随后步行前往创意园北区。
                <br />
                <br />
                华侨城创意文化园公交站
                <br />
                <br />
                华侨城创意文化园
                <br />
                南山特色文化街区北区C2地面停车场
              </p>
            </div>
          </section>

          <RuleDivider />

          <section className="support" aria-labelledby="support-title">
            <h2 id="support-title">Supported by</h2>
            <div className="support__logos">
              <img
                className="support__logo support__logo--opening"
                src={logo2ndStreet}
                width="640"
                height="248"
                loading="lazy"
                decoding="async"
                alt="2nd STREET"
              />
              <img
                className="support__logo support__logo--partner"
                src={coomenLogo}
                width="456"
                height="166"
                loading="lazy"
                decoding="async"
                alt="粗门"
              />
              <img
                className="support__logo support__logo--closing"
                src={supportLogo}
                width="258"
                height="364"
                loading="lazy"
                decoding="async"
                alt="善淘 BUY 42"
              />
            </div>
          </section>
        </main>
        <footer className="site-footer" aria-hidden="true">
          <picture>
            <source media="(min-width: 900px)" srcSet={footerDesktop} />
            <img
              src={mobileFooter}
              width="780"
              height="62"
              loading="lazy"
              decoding="async"
              alt=""
            />
          </picture>
        </footer>
      </div>

      {introPhase !== "complete" && (
        <BalloonIntro
          phase={introPhase}
          onPop={() => {
            if (introPhase === "ready") setIntroPhase("popping");
          }}
        />
      )}

      {wechatOpen && (
        <div
          className="wechat-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setWechatOpen(false);
          }}
        >
          <div
            ref={wechatDialogRef}
            className="wechat-dialog"
            id="wechat-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="巴洛塔微信公众号"
            tabIndex={-1}
          >
            <button
              className="wechat-dialog__close"
              type="button"
              aria-label="关闭微信二维码"
              onClick={() => setWechatOpen(false)}
            >
              <span aria-hidden="true" />
            </button>
            <p className="wechat-dialog__eyebrow">WeChat / 微信</p>
            <img
              className="wechat-dialog__qr"
              src={socialWechatQr}
              width="1280"
              height="1280"
              alt="巴洛塔微信二维码"
            />
            <p className="wechat-dialog__caption">巴洛塔</p>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
