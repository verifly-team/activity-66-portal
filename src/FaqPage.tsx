import { useRef, useState, type ReactNode } from "react";
import "./faq.css";
import { ArrowIcon } from "./ArrowIcon";
import brandFallback from "./assets/optimized/brand.png";
import brandWebp from "./assets/optimized/brand.webp";

const IS_STANDALONE_BUILD =
  typeof document !== "undefined" &&
  document.documentElement.dataset.standalone === "true";
const APPLY_HREF = IS_STANDALONE_BUILD
  ? "./apply-standalone.html"
  : "./apply.html";
const HOME_HREF = IS_STANDALONE_BUILD ? "./index.html" : "./app.html";
const CONTACT_EMAIL = "buzzlu@qq.com";

type Question = {
  id: string;
  question: string;
  answer: ReactNode;
};

type FaqSection = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  questions: Question[];
};

const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "audience",
    number: "01",
    title: "关于活动及人流量",
    shortTitle: "活动与人流",
    questions: [
      {
        id: "footfall",
        question: "这次活动的人流量你们有预估过吗？",
        answer: <p>预计 7,000+ 人次。</p>,
      },
      {
        id: "consumer-types",
        question: "这次市集预计会吸引什么类型的消费者？",
        answer: (
          <ul>
            <li>古着、时尚爱好者</li>
            <li>时尚、设计、服装从业人员</li>
            <li>艺术及生活方式爱好者</li>
          </ul>
        ),
      },
      {
        id: "promotion-channels",
        question: "这次活动会通过哪些渠道进行宣传推广？",
        answer: (
          <>
            <p>小红书、抖音、微信视频号、Instagram。</p>
            <p>我们会同步开展 KOL / KOC 及达人合作推广。</p>
          </>
        ),
      },
      {
        id: "tickets",
        question: "市集需要购票入场，还是免费开放？",
        answer: (
          <>
            <p>市集为购票入场。</p>
            <dl className="faq-price-list">
              <div>
                <dt>早鸟票</dt>
                <dd>￥66 / 人</dd>
              </div>
              <div>
                <dt>正价票</dt>
                <dd>￥99 / 单人，￥168 / 双人</dd>
              </div>
            </dl>
          </>
        ),
      },
      {
        id: "market-arrivals",
        question: "预计会有多少人是专门为了市集而来的？",
        answer: <p>预计 7,000–8,000 人。</p>,
      },
      {
        id: "age",
        question: "这次活动的主要目标客群是什么年龄层？",
        answer: <p>18–35 岁。</p>,
      },
      {
        id: "programme",
        question: "活动期间是否会安排特别表演、互动或其他吸引人流的活动？",
        answer: (
          <>
            <p>
              会。街头音乐节将随机出现在会场街道，现场还有特别时装秀场以及多种工作坊供大家参与。详情请查阅官网和官方账号。
            </p>
            <ul>
              <li>
                官方网站：
                <a
                  href="https://66thandsecondlovehealgiveus.com/app.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  66thandsecondlovehealgiveus.com
                </a>
              </li>
              <li>小红书：66th &amp; 2nd Ave.</li>
              <li>抖音：66th &amp; 2nd Ave.</li>
              <li>公众号：巴洛塔</li>
              <li>Instagram：66th2nd_ave</li>
            </ul>
          </>
        ),
      },
      {
        id: "contingency",
        question: "如果现场人流未达到预期，主办方会如何应对？",
        answer: (
          <>
            <p>
              主办方会制定相应的推广及应对方案。活动期间，团队会进行每日数据跟进与现场情况复盘，根据实际人流及运营反馈及时调整推广策略，并积极寻找更多吸引客流的方式。
            </p>
            <p>
              同时，我们会通过官方社交媒体平台进行实时宣传、动态推广及现场内容曝光，结合活动期间的实际情况，持续扩大活动触达范围，吸引更多消费者到场。
            </p>
            <p>
              我们的目标是通过活动前的充分准备，以及活动期间的动态调整，尽最大努力提升现场人流及商家的参展体验。
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "organisers",
    number: "02",
    title: "关于主办方及合作伙伴",
    shortTitle: "主办方与伙伴",
    questions: [
      {
        id: "second-street",
        question: "2nd STREET 也是这次活动的主办方之一吗？",
        answer: <p>是。</p>,
      },
      {
        id: "team",
        question: "这次活动由哪个团队负责整体策划及执行？",
        answer: <p>Ken、Buzz、Adriel、Vivienne。</p>,
      },
      {
        id: "second-street-support",
        question: "2nd STREET 在这次活动中会提供哪些资源或支持？",
        answer: <p>2nd STREET 是本次活动的赞助商和联合主办方。</p>,
      },
      {
        id: "partners",
        question: "这次活动还有其他品牌、机构或赞助商参与吗？",
        answer: (
          <>
            <p>官方合作伙伴包括：</p>
            <ul>
              <li>
                善淘（慈善商店）；公众号、小程序、小红书、抖音均为“善淘 Buy42”
              </li>
              <li>
                粗门（票务平台）；公众号、小程序、小红书、抖音均为“粗门”
              </li>
              <li>
                2nd Street；
                <a
                  href="https://www.2ndstreet.jp"
                  target="_blank"
                  rel="noreferrer"
                >
                  官方网站
                </a>
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "venue",
    number: "03",
    title: "关于场地及摊位安排",
    shortTitle: "场地与摊位",
    questions: [
      {
        id: "indoor",
        question: "活动场地是户外还是室内？",
        answer: <p>室内。</p>,
      },
      {
        id: "stall-size",
        question: "每个商家的摊位面积是多少？",
        answer: (
          <>
            <dl className="faq-spec-list">
              <div>
                <dt>A 区</dt>
                <dd>9 平米（3 × 3m）</dd>
              </div>
              <div>
                <dt>B 区</dt>
                <dd>4 平米（2 × 2m）</dd>
              </div>
              <div>
                <dt>C 区</dt>
                <dd>18 平米（3 × 6m）</dd>
              </div>
            </dl>
            <p>如需更大位置，请在申请时备注。</p>
          </>
        ),
      },
      {
        id: "included",
        question: "摊位费用包含哪些设施及配套？",
        answer: (
          <p>
            包含摊位硬装、摊位 KT 版装饰、落地龙门衣架、60 × 60cm 展台和两张折叠椅。如需要特殊定制，请联系主办方。
          </p>
        ),
      },
      {
        id: "decoration",
        question: "商家可以自行设计和布置摊位吗？",
        answer: <p>可以。</p>,
      },
      {
        id: "set-up",
        question: "商家可以提前进场布置吗？具体进场及撤场时间是什么？",
        answer: (
          <>
            <p>可以提前一天进场。</p>
            <p>
              具体日期为 12 月 23 日或 24 日，需与工程团队确认工期；撤场时间为 12 月 27 日活动结束营业后的当晚。
            </p>
          </>
        ),
      },
      {
        id: "furniture",
        question: "现场是否提供桌子、椅子及基础展示设施？",
        answer: (
          <p>
            是。现场提供折叠椅 2 张、60 × 60cm 展台 1 个、宽 1m 龙门架 4–6 个。
          </p>
        ),
      },
      {
        id: "power-wifi",
        question: "现场是否提供电源及 Wi-Fi？",
        answer: (
          <>
            <p>服装区域现场不提供电源，市集现场会有统一的灯光设计。</p>
            <p>Wi-Fi 情况待确认。</p>
          </>
        ),
      },
      {
        id: "extra-power",
        question: "如果商家需要使用额外电源或设备，需要额外收费吗？",
        answer: (
          <p>
            现场不提供设备支持，但电源可以共用，商家只需承担相应电费。
          </p>
        ),
      },
      {
        id: "large-goods",
        question: "如果商家有大型货物，现场是否方便运输及装卸？",
        answer: <p>场地条件允许，运输及搬运需商家自行解决。</p>,
      },
      {
        id: "parking",
        question: "现场是否有停车位或专门的卸货区域？",
        answer: <p>市集旁有停车场。</p>,
      },
    ],
  },
  {
    id: "application",
    number: "04",
    title: "关于商家申请及筛选",
    shortTitle: "申请与筛选",
    questions: [
      {
        id: "stall-count",
        question: "这次预计会邀请多少个商家参与？",
        answer: <p>总共 66 个摊位。</p>,
      },
      {
        id: "merchant-types",
        question: "什么类型的商家可以申请参加？",
        answer: (
          <ul>
            <li>90 年代经典服饰</li>
            <li>设计师历史系列与研究性单品</li>
            <li>包袋、时装与二手生活服饰</li>
            <li>军品与工装</li>
            <li>首饰、杂志、设计档案、器皿、周边、香氛或餐饮酒水等</li>
            <li>二手名牌、过季清仓、Outlet 及样衣</li>
          </ul>
        ),
      },
      {
        id: "approval",
        question: "申请后是否一定可以获得摊位？",
        answer: <p>不一定，需要通过主办方审核。</p>,
      },
      {
        id: "criteria",
        question: "主办方会根据什么标准筛选商家？",
        answer: (
          <ul>
            <li>商家所售商品需要有成熟、独立的审美体系。</li>
            <li>
              商家需要有良好的品牌声誉，并明确标明商品来源、品相与价格。
            </li>
            <li>风格不重复，品质优先，避免产生同类竞争。</li>
          </ul>
        ),
      },
      {
        id: "result-date",
        question: "申请后多久会收到审核结果？",
        answer: (
          <dl className="faq-date-list">
            <div>
              <dt>第一轮审核结果</dt>
              <dd>2026 年 11 月 10 日</dd>
            </div>
            <div>
              <dt>第二轮审核结果</dt>
              <dd>2026 年 12 月 1 日</dd>
            </div>
          </dl>
        ),
      },
      {
        id: "shared-stall",
        question: "可以与其他品牌合摊吗？",
        answer: <p>可以，但需要确认统一的摊位名称。</p>,
      },
      {
        id: "creators",
        question: "是否接受个人创作者、独立设计师或刚起步的小品牌申请？",
        answer: <p>是。</p>,
      },
      {
        id: "vintage",
        question: "是否接受二手商品、Vintage 或古着类商家？",
        answer: <p>是。</p>,
      },
      {
        id: "food",
        question: "是否接受食品及饮品类商家？",
        answer: <p>是。</p>,
      },
      {
        id: "multiple-categories",
        question: "如果商家同时经营多个品类，可以申请一个摊位展示不同产品吗？",
        answer: (
          <p>
            同一个摊位需要保持调性一致。如果有多个品类，建议一个商家申请不同区域的摊位进行展示。
          </p>
        ),
      },
      {
        id: "category-competition",
        question: "如果某个品类已经有很多商家申请，还会继续接受吗？",
        answer: (
          <>
            <p>
              我们会严格把控整体商家阵容的丰富度及品类多样性，确保每个品类都有合理的比例，同时避免商品及品牌定位过度重复。
            </p>
            <p>
              对于经营品类相近或商品风格类似的品牌，我们不会单纯以竞争为考量，而会根据各品牌的特色、商品定位及目标客群进行综合评估，并通过合理的区域划分及摊位布局，让不同品牌之间形成互补，而非直接竞争。
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "fees",
    number: "05",
    title: "关于费用及付款",
    shortTitle: "费用与付款",
    questions: [
      {
        id: "booth-fee",
        question: "这次市集的摊位费用是多少？",
        answer: (
          <>
            <p>
              有展览的区域 A、潮流的区域 B，也有 Outlet 的区域 C，收费不同。
            </p>
            <dl className="faq-fee-list">
              <div>
                <dt>A 区</dt>
                <dd>￥3,000 / 3 天</dd>
              </div>
              <div>
                <dt>B 区</dt>
                <dd>￥666 / 3 天 + 营业额 15%</dd>
              </div>
              <div>
                <dt>C 区</dt>
                <dd>￥1,800 / 3 天 + 营业额 10%</dd>
              </div>
            </dl>
          </>
        ),
      },
      {
        id: "position-price",
        question: "不同面积或位置的摊位，收费会有区别吗？",
        answer: <p>有。</p>,
      },
      {
        id: "payment-time",
        question: "申请成功后，需要什么时候付款？",
        answer: <p>双方确认合作后，商家需在 48 小时内提交保证金。</p>,
      },
      {
        id: "deposit",
        question: "是否需要先支付保证金才能确认摊位？",
        answer: <p>是。</p>,
      },
      {
        id: "other-costs",
        question: "除了摊位费之外，还有其他额外费用吗？",
        answer: <p>电费，按实际用量支付。</p>,
      },
      {
        id: "refund",
        question: "如果付款后临时无法参加，可以退款吗？",
        answer: <p>如果是个人原因，不可以退款。</p>,
      },
      {
        id: "transfer",
        question: "摊位是否可以转让给其他商家？",
        answer: <p>绝对不可以。</p>,
      },
      {
        id: "force-majeure",
        question: "如果主办方因不可抗力因素取消活动，费用会如何处理？",
        answer: <p>全款退还。</p>,
      },
      {
        id: "early-bird",
        question: "是否有早鸟报名优惠或其他合作优惠？",
        answer: (
          <p>
            本次市集不设早鸟报名优惠或其他票务折扣。作为合作商家的专属权益，每位成功入驻的商家均可获赠 10 张免费入场门票，可分配给朋友、客户或合作伙伴使用。
          </p>
        ),
      },
    ],
  },
  {
    id: "operations",
    number: "06",
    title: "关于现场运营及销售",
    shortTitle: "现场运营",
    questions: [
      {
        id: "opening-hours",
        question: "市集每天的开放时间是几点到几点？",
        answer: <p>12 月 25 日至 27 日，每日 11:00–18:00。</p>,
      },
      {
        id: "arrival",
        question: "商家需要提前多久到场准备？",
        answer: (
          <p>
            场地开放时间为每日 09:00–22:00，商家需要至少提前 30 分钟到场准备。
          </p>
        ),
      },
      {
        id: "full-session",
        question: "商家需要全程参与活动吗？",
        answer: <p>需要。</p>,
      },
      {
        id: "leave-early",
        question: "是否允许商家中途离场或提前撤场？",
        answer: <p>不可以。</p>,
      },
      {
        id: "payment-method",
        question: "商家可以使用自己的收款方式吗，例如微信支付、支付宝或现金？",
        answer: (
          <p>
            不可以。现场统一使用汇来米收款结算，每个商家会收到主办方发放的店铺汇来米收款码，便于商家与主办方公开透明地对账。
          </p>
        ),
      },
      {
        id: "security",
        question: "现场是否提供安保及公共区域管理？",
        answer: <p>提供安保。</p>,
      },
      {
        id: "storage",
        question: "如果商家需要补货，现场是否有临时储物空间？",
        answer: (
          <p>
            活动现场有后台仓库，供商家临时储物。贵重物品请勿放置在仓库中，主办方不负责保管。
          </p>
        ),
      },
      {
        id: "onsite-team",
        question: "活动期间是否有统一的现场管理人员协助商家？",
        answer: (
          <>
            <p>
              是。现场有 3–4 人的协助主团队，志愿者由现场团队管理，每个区域安排两名志愿者，三天轮岗。
            </p>
            <p>协助内容包括短时间看店，以及协调需求并向主办方提交。</p>
          </>
        ),
      },
      {
        id: "emergency",
        question: "如果遇到突发情况，商家应该联系谁？",
        answer: <p>联系市集统筹。</p>,
      },
      {
        id: "loss-liability",
        question: "如果现场发生商品遗失或损坏，责任如何划分？",
        answer: (
          <>
            <p>
              活动期间如发生商品遗失、损坏或其他相关纠纷，主办方会积极协助各方沟通及处理，尽力推动问题得到合理解决。如果涉及商家与消费者之间的争议，主办方将协助双方了解情况、沟通协调，并促成双方在事实基础上达成合理的解决方案。主办方不会在未经充分了解事实的情况下，单方面认定任何一方的责任。
            </p>
            <p>
              如果商品遗失或损坏是由于主办方的管理、安排或其他可确认的主办方原因所造成，我们将根据实际情况、相关证据及责任认定，承担相应的责任及合理赔偿。
            </p>
            <p>
              我们希望通过透明、公平的沟通机制，保障商家、消费者及主办方各方的合理权益。
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "promotion",
    number: "07",
    title: "关于活动宣传及品牌曝光",
    shortTitle: "宣传与曝光",
    questions: [
      {
        id: "merchant-promotion",
        question: "主办方会帮助商家宣传品牌吗？",
        answer: (
          <ul>
            <li>主办方会在线上官方账号对入驻商家进行统一公示。</li>
            <li>主办方会发布一系列探店视频，帮助商家宣发。</li>
          </ul>
        ),
      },
      {
        id: "social-feature",
        question: "商家是否会出现在官方社交媒体的宣传内容中？",
        answer: (
          <ul>
            <li>官方账号会统一发布入驻商家的店铺名称及店铺简介。</li>
            <li>主办方会发布一系列探店视频，对参展商进行介绍。</li>
          </ul>
        ),
      },
      {
        id: "vendor-list",
        question: "是否会在活动前发布参展商名单及品牌介绍？",
        answer: <p>是，我们会使用统一模板制作参展商简介。</p>,
      },
      {
        id: "cooperation",
        question: "商家是否需要配合宣传活动，例如转发官方海报或发布活动预告？",
        answer: (
          <>
            <p>
              是。入选后，商家需要在官方账号发布市集海报。如果商家参与走秀、工作坊等市集活动，也需要发布对应的活动预告。
            </p>
            <p>有线下门店的商家还会获得实体海报，并需配合在店中展示。</p>
          </>
        ),
      },
      {
        id: "special-event",
        question: "是否可以在活动期间举办品牌特别活动？",
        answer: <p>可考虑。商家需要提前策划，并在 11 月 5 日前提交方案。</p>,
      },
      {
        id: "independent-area",
        question: "商家是否可以申请独立的品牌展示或互动区域？",
        answer: (
          <p>
            可以。独立品牌展示或互动区域需要与主办方沟通，以确认方案和收费标准。
          </p>
        ),
      },
      {
        id: "kol",
        question: "是否会安排 KOL、Influencer 或媒体到场拍摄及报道？",
        answer: <p>是，11 月 20 日会公布对应名单。</p>,
      },
      {
        id: "media-assets",
        question: "活动结束后，主办方是否会提供现场照片或视频素材给商家？",
        answer: <p>是，素材需付费获取。</p>,
      },
    ],
  },
  {
    id: "other",
    number: "08",
    title: "关于其他合作及注意事项",
    shortTitle: "其他注意事项",
    questions: [
      {
        id: "staff",
        question: "商家是否可以携带自己的工作人员或助手到场？",
        answer: <p>是，最多三人，需登记。</p>,
      },
      {
        id: "restrictions",
        question: "是否有商品种类、展示方式或摊位装饰方面的限制？",
        answer: (
          <>
            <p>商品种类以商家审美体系与分区原理为标准选择。</p>
            <p>
              摊位可以使用地毯，但不可设置吊顶装饰物。特殊要求需联系主办方确认。
            </p>
          </>
        ),
      },
      {
        id: "giveaways",
        question: "是否允许商家在现场进行抽奖或赠品活动？",
        answer: <p>如有安排，请提前将活动内容与时间报备主办方。</p>,
      },
      {
        id: "agreement",
        question: "商家是否需要签署参展协议？",
        answer: <p>是，协议内容待确认。</p>,
      },
      {
        id: "guide",
        question: "报名成功后，主办方会提供详细的参展指南吗？",
        answer: <p>是，参展指南待确认。</p>,
      },
      {
        id: "special-request",
        question: "如果商家有其他合作想法或特殊需求，可以单独与主办方沟通吗？",
        answer: <p>可以。</p>,
      },
    ],
  },
];

function FaqHeader() {
  return (
    <header className="faq-header">
      <a
        className="faq-header__brand"
        href={HOME_HREF}
        aria-label="66th & 2nd Ave. 活动首页"
      >
        <picture>
          <source type="image/webp" srcSet={brandWebp} />
          <img src={brandFallback} alt="66th & 2nd Ave." />
        </picture>
      </a>
      <p className="faq-header__title">商家参展 FAQ</p>
      <a className="faq-header__back" href={APPLY_HREF}>
        返回申请表 <ArrowIcon className="arrow" />
      </a>
    </header>
  );
}

export default function FaqPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleAll = () => {
    const nextExpanded = !allExpanded;
    contentRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details")
      .forEach((item) => {
        item.open = nextExpanded;
      });
    setAllExpanded(nextExpanded);
  };

  return (
    <div className="faq-page">
      <FaqHeader />

      <section className="faq-hero" aria-labelledby="faq-title">
        <div className="faq-hero__inner">
          <p className="faq-eyebrow">
            <span>MERCHANT FAQ</span>
            <span>APPLICATION NOTES</span>
            <span>SHENZHEN / 2026</span>
          </p>

          <div className="faq-hero__heading">
            <div>
              <p className="faq-hero__kicker">申请前</p>
              <h1 id="faq-title">你想知道的事</h1>
            </div>
            <p className="faq-hero__lead">
              关于活动、摊位、审核、费用与现场运营，我们把商家申请前最常见的问题整理在这里。
            </p>
          </div>

          <dl className="faq-facts">
            <div>
              <dt>DATES</dt>
              <dd>2026.12.25 Fri — 27 Sun</dd>
            </div>
            <div>
              <dt>VENUE</dt>
              <dd>深圳华侨城创意文化园</dd>
            </div>
            <div>
              <dt>FORMAT</dt>
              <dd>室内市集 / 66 个摊位</dd>
            </div>
            <div>
              <dt>FEEDBACK</dt>
              <dd>分轮评审 / 统一回复</dd>
            </div>
          </dl>
        </div>
      </section>

      <main className="faq-main">
        <div className="faq-layout">
          <aside className="faq-sidebar" aria-label="FAQ 分类导航">
            <div className="faq-index">
              <p className="faq-index__label">CONTENTS</p>
              <nav>
                <ol>
                  {FAQ_SECTIONS.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>
                        <span>{section.number}</span>
                        <span>{section.shortTitle}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div className="faq-sidebar__apply">
              <p>已经了解参展安排？</p>
              <a href={APPLY_HREF}>
                填写参展申请 <ArrowIcon className="arrow" />
              </a>
              <p>
                其他问题：
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </div>
          </aside>

          <div className="faq-content" ref={contentRef}>
            <div className="faq-toolbar">
              <p>
                共{" "}
                {FAQ_SECTIONS.reduce(
                  (sum, section) => sum + section.questions.length,
                  0,
                )}{" "}
                个问题
              </p>
              <button
                className="faq-expand"
                type="button"
                aria-expanded={allExpanded}
                onClick={toggleAll}
              >
                {allExpanded ? "全部收起" : "全部展开"}
              </button>
            </div>

            {FAQ_SECTIONS.map((section) => (
              <section
                className="faq-section"
                id={section.id}
                key={section.id}
                aria-labelledby={`${section.id}-title`}
              >
                <header className="faq-section__head">
                  <span>{section.number}</span>
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                </header>
                <div className="faq-section__items">
                  {section.questions.map((item, index) => (
                    <details
                      className="faq-item"
                      key={item.id}
                      id={item.id}
                      open={section.id === "audience" && index === 0}
                    >
                      <summary>
                        <span className="faq-item__number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="faq-item__question">{item.question}</span>
                        <span className="faq-item__control" aria-hidden="true" />
                      </summary>
                      <div className="faq-answer">{item.answer}</div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <section className="faq-end" aria-labelledby="faq-end-title">
              <p className="faq-eyebrow">
                <span>READY TO APPLY?</span>
                <span>2026.12.25—27</span>
              </p>
              <div>
                <h2 id="faq-end-title">接下来，把品牌带进市集。</h2>
                <p>
                  本页信息用于申请前沟通，最终合作安排以主办方审核确认及参展协议为准。
                </p>
              </div>
              <a href={APPLY_HREF}>
                填写参展申请 <ArrowIcon className="arrow" />
              </a>
            </section>
          </div>
        </div>
      </main>

      <footer className="faq-footer">
        <p>66TH &amp; 2ND AVE. / VINTAGE FASHION MARKET</p>
        <p>2026.12.25—27 / 深圳华侨城创意文化园</p>
        <p>
          咨询：Buzz Lu /{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </footer>
    </div>
  );
}
