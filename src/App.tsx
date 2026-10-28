import campaignDesktop from "./assets/figma-2026-10/campaign-desktop-latest.webp";
import coomenLogo from "./assets/figma-2026-10/coomen-logo.webp";
import footerDesktop from "./assets/figma-2026-10/footer-desktop.webp";
import locationTarget from "./assets/figma-2026-10/location-target.svg";
import marketPlanDesktop from "./assets/figma-2026-10/market-plan-desktop.webp";
import marketPlanMobile from "./assets/figma-2026-10/market-plan-mobile.webp";
import mobileFooter from "./assets/figma-2026-10/mobile-footer.png";
import mobileHeroWebp from "./assets/figma-2026-10/mobile-hero.webp";
import supportLogo from "./assets/figma-2026-10/support-logo.webp";
import ticketQr from "./assets/figma-2026-10/ticket-qr.webp";
import brandWebp from "./assets/optimized/brand.webp";
import { VenueMap } from "./VenueMap";
import { VENUE } from "./venue";

const workshopItems = [
  {
    title: "工作坊壹",
    description: "活动简介",
    meta: "时间/地点/艺术家",
  },
  {
    title: "工作坊贰",
    description: "活动简介",
    meta: "时间/地点/艺术家",
  },
  {
    title: "工作坊叁",
    description: "活动简介",
    meta: "时间/地点/艺术家",
  },
] as const;

const vendorItems = [
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A03", name: "不设季" },
  { code: "A04", name: "不设季" },
  { code: "A05", name: "不设季" },
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A03", name: "不设季" },
  { code: "A04", name: "不设季" },
  { code: "A05", name: "不设季" },
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A03", name: "不设季" },
  { code: "A04", name: "不设季" },
  { code: "A05", name: "不设季" },
] as const;

const foodItems = [
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A03", name: "不设季" },
  { code: "A04", name: "不设季" },
  { code: "A05", name: "不设季" },
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A03", name: "不设季" },
  { code: "A04", name: "不设季" },
  { code: "A05", name: "不设季" },
] as const;

const mobileVendorItems = [
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A03", name: "不设季" },
  { code: "A04", name: "不设季" },
  { code: "A05", name: "不设季" },
  { code: "A06", name: "不设季" },
] as const;

const mobileFoodItems = [
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
  { code: "A01", name: "不设季" },
  { code: "A02", name: "不设季" },
] as const;

const fashionShows = [
  {
    title: "Regular Vintage Fashion Show",
    date: "2026.12.25 Fri.",
    time: "14:00 - 14:30",
  },
  {
    title: "Future Vintage Fashion Show",
    date: "2026.12.26 Sta.",
    time: "14:00 - 14:30",
  },
  {
    title: "Special Vintage Fashion Show",
    date: "2026.12.27 Sun.",
    time: "14:00 - 14:30",
  },
] as const;

function Arrow({ className = "" }: { className?: string }) {
  return (
    <span className={`arrow ${className}`} aria-hidden="true">
      ↗
    </span>
  );
}

function VendorList({
  items,
  className = "",
}: {
  items: readonly { code: string; name: string }[];
  className?: string;
}) {
  return (
    <ul className={`vendor-list ${className}`.trim()}>
      {items.map((item, index) => (
        <li className="vendor-item" key={`${item.code}-${index}`}>
          <span className="vendor-code">{item.code}</span>
          <span className="vendor-name">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

function App() {
  return (
    <div className="site" id="top">
      <header className="site-header">
        <div className="site-header__bar">
          <a className="brand" href="#top" aria-label="66th & 2nd Ave. 首页">
            <img
              src={brandWebp}
              alt="66th & 2nd Ave. Vintage Fashion Market"
            />
          </a>

          <nav className="desktop-nav" aria-label="主导航">
            <a href="#about">关于我们</a>
            <a href="#market">复古街区</a>
            <a href="#workshop">工作坊</a>
            <a href="#fashion">时尚秀场</a>
            <a href="#visit">
              立刻购票 <Arrow />
            </a>
          </nav>

          <a className="mobile-ticket" href="#visit">
            立刻购票 <Arrow />
          </a>
        </div>

        <nav className="mobile-nav" aria-label="移动端导航">
          <a href="#about">关于我们</a>
          <a href="#market">复古街区</a>
          <a href="#workshop">工作坊</a>
          <a href="#fashion">时尚秀场</a>
        </nav>
      </header>

      <main>
        <section className="campaign" aria-label="活动主视觉">
          <picture>
            <source
              media="(max-width: 899px)"
              srcSet={mobileHeroWebp}
            />
            <img
              src={campaignDesktop}
              width="2400"
              height="1384"
              fetchPriority="high"
              alt="66th & 2nd Ave. Vintage Fashion Market，2026.12.25 至 27，深圳华侨城创意文化园北区 C2 展厅"
            />
          </picture>
        </section>

        <section className="about" id="about" aria-labelledby="about-title">
          <h2 id="about-title">ABOUT</h2>
          <div className="about__band">
            <div className="about__content">
              <p className="about__title">
                66th &amp; 2nd Ave.
                <br />
                Vintage Fashion Market
              </p>
              <p className="about__copy">
                {
                  "一个以当代潮流、复古文化、二手商品交易为主题的Vintage Fashion Market。"
                }
              </p>
              <p className="about__copy">
                {
                  "市集以纽约上东街区为灵感，集合Vintage Culture、Designer Archive、街头潮流、古着与各一线品牌的二手商品，以现代的购物体验、生活方式为表现形式。我们邀请风格鲜明的店铺相聚深圳，通过售卖、陈列与穿搭，让观众认识货品，了解每家店铺的审美与故事。"
                }
              </p>
              <p className="about__copy about__copy--en">
                {
                  "A multidisciplinary creative designer specializing in brand strategy, visual communication, product and spatial design, and event planning. Experienced in fashion weeks, brand launches, and runway shows, with expertise in venue planning, spatial experiences, and art installations. Also the founder of an independent electronic music label and tea brand, continuously exploring the intersection of design, fashion, art, and culture."
                }
              </p>
            </div>
          </div>
        </section>

        <section className="market" id="market" aria-labelledby="market-title">
          <div className="market__intro">
            <h2 id="market-title">Vintage Market</h2>
            <p>
              本期有66个摊位聚集于此。
              <br />
              汇集各具特色的顶尖二手服装店，收藏家，工作坊，服务商与特色美食。
            </p>
          </div>

          <div className="market__group">
            <VendorList
              items={vendorItems}
              className="vendor-list--desktop"
            />
            <VendorList
              items={mobileVendorItems}
              className="vendor-list--mobile"
            />
            <a className="view-more" href="#market-plan">
              查看更多
            </a>
          </div>

          <picture className="market-plan" id="market-plan">
            <source media="(min-width: 900px)" srcSet={marketPlanDesktop} />
            <img
              src={marketPlanMobile}
              width="800"
              height="976"
              loading="lazy"
              decoding="async"
              alt="Vintage Market 场地图，包含 A、B、C 摊位区、美食区和入口"
            />
          </picture>

          <div className="food-area">
            <h3>美食区</h3>
            <VendorList
              items={foodItems}
              className="vendor-list--food vendor-list--desktop"
            />
            <VendorList
              items={mobileFoodItems}
              className="vendor-list--food vendor-list--mobile"
            />
          </div>
        </section>

        <section
          className="workshop"
          id="workshop"
          aria-labelledby="workshop-title"
        >
          <div className="workshop__intro">
            <h2 id="workshop-title">WORK SHOP</h2>
            <p className="workshop__summary">
              本期有十位艺术家聚集于此。
              <br />
              带来时尚，音乐，艺术与疗愈相结合的身心体验
            </p>
          </div>

          <div className="workshop-list">
            {workshopItems.map((item) => (
              <article className="workshop-item" key={item.title}>
                <h3>{item.title}</h3>
                <p className="workshop-item__mobile-copy">{item.description}</p>
                <p className="workshop-item__meta">{item.meta}</p>
                <p className="workshop-item__desktop-copy">详细信息</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="fashion"
          id="fashion"
          aria-labelledby="fashion-title"
        >
          <div className="fashion__intro">
            <h2 id="fashion-title">Fashion Show</h2>
            <p>时装秀简介</p>
          </div>
          <div className="fashion__schedule-text">
            {fashionShows.map((show) => (
              <div className="fashion-show" key={show.title}>
                <span className="fashion-show__title">{show.title}</span>
                <span className="fashion-show__date">
                  <span className="fashion-show__prefix">Date</span>
                  {show.date}
                </span>
                <span className="fashion-show__time">{show.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="visit" id="visit" aria-labelledby="visit-title">
          <div className="visit__intro">
            <h2 id="visit-title">
              <span className="visit__title-mobile">Ticket</span>
              <span className="visit__title-desktop">Tickets</span>
            </h2>
            <p>
              识别下方小程序码，立刻购票
              <span className="visit__mobile-period">。</span>
            </p>
            <img
              className="ticket-qr"
              src={ticketQr}
              width="360"
              height="360"
              loading="lazy"
              decoding="async"
              alt="购票小程序码"
            />
          </div>

          <dl className="event-meta">
            <div>
              <dt>DATES / 日期</dt>
              <dd>2026.12.25 Fri ~ 27 Sun</dd>
            </div>
            <div>
              <dt>OPENING HOURS / 时间</dt>
              <dd>11:00 ~ 19:00</dd>
            </div>
          </dl>
        </section>

        <section className="venue" aria-labelledby="venue-title">
          <div className="venue__rule" aria-hidden="true" />
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
              <p className="venue__orientation">N ↑</p>
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
              在高德地图中查看 <span aria-hidden="true">↗</span>
            </a>
            <p className="venue__map-credit">© 高德地图</p>
          </div>

          <div className="venue__address">
            <h2 id="venue-title">
              <span className="venue__title-mobile">Address</span>
            </h2>
            <div>
              <p>{VENUE.address}</p>
              <p className="venue__address-en">
                Exhibition Hall C2, North Zone, OCT - LOFT,
                <br />
                Nanshan District, Shenzhen City.
              </p>
            </div>
          </div>

          <div className="venue__transport">
            <p className="venue__label venue__label--transport">
              <span className="venue__label-mobile">GETTING HERE</span>
              <span className="venue__label-desktop">GETTING HERE / 交通</span>
            </p>
            <p>
              侨城北站 B出口，步行约800米
              <br />
              侨城东站A出口，随后步行前往创意园北区。
              <br />
              <br />
              华侨城创意文化园公交站
              <br />
              <br />
              华侨城创意文化园南山特色文化街区北区C2地面停车场
            </p>
          </div>
        </section>

        <section className="support" aria-labelledby="support-title">
          <div className="support__intro">
            <h2 id="support-title">Supported By</h2>
            <p>合作伙伴</p>
          </div>
          <div className="support__logos">
            <img
              className="support__logo"
              src={supportLogo}
              width="258"
              height="364"
              loading="lazy"
              decoding="async"
              alt="善淘 BUY 42"
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
  );
}

export default App;
