import coomenLogo from "./assets/figma-2026-10/coomen-logo.png";
import fashionShowDesktop from "./assets/figma-2026-10/fashion-show-desktop.png";
import fashionShowMobile from "./assets/figma-2026-10/fashion-show-mobile.png";
import locationTarget from "./assets/figma-2026-10/location-target.svg";
import marketPlanDesktop from "./assets/figma-2026-10/market-plan-desktop.png";
import marketPlanMobile from "./assets/figma-2026-10/market-plan-mobile.png";
import supportLogo from "./assets/figma-2026-10/support-logo.png";
import brandFallback from "./assets/optimized/brand.png";
import brandWebp from "./assets/optimized/brand.webp";
import campaignDesktopFallback from "./assets/optimized/campaign-desktop.png";
import campaignDesktopWebp from "./assets/optimized/campaign-desktop.webp";
import campaignMobileFallback from "./assets/optimized/campaign-mobile.png";
import campaignMobileWebp from "./assets/optimized/campaign-mobile.webp";

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

function Arrow({ className = "" }: { className?: string }) {
  return (
    <span className={`arrow ${className}`} aria-hidden="true">
      ↗
    </span>
  );
}

function PlaceholderGrid({
  count,
  label,
  className,
}: {
  count: number;
  label: string;
  className: string;
}) {
  return (
    <div className={`placeholder-grid ${className}`} role="img" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <span aria-hidden="true" key={index} />
      ))}
    </div>
  );
}

function App() {
  return (
    <div className="site" id="top">
      <header className="site-header">
        <div className="site-header__bar">
          <a className="brand" href="#top" aria-label="66th & 2nd Ave. 首页">
            <picture>
              <source type="image/webp" srcSet={brandWebp} />
              <img src={brandFallback} alt="66th & 2nd Ave. Vintage Fashion Market" />
            </picture>
          </a>

          <nav className="desktop-nav" aria-label="主导航">
            <a href="#about">关于我们</a>
            <a href="#market">复古街区</a>
            <a href="#workshop">工作坊</a>
            <a href="#fashion">时尚秀场</a>
            <a href="#visit">
              立刻购票 <Arrow />
            </a>
            <a href="./apply.html">商家参展</a>
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
          <a href="./apply.html">商家参展</a>
        </nav>
      </header>

      <main>
        <section className="campaign" aria-label="活动主视觉">
          <picture>
            <source
              type="image/webp"
              media="(min-width: 900px)"
              srcSet={campaignDesktopWebp}
            />
            <source type="image/webp" srcSet={campaignMobileWebp} />
            <source media="(min-width: 900px)" srcSet={campaignDesktopFallback} />
            <img
              src={campaignMobileFallback}
              width="1170"
              height="1651"
              fetchPriority="high"
              alt="66th & 2nd Ave. Vintage Fashion Market，2026.12.25 至 27，深圳华侨城创意文化园北区 C2 展厅"
            />
          </picture>
        </section>

        <div className="quick-ticket">
          <a href="#visit">
            立刻购票 <Arrow />
          </a>
        </div>

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
            <PlaceholderGrid
              className="placeholder-grid--mobile"
              count={9}
              label="参展摊位列表，详细信息即将公布"
            />
            <PlaceholderGrid
              className="placeholder-grid--desktop"
              count={15}
              label="参展摊位列表，详细信息即将公布"
            />
            <a className="view-more" href="#market-plan">
              查看更多
            </a>
          </div>

          <picture className="market-plan" id="market-plan">
            <source media="(min-width: 900px)" srcSet={marketPlanDesktop} />
            <img
              src={marketPlanMobile}
              loading="lazy"
              decoding="async"
              alt="Vintage Market 场地图，包含 A、B、C 摊位区、美食区和入口"
            />
          </picture>

          <div className="food-area">
            <h3>美食区</h3>
            <PlaceholderGrid
              className="placeholder-grid--mobile"
              count={9}
              label="美食区摊位列表，详细信息即将公布"
            />
            <PlaceholderGrid
              className="placeholder-grid--desktop"
              count={10}
              label="美食区摊位列表，详细信息即将公布"
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
          <picture className="fashion__schedule">
            <source media="(min-width: 900px)" srcSet={fashionShowDesktop} />
            <img
              src={fashionShowMobile}
              loading="lazy"
              decoding="async"
              alt="Vintage Fashion Show，2026 年 12 月 25 日至 27 日每天 14:00 至 14:30"
            />
          </picture>
        </section>

        <section className="visit" id="visit" aria-labelledby="visit-title">
          <div className="visit__intro">
            <h2 id="visit-title">立刻购票</h2>
            <p>
              识别下方小程序码，立刻购票
              <span className="visit__mobile-period">。</span>
            </p>
            <div
              className="ticket-card"
              role="img"
              aria-label="购票小程序码即将公布"
            >
              <span>TICKETS / DETAILS TO FOLLOW</span>
              <Arrow />
            </div>
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

          <div className="venue__map" role="img" aria-label="深圳华侨城创意园 C2 空间位置示意">
            <div className="venue__map-grid" aria-hidden="true" />
            <div className="venue__map-heading">
              <p className="venue__map-label">SHENZHEN / 深圳</p>
              <p className="venue__orientation">N ↑</p>
            </div>
            <div className="venue__marker">
              <img src={locationTarget} alt="" aria-hidden="true" />
              <p>华侨城创意园C2空间</p>
            </div>
          </div>

          <div className="venue__address">
            <h2 id="venue-title">深圳见</h2>
            <div>
              <p className="venue__label">THE ADDRESS / 地址</p>
              <p>
                广东省深圳市南山区沙河街道香山街社区香山东街2号东部工业区C2栋
              </p>
            </div>
          </div>

          <div className="venue__transport">
            <p className="venue__label">GETTING HERE / 交通</p>
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
              loading="lazy"
              decoding="async"
              alt="善淘 BUY 42"
            />
            <img
              className="support__logo support__logo--partner"
              src={coomenLogo}
              loading="lazy"
              decoding="async"
              alt="粗门"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
