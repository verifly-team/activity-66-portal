import { useEffect, useRef, useState, type FormEvent } from "react";
import brandFallback from "./assets/optimized/brand.png";
import brandWebp from "./assets/optimized/brand.webp";
import "./apply.css";

const DEFAULT_API_BASE = "https://api.66thandsecondlovehealgiveus.com";
const API_BASE = (import.meta.env.VITE_API_BASE ?? DEFAULT_API_BASE).replace(
  /\/$/,
  "",
);
// 线上默认直连报名服务；设置 VITE_APPLICATION_API_ENABLED=false 可退回纯预览模式。
const APPLICATION_API_ENABLED =
  import.meta.env.VITE_APPLICATION_API_ENABLED !== "false";
const CONTACT_EMAIL = "buzzlu@qq.com";
const DOCX_URL = `${import.meta.env.BASE_URL}66th-merchant-application-form.docx`;
const DRAFT_KEY = "verifly:exhibitor-application:v1";
const MAX_FILES = 10;
const MAX_FILE_MB = 3;
const MAX_TOTAL_MB = 30;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "pdf", "zip"];
const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

const CATEGORIES = [
  { value: "bag", label: "箱包手袋" },
  { value: "watch", label: "腕表" },
  { value: "jewelry", label: "珠宝配饰" },
  { value: "apparel", label: "服饰" },
  { value: "shoe", label: "鞋履" },
  { value: "other", label: "其他藏品" },
] as const;

const ZONES = [
  {
    value: "A",
    title: "Vintage Culture 及 Designer Archive",
    desc: "具年代、系列或出处依据的收藏级服饰与藏品",
  },
  {
    value: "B",
    title: "工装、街头潮流",
    desc: "相关品牌的二手服饰",
  },
  {
    value: "C",
    title: "二手名牌、Outlet 及样衣",
    desc: "过季清仓与样衣；新品和二手须分别标示",
  },
] as const;

const ENTITY_TYPES = [
  { value: "company", label: "公司" },
  { value: "individual", label: "个体工商户" },
  { value: "personal", label: "个人" },
] as const;

const STRUCTURE_FIELDS = [
  { key: "secondhand", label: "二手" },
  { key: "new_stock", label: "未使用库存" },
  { key: "sample", label: "样衣" },
  { key: "replica", label: "复刻 / 原创" },
] as const;

const UPLOAD_KINDS = [
  { value: "photos", label: "商品照片" },
  { value: "list", label: "商品清单" },
  { value: "other", label: "其他" },
] as const;

const SECTIONS = [
  { id: "brand", num: "01", title: "品牌与联络" },
  { id: "categories", num: "02", title: "品类与区域" },
  { id: "inventory", num: "03", title: "本次货盘" },
  { id: "attachments", num: "04", title: "资料与附件" },
  { id: "confirm", num: "05", title: "确认提交" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type Zone = (typeof ZONES)[number]["value"];
type EntityType = (typeof ENTITY_TYPES)[number]["value"];
type StructureKey = (typeof STRUCTURE_FIELDS)[number]["key"];
type UploadKind = (typeof UPLOAD_KINDS)[number]["value"];

type ItemDraft = {
  key: string;
  name: string;
  era_series: string;
  condition_source: string;
  price: string;
};

type UploadEntry = {
  localId: string;
  fileId?: string;
  name: string;
  size: number;
  kind: UploadKind;
  status: "uploading" | "done" | "error";
  message?: string;
};

type FormState = {
  brand_name: string;
  entity_type: EntityType | "";
  city: string;
  contact_name: string;
  phone: string;
  wechat: string;
  email: string;
  is_first_time: boolean;
  categories: Category[];
  zones: Zone[];
  expected_qty: string;
  price_min: string;
  price_max: string;
  structure: Record<StructureKey, string>;
  items: ItemDraft[];
  files: UploadEntry[];
  consent: boolean;
};

type ApplicationResult = {
  id: number;
  files: number;
  created_at: string;
  preview?: boolean;
};

type ServerField = { path: string; message: string };
type Errors = Record<string, string>;

let itemSequence = 0;

function uid(prefix: string) {
  itemSequence += 1;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${itemSequence}`;
  return `${prefix}-${random}`;
}

function createItem(): ItemDraft {
  return {
    key: uid("item"),
    name: "",
    era_series: "",
    condition_source: "",
    price: "",
  };
}

function createInitialForm(): FormState {
  return {
    brand_name: "",
    entity_type: "",
    city: "",
    contact_name: "",
    phone: "",
    wechat: "",
    email: "",
    is_first_time: false,
    categories: [],
    zones: [],
    expected_qty: "",
    price_min: "",
    price_max: "",
    structure: {
      secondhand: "",
      new_stock: "",
      sample: "",
      replica: "",
    },
    items: [createItem(), createItem(), createItem()],
    files: [],
    consent: false,
  };
}

function loadDraft(): { form: FormState; savedAt: string | null } {
  const base = createInitialForm();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { form: base, savedAt: null };
    const parsed = JSON.parse(raw) as Partial<FormState> & { savedAt?: string };
    const items = Array.isArray(parsed.items) && parsed.items.length
      ? parsed.items.map((item) => ({
          key: typeof item?.key === "string" ? item.key : uid("item"),
          name: typeof item?.name === "string" ? item.name : "",
          era_series: typeof item?.era_series === "string" ? item.era_series : "",
          condition_source:
            typeof item?.condition_source === "string" ? item.condition_source : "",
          price: typeof item?.price === "string" ? item.price : "",
        }))
      : base.items;
    const files = Array.isArray(parsed.files)
      ? parsed.files
          .filter(
            (file) =>
              file &&
              file.status === "done" &&
              typeof file.fileId === "string" &&
              typeof file.name === "string",
          )
          .map((file) => ({
            localId: uid("upload"),
            fileId: file.fileId,
            name: file.name,
            size: typeof file.size === "number" ? file.size : 0,
            kind: file.kind ?? "other",
            status: "done" as const,
          }))
      : [];

    return {
      form: {
        ...base,
        ...parsed,
        structure: { ...base.structure, ...(parsed.structure ?? {}) },
        items,
        files,
        consent: false,
      },
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
    };
  } catch {
    return { form: base, savedAt: null };
  }
}

function normalizePhone(value: string) {
  let phone = value.replace(/[\s\-－()（）]/g, "");
  if (phone.startsWith("+86")) phone = phone.slice(3);
  else if (phone.startsWith("86") && phone.length === 13) phone = phone.slice(2);
  return phone;
}

function toDigits(value: string, maxLength = 9) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function toIntOrNull(value: string) {
  if (!value.trim()) return null;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)}（北京时间）`;
}

function formatSavedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function readApiMessage(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }
  return fallback;
}

function errorIdFor(key: string) {
  if (/^items\[\d+\]\./.test(key)) {
    const index = key.match(/^items\[(\d+)\]/)?.[1] ?? "0";
    return `item-${index}-name`;
  }
  const groups: Record<string, string> = {
    contact: "field-contact",
    categories: "field-categories",
    zones: "field-zones",
    structure: "field-structure",
    uploads: "field-uploads",
    consent: "field-consent",
  };
  return groups[key] ?? key;
}

function focusableIn(element: HTMLElement | null) {
  if (!element) return null;
  if (element.matches("input, textarea, select, button, a")) return element;
  return element.querySelector<HTMLElement>(
    "input:not([type='hidden']), button, a, textarea, select",
  );
}

function scrollUnderHeader(element: HTMLElement | null, behavior: ScrollBehavior = "instant") {
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

function AppHeader() {
  return (
    <header className="apply-header">
      <a className="apply-header__brand" href="./app.html" aria-label="66th & 2nd Ave. 活动首页">
        <picture>
          <source type="image/webp" srcSet={brandWebp} />
          <img src={brandFallback} alt="66th & 2nd Ave." />
        </picture>
      </a>
      <p className="apply-header__title">商家参展申请及意向登记表</p>
      <a className="apply-header__back" href="./app.html">
        返回活动首页 <span className="arrow" aria-hidden="true">↗</span>
      </a>
    </header>
  );
}

function ApplyFooter() {
  return (
    <footer className="apply-footer">
      <p className="apply-footer__brand">66TH &amp; 2ND AVE. / VINTAGE FASHION MARKET</p>
      <p>2026.12.25—27 / 深圳华侨城创意文化园</p>
      <p>
        提交及咨询：Buzz Lu /{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </footer>
  );
}

export default function ApplyPage() {
  const [initialDraft] = useState(loadDraft);
  const [form, setForm] = useState<FormState>(initialDraft.form);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<UploadKind>("photos");
  const [dragOver, setDragOver] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initialDraft.savedAt);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const fileStore = useRef(new Map<string, File>());

  useEffect(() => {
    document.title = "商家参展申请｜66th & 2nd Ave.";
  }, []);

  useEffect(() => {
    if (!result) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    const heading = successRef.current?.querySelector("h2");
    heading?.focus({ preventScroll: true });
  }, [result]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const { consent: _consent, ...rest } = form;
        const stamp = new Date().toISOString();
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...rest, savedAt: stamp }));
        setSavedAt(stamp);
      } catch {
        // 隐私模式下 localStorage 可能不可用，表单仍可正常提交。
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleCategory(value: Category) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((item) => item !== value)
        : [...prev.categories, value],
    }));
    clearError("categories");
  }

  function toggleZone(value: Zone) {
    setForm((prev) => ({
      ...prev,
      zones: prev.zones.includes(value)
        ? prev.zones.filter((item) => item !== value)
        : [...prev.zones, value],
    }));
    clearError("zones");
  }

  function updateStructure(key: StructureKey, value: string) {
    setForm((prev) => ({
      ...prev,
      structure: { ...prev.structure, [key]: toDigits(value, 3) },
    }));
    clearError("structure");
  }

  function updateItem(index: number, key: keyof ItemDraft, value: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    clearError(`items[${index}].name`);
    clearError(`items[${index}].price`);
  }

  function addItem() {
    setForm((prev) =>
      prev.items.length >= 20
        ? prev
        : { ...prev, items: [...prev.items, createItem()] },
    );
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function uploadOne(entry: UploadEntry, file: File) {
    if (!APPLICATION_API_ENABLED) {
      setForm((prev) => ({
        ...prev,
        files: prev.files.map((item) =>
          item.localId === entry.localId
            ? {
                ...item,
                status: "done",
                message: undefined,
              }
            : item,
        ),
      }));
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("kind", entry.kind);

    try {
      const response = await fetch(`${API_BASE}/api/v1/uploads`, {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiMessage(data, "附件上传失败，请重试"));
      }
      const uploaded = data as { file_id: string; size?: number };
      setForm((prev) => ({
        ...prev,
        files: prev.files.map((item) =>
          item.localId === entry.localId
            ? {
                ...item,
                fileId: uploaded.file_id,
                size: uploaded.size ?? item.size,
                status: "done",
                message: undefined,
              }
            : item,
        ),
      }));
      clearError("uploads");
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        files: prev.files.map((item) =>
          item.localId === entry.localId
            ? {
                ...item,
                status: "error",
                message:
                  error instanceof TypeError
                    ? "附件上传失败，请稍后重试"
                    : error instanceof Error
                      ? error.message
                      : "附件上传失败，请重试",
              }
            : item,
        ),
      }));
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploadNotice(null);

    const activeFiles = form.files.filter((file) => file.status !== "error");
    let slots = MAX_FILES - activeFiles.length;
    let total = activeFiles.reduce((sum, file) => sum + file.size, 0);
    const queued: Array<{ entry: UploadEntry; file: File | null }> = [];
    const notices: string[] = [];

    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const localId = uid("upload");
      const baseEntry: UploadEntry = {
        localId,
        name: file.name,
        size: file.size,
        kind: uploadKind,
        status: "uploading",
      };

      if (slots <= 0) {
        notices.push(`附件最多 ${MAX_FILES} 个。`);
        break;
      }
      if (!ALLOWED_EXT.includes(extension)) {
        queued.push({
          entry: {
            ...baseEntry,
            status: "error",
            message: `不支持 .${extension || "未知"} 格式`,
          },
          file: null,
        });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        queued.push({
          entry: {
            ...baseEntry,
            status: "error",
            message: `单个文件不能超过 ${MAX_FILE_MB} MB`,
          },
          file: null,
        });
        continue;
      }
      if (total + file.size > MAX_TOTAL_BYTES) {
        queued.push({
          entry: {
            ...baseEntry,
            status: "error",
            message: `附件合计不能超过 ${MAX_TOTAL_MB} MB`,
          },
          file: null,
        });
        continue;
      }

      slots -= 1;
      total += file.size;
      queued.push({ entry: baseEntry, file });
    }

    if (!queued.length) {
      setUploadNotice(notices[0] ?? "没有可上传的文件。");
      return;
    }

    for (const item of queued) {
      if (item.file) fileStore.current.set(item.entry.localId, item.file);
    }
    setForm((prev) => ({
      ...prev,
      files: [...prev.files, ...queued.map((item) => item.entry)],
    }));
    if (notices.length) setUploadNotice(notices[0]);

    for (const item of queued) {
      if (item.file) await uploadOne(item.entry, item.file);
    }
  }

  async function retryUpload(localId: string) {
    const file = fileStore.current.get(localId);
    const entry = form.files.find((item) => item.localId === localId);
    if (!file || !entry) return;
    const retrying = { ...entry, status: "uploading" as const, message: undefined };
    setForm((prev) => ({
      ...prev,
      files: prev.files.map((item) =>
        item.localId === localId ? retrying : item,
      ),
    }));
    await uploadOne(retrying, file);
  }

  function removeUpload(localId: string) {
    fileStore.current.delete(localId);
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((item) => item.localId !== localId),
    }));
    setUploadNotice(null);
  }

  function clearDraft() {
    if (!window.confirm("确定清空当前草稿？已填写内容和已上传附件将从表单移除。")) {
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    fileStore.current.clear();
    setForm(createInitialForm());
    setErrors({});
    setGeneralError(null);
    setUploadNotice(null);
    setSavedAt(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const structureValues = STRUCTURE_FIELDS.map((field) =>
    Number.parseInt(form.structure[field.key] || "0", 10),
  );
  const structureTouched = STRUCTURE_FIELDS.some(
    (field) => form.structure[field.key] !== "",
  );
  const structureTotal = structureValues.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
  const structureIsValid =
    !structureTouched ||
    structureValues.every((value) => value === 0) ||
    structureTotal === 100;
  const filledItems = form.items.filter((item) => item.name.trim());
  const uploadedFiles = form.files.filter(
    (file) => file.status === "done" && file.fileId,
  );
  const readyFiles = APPLICATION_API_ENABLED ? uploadedFiles : form.files.filter(
    (file) => file.status === "done",
  );
  const uploadingCount = form.files.filter(
    (file) => file.status === "uploading",
  ).length;
  const failedUploads = form.files.filter((file) => file.status === "error").length;
  const contactsComplete = Boolean(
    form.contact_name.trim() &&
      PHONE_RE.test(normalizePhone(form.phone)) &&
      (form.wechat.trim() || form.email.trim()),
  );
  const brandComplete = Boolean(form.brand_name.trim()) && contactsComplete;
  const categoriesComplete = form.categories.length > 0 && form.zones.length > 0;
  const priceText =
    form.price_min || form.price_max
      ? `${form.price_min || "0"}—${form.price_max || "不限"} 元`
      : "未填写";
  const structureText = STRUCTURE_FIELDS.filter(
    (field) => Number.parseInt(form.structure[field.key] || "0", 10) > 0,
  )
    .map(
      (field) =>
        `${field.label} ${Number.parseInt(form.structure[field.key] || "0", 10)}%`,
    )
    .join(" / ");

  const formComplete = [brandComplete, categoriesComplete, true, true, form.consent];

  function validate(): Errors {
    const next: Errors = {};
    if (!form.brand_name.trim()) next.brand_name = "请填写品牌或店铺名称";
    else if (form.brand_name.trim().length > 120)
      next.brand_name = "品牌名称不能超过 120 字";

    if (!form.contact_name.trim()) next.contact_name = "请填写联系人姓名";
    else if (form.contact_name.trim().length > 60)
      next.contact_name = "联系人姓名不能超过 60 字";

    if (!form.phone.trim()) next.phone = "请填写手机号码";
    else if (!PHONE_RE.test(normalizePhone(form.phone)))
      next.phone = "请填写有效的 11 位手机号";

    if (!form.wechat.trim() && !form.email.trim())
      next.contact = "微信与邮箱至少填写一项，用于发送合同与后续联络";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
      next.email = "邮箱格式不正确";
    if (form.email.trim().length > 120) next.email = "邮箱不能超过 120 字";
    if (form.wechat.trim().length > 60) next.wechat = "微信不能超过 60 字";
    if (form.city.trim().length > 60) next.city = "城市不能超过 60 字";

    if (!form.categories.length)
      next.categories = "请至少选择一个经营品类";
    if (!form.zones.length) next.zones = "请至少选择一个意向区域";

    if (form.price_min && form.price_max) {
      const min = Number.parseInt(form.price_min, 10);
      const max = Number.parseInt(form.price_max, 10);
      if (max < min) next.price_max = "价格上限不能小于下限";
    }

    if (structureTouched && structureValues.every((value) => value === 0)) {
      // 全为 0 视为未填写，不提交商品结构。
    } else if (structureTouched && structureTotal !== 100) {
      next.structure = `商品结构四项合计须为 100%，当前 ${structureTotal}%`;
    }

    form.items.forEach((item, index) => {
      const hasOtherValue = Boolean(
        item.era_series.trim() || item.condition_source.trim() || item.price,
      );
      if (!item.name.trim() && hasOtherValue) {
        next[`items[${index}].name`] = "请填写商品名称，或清空该行";
      }
      if (item.name.trim().length > 120)
        next[`items[${index}].name`] = "商品名称不能超过 120 字";
      if (item.era_series.trim().length > 200)
        next[`items[${index}].name`] = "年代 / 系列说明不能超过 200 字";
      if (item.condition_source.trim().length > 200)
        next[`items[${index}].name`] = "状态及来源不能超过 200 字";
      if (item.price && Number.parseInt(item.price, 10) > 100_000_000)
        next[`items[${index}].price`] = "拟售价超出可填写范围";
    });

    if (uploadingCount) next.uploads = "附件仍在上传，请稍候再提交";
    else if (failedUploads) next.uploads = "有附件上传失败，请重试或移除";
    if (!form.consent) next.consent = "请勾选确认后提交";

    return next;
  }

  function applyServerErrors(fields: ServerField[]) {
    const next: Errors = {};
    for (const field of fields) {
      const path = field.path || "body";
      if (path === "body") {
        setGeneralError(field.message);
        continue;
      }
      next[path === "file_ids" ? "uploads" : path] = field.message;
    }
    setErrors((prev) => ({ ...prev, ...next }));
  }

  function buildPayload() {
    const structureFilled =
      structureTouched && !structureValues.every((value) => value === 0);
    return {
      brand_name: form.brand_name.trim(),
      contact_name: form.contact_name.trim(),
      phone: normalizePhone(form.phone),
      wechat: form.wechat.trim() || null,
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      entity_type: form.entity_type || null,
      is_first_time: form.is_first_time,
      categories: form.categories,
      zones: form.zones,
      expected_qty: toIntOrNull(form.expected_qty),
      price_min: toIntOrNull(form.price_min),
      price_max: toIntOrNull(form.price_max),
      structure: structureFilled
        ? {
            secondhand: structureValues[0],
            new_stock: structureValues[1],
            sample: structureValues[2],
            replica: structureValues[3],
          }
        : null,
      items: form.items
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          era_series: item.era_series.trim() || null,
          condition_source: item.condition_source.trim() || null,
          price: toIntOrNull(item.price),
        })),
      file_ids: uploadedFiles.map((file) => file.fileId),
      consent: true,
      source: "h5",
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollUnderHeader(summaryRef.current);
          summaryRef.current?.focus({ preventScroll: true });
        });
      });
      return;
    }

    if (!APPLICATION_API_ENABLED) {
      setErrors({});
      setGeneralError(null);
      setResult({
        id: 0,
        files: readyFiles.length,
        created_at: new Date().toISOString(),
        preview: true,
      });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await fetch(`${API_BASE}/api/v1/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 201 && data) {
        setResult(data as ApplicationResult);
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        return;
      }
      if (response.status === 422 && data) {
        const fields =
          (data as { error?: { fields?: ServerField[] } }).error?.fields ?? [];
        if (fields.length) applyServerErrors(fields);
        else setGeneralError(readApiMessage(data, "表单校验未通过，请检查后重试"));
      } else if (response.status === 413) {
        setGeneralError("附件合计超过限制，请压缩或减少文件后重试");
      } else if (response.status === 429) {
        setGeneralError("提交过于频繁，请稍候再试");
      } else {
        setGeneralError(readApiMessage(data, "提交失败，请稍后重试"));
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollUnderHeader(summaryRef.current);
          summaryRef.current?.focus({ preventScroll: true });
        });
      });
    } catch {
      setGeneralError("无法连接报名服务，请检查网络后重试");
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToError(key: string) {
    const element = document.getElementById(errorIdFor(key));
    scrollUnderHeader(element, "smooth");
    window.setTimeout(() => focusableIn(element)?.focus({ preventScroll: true }), 350);
  }

  function startAnother() {
    fileStore.current.clear();
    setForm(createInitialForm());
    setResult(null);
    setErrors({});
    setGeneralError(null);
    setSavedAt(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const errorEntries = Object.entries(errors);

  return (
    <div className="apply-page">
      <AppHeader />

      {!result && (
        <section className="apply-hero">
          <div className="apply-hero__inner">
          <p className="apply-hero__eyebrow">
            <span>66TH &amp; 2ND AVE.</span>
            <span>VINTAGE FASHION MARKET</span>
            <span>SHENZHEN / 2026</span>
          </p>
          <h1>
            <span>商家参展申请</span>
            <span className="apply-hero__title-rest">及意向登记表</span>
          </h1>
          <div className="apply-hero__bottom">
            <div>
              <p className="apply-hero__lead">
                请填写品牌信息、经营经验、本次拟带展内容及支持需求，便于主办方判断区域适配与合作安排。
              </p>
              <p className="apply-hero__note">
                线上表用于结构化登记；品牌故事、过往参展、展位与协助需求等补充材料，可在提交后发送至{" "}
                {CONTACT_EMAIL}，或下载 Word 完整表填写。
              </p>
              <p className="apply-hero__compact">
                2026.12.25—27 / 深圳华侨城创意文化园
                <br />
                完整资料 48 小时内反馈
              </p>
            </div>
            <dl className="apply-hero__meta">
              <div>
                <dt>DATES</dt>
                <dd>2026.12.25 Fri — 27 Sun</dd>
              </div>
              <div>
                <dt>VENUE</dt>
                <dd>深圳华侨城创意文化园</dd>
              </div>
              <div>
                <dt>FEEDBACK</dt>
                <dd>完整资料 48 小时内反馈</dd>
              </div>
            </dl>
          </div>
          <p className="apply-hero__note">
            本表仅用于报名与意向沟通，不收取报名费，不预留展位，不构成预约合同或正式参展承诺。
          </p>
          </div>
        </section>
      )}

      <main className="apply-main">
        {result ? (
          <section
            className="apply-success"
            aria-labelledby="success-title"
            ref={successRef}
          >
            <div className="apply-success__mark" aria-hidden="true">✓</div>
            <div>
              <p className="apply-hero__eyebrow">
                <span>{result.preview ? "STYLE PREVIEW" : "APPLICATION RECEIVED"}</span>
                <span>{result.preview ? "NO SUBMISSION" : `NO. ${result.id}`}</span>
              </p>
              <h2 id="success-title" tabIndex={-1}>
                {result.preview ? "样式预览完成" : "已收到你的申请"}
              </h2>
            </div>
            <p className="apply-success__lead">
              {result.preview
                ? "当前为商家参展申请页的样式预览。填写内容仅保留在本地浏览器，没有上传附件或提交报名数据。"
                : "感谢提交。主办方会核对品牌、货盘与区域意向，收到完整资料后将在 48 小时内发送参展合作协议，或反馈审核与补充资料需求。"}
            </p>
            <dl className="apply-success__meta">
              <div>
                <dt>{result.preview ? "当前状态" : "报名编号"}</dt>
                <dd>{result.preview ? "样式预览，未提交" : `NO. ${result.id}`}</dd>
              </div>
              <div>
                <dt>提交时间</dt>
                <dd>{formatDateTime(result.created_at)}</dd>
              </div>
              <div>
                <dt>{result.preview ? "已选附件" : "已绑定附件"}</dt>
                <dd>{result.files} 个</dd>
              </div>
            </dl>
            <div className="apply-success__note">
              <strong>{result.preview ? "说明" : "接下来"}</strong>
              <p>
                {result.preview ? (
                  <>
                    正式提交接口开放后，可在此完成附件上传与报名。当前页面可继续用于视觉和交互审核，
                    如需补充资料可联系{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。
                  </>
                ) : (
                  <>
                    可补充品牌简介、5–10 张代表商品图、店铺或陈列照片、商品明细与年代 / 来源说明，
                    发送至 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。
                    未回复不视为录取；最终商品、区域、费用和服务以双方签署文件为准。
                  </>
                )}
              </p>
            </div>
            <div className="apply-success__actions">
              <a href="./app.html">返回活动首页 <span className="arrow" aria-hidden="true">↗</span></a>
              <button type="button" onClick={startAnother}>
                {result.preview ? "重新预览" : "再提交一份"}
              </button>
            </div>
          </section>
        ) : (
          <div className="apply-layout">
            <form className="apply-form" noValidate onSubmit={handleSubmit}>
              {!APPLICATION_API_ENABLED && (
                <div className="preview-notice" role="status">
                  <strong>样式预览版</strong>
                  <p>表单可正常填写与校验，附件和报名数据暂不会上传至报名系统。</p>
                </div>
              )}

              {(errorEntries.length > 0 || generalError) && (
                <div
                  className="error-summary"
                  role="alert"
                  tabIndex={-1}
                  ref={summaryRef}
                >
                  <strong>请检查以下内容</strong>
                  {generalError && <p>{generalError}</p>}
                  {errorEntries.length > 0 && (
                    <ul>
                      {errorEntries.map(([key, message]) => (
                        <li key={key}>
                          <button type="button" onClick={() => scrollToError(key)}>
                            {message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <section className="form-section" id="brand" aria-labelledby="brand-title">
                <div className="form-section__head">
                  <span className="form-section__num">01</span>
                  <h2 id="brand-title">品牌与联络</h2>
                  <p className="form-section__label">BRAND &amp; CONTACT</p>
                  <p className="form-section__intro">
                    用于核对经营主体、区域适配和后续合同联络。带 * 的字段为必填。
                  </p>
                </div>

                <div className="field-grid">
                  <div className={`field field--full ${errors.brand_name ? "has-error" : ""}`}>
                    <label className="field__label" htmlFor="brand_name">
                      <span>品牌 / 店铺名称 <span className="field__required">*</span></span>
                    </label>
                    <input
                      className="apply-input"
                      id="brand_name"
                      name="brand_name"
                      value={form.brand_name}
                      maxLength={120}
                      autoComplete="organization"
                      placeholder="例如：拾光中古"
                      onChange={(event) => {
                        update("brand_name", event.target.value);
                        clearError("brand_name");
                      }}
                    />
                    {errors.brand_name && <p className="field__error">{errors.brand_name}</p>}
                  </div>

                  <div className="field">
                    <p className="field__label" id="entity-type-label">经营主体类型</p>
                    <div className="segmented" role="group" aria-labelledby="entity-type-label">
                      {ENTITY_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          aria-pressed={form.entity_type === type.value}
                          onClick={() => {
                            update(
                              "entity_type",
                              form.entity_type === type.value ? "" : type.value,
                            );
                          }}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                    <p className="field__hint">可再次点击取消选择</p>
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="city">
                      <span>所在城市</span>
                    </label>
                    <input
                      className="apply-input"
                      id="city"
                      name="city"
                      value={form.city}
                      maxLength={60}
                      autoComplete="address-level2"
                      placeholder="深圳"
                      onChange={(event) => {
                        update("city", event.target.value);
                        clearError("city");
                      }}
                    />
                    {errors.city && <p className="field__error">{errors.city}</p>}
                  </div>

                  <div className={`field ${errors.contact_name ? "has-error" : ""}`}>
                    <label className="field__label" htmlFor="contact_name">
                      <span>联系人姓名 <span className="field__required">*</span></span>
                    </label>
                    <input
                      className="apply-input"
                      id="contact_name"
                      name="contact_name"
                      value={form.contact_name}
                      maxLength={60}
                      autoComplete="name"
                      placeholder="姓名及职务"
                      onChange={(event) => {
                        update("contact_name", event.target.value);
                        clearError("contact_name");
                      }}
                    />
                    {errors.contact_name && (
                      <p className="field__error">{errors.contact_name}</p>
                    )}
                  </div>

                  <div className={`field ${errors.phone ? "has-error" : ""}`}>
                    <label className="field__label" htmlFor="phone">
                      <span>手机号码 <span className="field__required">*</span></span>
                    </label>
                    <input
                      className="apply-input"
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      autoComplete="tel"
                      placeholder="138 0000 0000"
                      onChange={(event) => {
                        update("phone", event.target.value);
                        clearError("phone");
                        clearError("contact");
                      }}
                    />
                    {errors.phone && <p className="field__error">{errors.phone}</p>}
                  </div>

                  <div className={`field ${errors.wechat ? "has-error" : ""}`}>
                    <label className="field__label" htmlFor="wechat">
                      <span>微信</span>
                    </label>
                    <input
                      className="apply-input"
                      id="wechat"
                      name="wechat"
                      value={form.wechat}
                      maxLength={60}
                      autoComplete="off"
                      placeholder="微信号"
                      onChange={(event) => {
                        update("wechat", event.target.value);
                        clearError("wechat");
                        clearError("contact");
                      }}
                    />
                    {errors.wechat && <p className="field__error">{errors.wechat}</p>}
                  </div>

                  <div className={`field ${errors.email ? "has-error" : ""}`}>
                    <label className="field__label" htmlFor="email">
                      <span>商务邮箱</span>
                    </label>
                    <input
                      className="apply-input"
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      maxLength={120}
                      autoComplete="email"
                      placeholder="name@brand.com"
                      onChange={(event) => {
                        update("email", event.target.value);
                        clearError("email");
                        clearError("contact");
                      }}
                    />
                    {errors.email && <p className="field__error">{errors.email}</p>}
                  </div>

                  <div className="field field--full" id="field-contact">
                    {errors.contact && (
                      <p className="field__error">{errors.contact}</p>
                    )}
                    {!errors.contact && (
                      <p className="field__hint">
                        微信与邮箱至少填写一项，用于发送合同、审核结果与后续联络。
                      </p>
                    )}
                  </div>

                  <div className="field field--full">
                    <label className="check-chip" htmlFor="is_first_time" style={{ maxWidth: 320 }}>
                      <input
                        type="checkbox"
                        id="is_first_time"
                        checked={form.is_first_time}
                        onChange={(event) => update("is_first_time", event.target.checked)}
                      />
                      <span className="check-chip__mark" aria-hidden="true">
                        {form.is_first_time ? "✓" : ""}
                      </span>
                      <span>首次参加 66th &amp; 2nd 市集</span>
                    </label>
                  </div>
                </div>
              </section>

              <section
                className="form-section"
                id="categories"
                aria-labelledby="categories-title"
              >
                <div className="form-section__head">
                  <span className="form-section__num">02</span>
                  <h2 id="categories-title">经营品类与意向区域</h2>
                  <p className="form-section__label">CATEGORIES &amp; ZONES</p>
                  <p className="form-section__intro">
                    区域可多选，最终由主办方结合实际带展商品审核与安排。
                  </p>
                </div>

                <div className="field-grid">
                  <div className="field field--full" id="field-categories">
                    <p className="field__label">
                      <span>经营品类 <span className="field__required">*</span></span>
                      <span className="field__hint">可多选</span>
                    </p>
                    <div className="check-grid">
                      {CATEGORIES.map((category) => (
                        <label className="check-chip" key={category.value}>
                          <input
                            type="checkbox"
                            id={`category-${category.value}`}
                            checked={form.categories.includes(category.value)}
                            onChange={() => toggleCategory(category.value)}
                          />
                          <span className="check-chip__mark" aria-hidden="true">
                            {form.categories.includes(category.value) ? "✓" : ""}
                          </span>
                          <span>{category.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.categories && (
                      <p className="field__error">{errors.categories}</p>
                    )}
                  </div>

                  <div className="field field--full" id="field-zones">
                    <p className="field__label">
                      <span>意向区域 <span className="field__required">*</span></span>
                      <span className="field__hint">可多选</span>
                    </p>
                    <div className="zone-grid">
                      {ZONES.map((zone) => (
                        <label className="zone-option" key={zone.value}>
                          <input
                            type="checkbox"
                            id={`zone-${zone.value}`}
                            checked={form.zones.includes(zone.value)}
                            onChange={() => toggleZone(zone.value)}
                          />
                          <span className="zone-option__letter" aria-hidden="true">
                            {zone.value}
                          </span>
                          <span className="zone-option__title">
                            {zone.value} 区 · {zone.title}
                          </span>
                          <span className="zone-option__desc">{zone.desc}</span>
                        </label>
                      ))}
                      <div className="zone-option zone-option--off">
                        <span className="zone-option__letter" aria-hidden="true">D</span>
                        <span className="zone-option__title">D 区 · Living、餐饮酒水等</span>
                        <span className="zone-option__desc">
                          器皿、手帐、周边、香氛或餐饮酒水另行签约，不在线上表单范围内。
                          <a
                            className="zone-option__off"
                            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("66th D 区合作咨询")}`}
                          >
                            邮件咨询 D 区 ↗
                          </a>
                        </span>
                      </div>
                    </div>
                    {errors.zones && <p className="field__error">{errors.zones}</p>}
                  </div>
                </div>
              </section>

              <section
                className="form-section"
                id="inventory"
                aria-labelledby="inventory-title"
              >
                <div className="form-section__head">
                  <span className="form-section__num">03</span>
                  <h2 id="inventory-title">本次货盘</h2>
                  <p className="form-section__label">INVENTORY PLAN</p>
                  <p className="form-section__intro">
                    请区别于日常全部货盘，填写本次拟带到现场的商品与价格结构。
                  </p>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label className="field__label" htmlFor="expected_qty">
                      <span>预计带货数量</span>
                    </label>
                    <span className="input-unit">
                      <input
                        className="apply-input"
                        id="expected_qty"
                        name="expected_qty"
                        inputMode="numeric"
                        value={form.expected_qty}
                        placeholder="0"
                        onChange={(event) =>
                          update("expected_qty", toDigits(event.target.value, 7))
                        }
                      />
                      <span className="input-unit__unit">件</span>
                    </span>
                  </div>

                  <div className="field">
                    <p className="field__label">价格范围</p>
                    <div className="field-grid" style={{ gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                      <span className="input-unit">
                        <input
                          className="apply-input"
                          id="price_min"
                          name="price_min"
                          inputMode="numeric"
                          aria-label="价格下限"
                          value={form.price_min}
                          placeholder="最低"
                          onChange={(event) => {
                            update("price_min", toDigits(event.target.value, 9));
                            clearError("price_max");
                          }}
                        />
                        <span className="input-unit__unit">元</span>
                      </span>
                      <span className="input-unit">
                        <input
                          className={`apply-input ${errors.price_max ? "is-invalid" : ""}`}
                          id="price_max"
                          name="price_max"
                          inputMode="numeric"
                          aria-label="价格上限"
                          value={form.price_max}
                          placeholder="最高"
                          onChange={(event) => {
                            update("price_max", toDigits(event.target.value, 9));
                            clearError("price_max");
                          }}
                        />
                        <span className="input-unit__unit">元</span>
                      </span>
                    </div>
                    {errors.price_max && (
                      <p className="field__error">{errors.price_max}</p>
                    )}
                  </div>

                  <div className="field field--full" id="field-structure">
                    <p className="field__label">
                      <span>商品结构</span>
                      <span className="field__hint">按件数，每件择一归类</span>
                    </p>
                    <div className="structure">
                      <div className="structure__fields">
                        {STRUCTURE_FIELDS.map((field) => (
                          <label className="field" key={field.key}>
                            <span className="field__label">{field.label}</span>
                            <span className="input-unit">
                              <input
                                className="apply-input"
                                id={`structure-${field.key}`}
                                name={`structure_${field.key}`}
                                inputMode="numeric"
                                value={form.structure[field.key]}
                                placeholder="0"
                                onBlur={(event) => {
                                  const value = Number.parseInt(event.target.value || "0", 10);
                                  updateStructure(
                                    field.key,
                                    String(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))),
                                  );
                                }}
                                onChange={(event) =>
                                  updateStructure(field.key, event.target.value)
                                }
                              />
                              <span className="input-unit__unit">%</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <div
                        className={`structure__total ${!structureIsValid ? "is-error" : ""}`}
                      >
                        <span>
                          {!structureTouched
                            ? "填写后四项合计须为 100%"
                            : structureValues.every((value) => value === 0)
                              ? "未填写时不提交商品结构"
                              : structureTotal === 100
                                ? "已完整"
                                : `还差 ${100 - structureTotal}%`}
                        </span>
                        <strong>{structureTotal}%</strong>
                      </div>
                      <div className="structure__bar" aria-hidden="true">
                        {structureValues.map((value, index) => (
                          <span
                            key={STRUCTURE_FIELDS[index].key}
                            style={{
                              width: `${Math.max(0, Math.min(100, value))}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {errors.structure && (
                      <p className="field__error">{errors.structure}</p>
                    )}
                  </div>

                  <div className="field field--full">
                    <p className="field__label">
                      <span>代表商品</span>
                      <span className="field__hint">建议 3–5 件，最多 20 件</span>
                    </p>
                    <div className="items">
                      <div className="items__head" aria-hidden="true">
                        <span>商品及品牌</span>
                        <span>年代 / 系列或库存属性</span>
                        <span>状态及来源</span>
                        <span>拟售价</span>
                        <span />
                      </div>
                      {form.items.map((item, index) => (
                        <div className="item-row" key={item.key}>
                          <span className="item-row__index">商品 {String(index + 1).padStart(2, "0")}</span>
                          <label className="field" htmlFor={`item-${index}-name`}>
                            <span className="field__label">商品及品牌</span>
                            <input
                              className="apply-input"
                              id={`item-${index}-name`}
                              value={item.name}
                              maxLength={120}
                              placeholder="例如：Hermès Birkin 30 金棕"
                              onChange={(event) =>
                                updateItem(index, "name", event.target.value)
                              }
                            />
                            {errors[`items[${index}].name`] && (
                              <span className="field__error">
                                {errors[`items[${index}].name`]}
                              </span>
                            )}
                          </label>
                          <label className="field" htmlFor={`item-${index}-era`}>
                            <span className="field__label">年代 / 系列或库存属性</span>
                            <input
                              className="apply-input"
                              id={`item-${index}-era`}
                              value={item.era_series}
                              maxLength={200}
                              placeholder="2015 年 / Birkin"
                              onChange={(event) =>
                                updateItem(index, "era_series", event.target.value)
                              }
                            />
                          </label>
                          <label className="field" htmlFor={`item-${index}-condition`}>
                            <span className="field__label">状态及来源</span>
                            <input
                              className="apply-input"
                              id={`item-${index}-condition`}
                              value={item.condition_source}
                              maxLength={200}
                              placeholder="二手 / 附购买凭证"
                              onChange={(event) =>
                                updateItem(index, "condition_source", event.target.value)
                              }
                            />
                          </label>
                          <label className="field" htmlFor={`item-${index}-price`}>
                            <span className="field__label">拟售价</span>
                            <span className="input-unit">
                              <input
                                className="apply-input"
                                id={`item-${index}-price`}
                                inputMode="numeric"
                                value={item.price}
                                placeholder="0"
                                onChange={(event) =>
                                  updateItem(index, "price", toDigits(event.target.value, 9))
                                }
                              />
                              <span className="input-unit__unit">元</span>
                            </span>
                            {errors[`items[${index}].price`] && (
                              <span className="field__error">
                                {errors[`items[${index}].price`]}
                              </span>
                            )}
                          </label>
                          <button
                            className="item-row__remove"
                            type="button"
                            aria-label={`删除商品 ${index + 1}`}
                            disabled={form.items.length === 1}
                            onClick={() => removeItem(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="items__actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={addItem}
                        disabled={form.items.length >= 20}
                      >
                        + 添加代表商品
                      </button>
                      <p className="field__hint">
                        A 区请重点说明年份 / 系列 / 来源；C 区请注明新品、二手或瑕疵属性。
                      </p>
                    </div>
                    {errors.items && <p className="field__error">{errors.items}</p>}
                  </div>
                </div>
              </section>

              <section
                className="form-section"
                id="attachments"
                aria-labelledby="attachments-title"
              >
                <div className="form-section__head">
                  <span className="form-section__num">04</span>
                  <h2 id="attachments-title">资料与附件</h2>
                  <p className="form-section__label">DOCUMENTS &amp; PHOTOS</p>
                  <p className="form-section__intro">
                    建议将品牌简介、代表商品图、商品明细与说明整理为一个 ZIP
                    包上传，便于主办方集中审核。
                  </p>
                </div>

                <div className="field field--full" id="field-uploads">
                  <div className="field__label">
                    <span>附件</span>
                    <span className="field__hint">
                      {APPLICATION_API_ENABLED ? "已上传" : "已选择"} {readyFiles.length} / {MAX_FILES}
                    </span>
                  </div>

                  <div className="upload-kind" role="group" aria-label="附件分类">
                    {UPLOAD_KINDS.map((kind) => (
                      <button
                        key={kind.value}
                        type="button"
                        aria-pressed={uploadKind === kind.value}
                        onClick={() => setUploadKind(kind.value)}
                      >
                        {kind.label}
                      </button>
                    ))}
                  </div>

                  <label
                    className={`dropzone ${dragOver ? "is-over" : ""}`}
                    htmlFor="apply-files"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOver(false);
                      void addFiles(event.dataTransfer.files);
                    }}
                  >
                    <input
                      id="apply-files"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.zip"
                      onChange={(event) => {
                        if (event.target.files) void addFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <span className="dropzone__recommendation">建议打包上传</span>
                    <span className="dropzone__title">
                      {uploadingCount ? "正在上传附件…" : "拖放文件到这里，或点击选择"}
                    </span>
                    <span className="dropzone__hint">
                      优先上传 ZIP 压缩包；JPG、PNG、WebP、HEIC、PDF 也可单独上传
                    </span>
                    <span className="dropzone__limit">
                      单个文件不超过 {MAX_FILE_MB} MB / 合计不超过 {MAX_TOTAL_MB} MB
                    </span>
                    <span className="dropzone__action" aria-hidden="true">
                      {uploadingCount ? (
                        <>
                          <span className="spinner" /> 上传中
                        </>
                      ) : (
                        <>+ 选择文件</>
                      )}
                    </span>
                  </label>

                  {uploadNotice && <p className="field__error">{uploadNotice}</p>}
                  {errors.uploads && <p className="field__error">{errors.uploads}</p>}

                  {form.files.length > 0 && (
                    <div className="upload-list">
                      {form.files.map((file) => (
                        <div className="upload-row" key={file.localId}>
                          <p className="upload-row__name" title={file.name}>
                            {file.name}
                          </p>
                          <div className="upload-row__meta">
                            <span>{UPLOAD_KINDS.find((kind) => kind.value === file.kind)?.label}</span>
                            <span>{formatSize(file.size)}</span>
                            <span
                              className={`upload-row__state ${
                                file.status === "done"
                                  ? "is-done"
                                  : file.status === "error"
                                    ? "is-error"
                                    : ""
                              }`}
                            >
                              {file.status === "uploading" && (
                                <>
                                  <span className="spinner" /> 上传中
                                </>
                              )}
                              {APPLICATION_API_ENABLED && file.status === "done" && "已上传"}
                              {!APPLICATION_API_ENABLED && file.status === "done" && "已选择（预览）"}
                              {file.status === "error" && (file.message || "上传失败")}
                            </span>
                            {file.status === "error" && fileStore.current.has(file.localId) && (
                              <button
                                className="text-button"
                                type="button"
                                onClick={() => void retryUpload(file.localId)}
                              >
                                重试
                              </button>
                            )}
                          </div>
                          <button
                            className="upload-row__remove"
                            type="button"
                            aria-label={`移除 ${file.name}`}
                            onClick={() => removeUpload(file.localId)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="field__hint">
                    {APPLICATION_API_ENABLED
                      ? "建议将多张图片和商品清单合并为一个 ZIP 包。附件上传后需完成提交才会绑定到报名；未提交的文件不会进入审核。"
                      : "建议将多张图片和商品清单合并为一个 ZIP 包。当前为样式预览，附件只在本页展示，不会上传至服务器。"}
                  </p>
                </div>
              </section>

              <section className="form-section" id="confirm" aria-labelledby="confirm-title">
                <div className="form-section__head">
                  <span className="form-section__num">05</span>
                  <h2 id="confirm-title">确认提交</h2>
                  <p className="form-section__label">REVIEW &amp; CONSENT</p>
                  <p className="form-section__intro">
                    请核对关键信息。提交后，主办方将在 48 小时内反馈审核结果或补充资料需求。
                  </p>
                </div>

                <div className="review">
                  <div className="review__row">
                    <span className="review__label">品牌</span>
                    <span>{form.brand_name || "未填写"}</span>
                    <a className="review__edit" href="#brand">修改</a>
                  </div>
                  <div className="review__row">
                    <span className="review__label">联络</span>
                    <span>
                      {[form.contact_name, form.phone, form.wechat, form.email]
                        .filter(Boolean)
                        .join(" / ") || "未填写"}
                    </span>
                    <a className="review__edit" href="#brand">修改</a>
                  </div>
                  <div className="review__row">
                    <span className="review__label">品类</span>
                    <span>
                      {form.categories
                        .map((value) => CATEGORIES.find((item) => item.value === value)?.label)
                        .filter(Boolean)
                        .join("、") || "未选择"}
                    </span>
                    <a className="review__edit" href="#categories">修改</a>
                  </div>
                  <div className="review__row">
                    <span className="review__label">意向区域</span>
                    <span>{form.zones.length ? `${form.zones.join(" / ")} 区` : "未选择"}</span>
                    <a className="review__edit" href="#categories">修改</a>
                  </div>
                  <div className="review__row">
                    <span className="review__label">货盘</span>
                    <span>
                      {form.expected_qty ? `约 ${form.expected_qty} 件 · ` : ""}
                      {priceText}
                      {structureText ? ` · ${structureText}` : ""}
                    </span>
                    <a className="review__edit" href="#inventory">修改</a>
                  </div>
                  <div className="review__row">
                    <span className="review__label">代表商品</span>
                    <span>{filledItems.length ? `${filledItems.length} 件` : "未填写"}</span>
                    <a className="review__edit" href="#inventory">修改</a>
                  </div>
                  <div className="review__row">
                    <span className="review__label">附件</span>
                    <span>
                      {readyFiles.length
                        ? `${readyFiles.length} 个${APPLICATION_API_ENABLED ? "已上传" : "已选择"}`
                        : "未上传"}
                    </span>
                    <a className="review__edit" href="#attachments">修改</a>
                  </div>
                </div>

                <div className={`consent ${errors.consent ? "has-error" : ""}`} id="field-consent">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={form.consent}
                    onChange={(event) => {
                      update("consent", event.target.checked);
                      clearError("consent");
                    }}
                  />
                  <label htmlFor="consent">
                    我确认有权代表本品牌提交资料，信息真实；最终商品、区域、费用和服务以双方签署文件为准。
                    <span className="field__required"> *</span>
                    {errors.consent && (
                      <span className="field__error" style={{ marginTop: 6 }}>
                        {errors.consent}
                      </span>
                    )}
                  </label>
                </div>

                <details className="privacy">
                  <summary>资料使用与隐私说明</summary>
                  <div className="privacy__body">
                    <p>
                      资料处理方：巴洛塔（深圳）文化传播有限公司。资料仅用于本次审核、联络及签约准备，
                      限经授权的工作人员处理。
                    </p>
                    <p>
                      未签约申请将在招募结束后 90 日内删除或匿名化，争议处理及依法必须留存的除外。
                      可向 {CONTACT_EMAIL} 申请查阅、更正、删除或撤回申请；签约后按合同履行所需及法定期限保存。
                    </p>
                    <p>
                      品牌名称、Logo 及商品图用于本届招商 / 活动宣传前，会另行取得确认；
                      涉及个人肖像须另获许可。该项授权不影响本次报名。
                    </p>
                  </div>
                </details>

                <div className="submit-panel">
                  <div className="submit-panel__actions">
                    <button className="submit-button" type="submit" disabled={submitting}>
                      <span>
                        {submitting
                          ? "正在提交…"
                          : APPLICATION_API_ENABLED
                            ? "提交参展申请"
                            : "预览提交"}
                      </span>
                      <span className="arrow" aria-hidden="true">
                        {submitting ? "…" : "↗"}
                      </span>
                    </button>
                    <button
                      className="text-button text-button--danger"
                      type="button"
                      onClick={clearDraft}
                    >
                      清空本机草稿
                    </button>
                  </div>
                  <div className="submit-panel__foot">
                    <span>
                      {savedAt ? `草稿已自动保存 · ${formatSavedAt(savedAt)}` : "草稿会保存在本机浏览器"}
                    </span>
                    <span>
                      {APPLICATION_API_ENABLED
                        ? "提交即表示已阅读资料使用说明"
                        : "预览提交不会发送报名数据"}
                    </span>
                  </div>
                </div>
              </section>
            </form>

            <aside className="apply-aside" aria-label="报名须知">
              <nav className="aside-nav" aria-label="表单目录">
                {SECTIONS.map((section, index) => (
                  <a href={`#${section.id}`} key={section.id}>
                    <span>
                      {section.num} / {section.title}
                    </span>
                    {index < 2 && formComplete[index] ? (
                      <span className="aside-nav__state is-done" aria-label="已完成">
                        ✓
                      </span>
                    ) : index < 2 ? (
                      <span className="aside-nav__state" aria-hidden="true" />
                    ) : index === 4 && form.consent ? (
                      <span className="aside-nav__state is-done" aria-label="已完成">
                        ✓
                      </span>
                    ) : (
                      <span className="aside-nav__state" aria-hidden="true" />
                    )}
                  </a>
                ))}
              </nav>

              <div className="aside-block">
                <h2>报名要点 / KEY NOTES</h2>
                <dl className="aside-block__list">
                  <div>
                    <dt>区域</dt>
                    <dd>A / B / C 区可多选，D 区另行签约</dd>
                  </div>
                  <div>
                    <dt>附件</dt>
                    <dd>
                      建议打包为 ZIP，最多 10 个，单个 {MAX_FILE_MB} MB，合计 {MAX_TOTAL_MB} MB
                    </dd>
                  </div>
                  <div>
                    <dt>反馈</dt>
                    <dd>完整资料 48 小时内，未回复不视为录取</dd>
                  </div>
                  <div>
                    <dt>费用</dt>
                    <dd>不收取报名费，不预留展位</dd>
                  </div>
                </dl>
              </div>

              <div className="aside-note">
                <strong>补充资料</strong>
                <p>
                  品牌故事、过往参展经历、展位与协助需求等定性内容，可在提交后发送至主办方，
                  或下载 Word 完整表填写。
                </p>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("66th 商家参展申请补充资料")}`}>
                  发送补充资料 ↗
                </a>
                <a href={DOCX_URL} download>
                  下载 Word 完整表 ↓
                </a>
              </div>

              <div className="aside-contact">
                <span>提交及咨询</span>
                <strong>Buzz Lu</strong>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </div>
            </aside>
          </div>
        )}
      </main>

      <ApplyFooter />
    </div>
  );
}
