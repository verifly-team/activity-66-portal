import { useEffect, useRef, useState, type FormEvent } from "react";
import brandFallback from "./assets/optimized/brand.png";
import brandWebp from "./assets/optimized/brand.webp";
import "./apply.css";
import { ArrowIcon } from "./ArrowIcon";

const IS_STANDALONE_BUILD =
  typeof document !== "undefined" &&
  document.documentElement.dataset.standalone === "true";
const HOME_HREF = IS_STANDALONE_BUILD ? "./index.html" : "./app.html";
const FAQ_HREF = IS_STANDALONE_BUILD ? "./faq-standalone.html" : "./faq.html";

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
const MAX_FILE_MB = 20;
const MAX_TOTAL_MB = 100;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120_000;
const SUBMIT_TIMEOUT_MS = 180_000;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "pdf", "zip"];
const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
const SCHEMA_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

const DEFAULT_FEEDBACK =
  "提交后，主办方将在 48 小时内反馈审核结果或补充资料需求。2026.11.8 为第一轮公开招募截止时间，统一回复时间为 2026.11.10；2026.11.28 为最终轮公开招募截止时间，统一回复时间为 2026.12.1。";
const DEFAULT_ITEMS_HINT =
  "添加代表商品可增加店家品牌力，显示商家独特性，会增加入选概率";

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
    title: "收藏级 Archive",
    desc: "具年代、系列或出处依据的收藏级服饰与藏品",
  },
  {
    value: "B",
    title: "工装与街头",
    desc: "相关品牌的二手服饰",
  },
  {
    value: "C",
    title: "二手名牌／样衣",
    desc: "过季清仓与样衣；新品和二手须分别标示",
  },
  {
    value: "D",
    title: "D 区（新增开放）",
    desc: "本期新增开放网页报名；具体经营内容与陈列安排由主办方审核确认",
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
  { id: "profile", num: "04", title: "品牌背景与经营情况" },
  { id: "attachments", num: "05", title: "资料与附件" },
  { id: "confirm", num: "06", title: "确认提交" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type Zone = string;
type EntityType = (typeof ENTITY_TYPES)[number]["value"];
type StructureKey = (typeof STRUCTURE_FIELDS)[number]["key"];
type UploadKind = (typeof UPLOAD_KINDS)[number]["value"];
type ZoneOption = { value: string; title: string; desc?: string };
type QuestionType =
  | "year"
  | "url_list"
  | "textarea"
  | "multi"
  | "single"
  | "bool";
type QuestionValue = string | string[] | boolean | null;
type SchemaOption = { value: string | boolean; label: string };
type SchemaQuestion = {
  key: string;
  label: string;
  type: QuestionType;
  required: boolean;
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  min_items?: number;
  max_items?: number;
  min_length?: number;
  max_length?: number;
  options?: SchemaOption[];
};
type SchemaGroup = { title: string; questions: SchemaQuestion[] };
type FormSchema = {
  version: string;
  enforced: boolean;
  requiredHint: string;
  feedback: string;
  itemsHint: string;
  zones: ZoneOption[];
  groups: SchemaGroup[];
};

const DEFAULT_SCHEMA_GROUPS: SchemaGroup[] = [
  {
    title: "1. 品牌联络与定位特色",
    questions: [
      {
        key: "founded_year",
        label: "品牌成立年份",
        type: "year",
        required: true,
        min: 1900,
        max: 2100,
        help: "填四位年份，例如 2018",
      },
      {
        key: "social_links",
        label: "Instagram / 小红书 / 抖音",
        type: "url_list",
        required: true,
        min_items: 1,
        max_items: 5,
        placeholder: "https://...",
        help: "可多填，需以 http:// 或 https:// 开头",
      },
      {
        key: "brand_intro",
        label: "品牌简介",
        type: "textarea",
        required: true,
        min_length: 100,
        max_length: 300,
        help: "100–300 字",
      },
      {
        key: "channels",
        label: "主要经营渠道",
        type: "multi",
        required: true,
        min_items: 1,
        options: [
          { value: "online_store", label: "线上店铺" },
          { value: "physical_store", label: "线下实体店" },
          { value: "personal_social", label: "个人社交媒体" },
          { value: "market_stall", label: "市集摆摊" },
          { value: "multi_channel", label: "多渠道经营" },
        ],
      },
      {
        key: "has_physical_store",
        label: "是否有实体店？",
        type: "bool",
        required: true,
        options: [
          { value: true, label: "有" },
          { value: false, label: "没有" },
        ],
      },
      {
        key: "attended_other_events",
        label: "是否参加过其他市集或展会？",
        type: "bool",
        required: true,
        options: [
          { value: true, label: "有" },
          { value: false, label: "没有" },
        ],
      },
      {
        key: "past_experience",
        label: "过往参展经历",
        type: "textarea",
        required: false,
        max_length: 1000,
        help: "选填，简单描述参加过哪些市集或展会",
      },
    ],
  },
  {
    title: "2. 品牌定位与特色",
    questions: [
      {
        key: "brand_specialty",
        label: "你认为自己的品牌最有特色的地方是什么？",
        type: "textarea",
        required: true,
        min_length: 100,
        max_length: 300,
        help: "100–300 字",
      },
      {
        key: "target_consumers",
        label: "你的品牌主要面向哪一类消费者？",
        type: "single",
        required: true,
        options: [
          { value: "vintage", label: "Vintage／古着爱好者" },
          { value: "street", label: "潮流及街头文化消费者" },
          { value: "designer", label: "Designer／奢侈品消费者" },
          { value: "young", label: "年轻消费群体" },
          { value: "collector", label: "收藏爱好者" },
          { value: "other", label: "其他" },
        ],
      },
      {
        key: "planned_activities",
        label: "本次是否有计划推出特别商品或活动？",
        type: "multi",
        required: true,
        min_items: 1,
        help: "选「没有特别安排」时不能再选其他",
        options: [
          { value: "limited", label: "限量商品" },
          { value: "first_release", label: "首次公开发售" },
          { value: "discount", label: "特别折扣" },
          { value: "collab", label: "品牌联名" },
          { value: "onsite", label: "现场互动活动" },
          { value: "pr_license", label: "品牌合作及宣传授权" },
          { value: "none", label: "没有特别安排" },
        ],
      },
    ],
  },
  {
    title: "3. 品牌意愿与授权",
    questions: [
      {
        key: "willing_to_promote",
        label: "是否愿意配合主办方进行活动前的品牌宣传？",
        type: "single",
        required: true,
        options: [
          {
            value: "provide_material",
            label:
              "愿意提供品牌照片及商品素材；配合品牌介绍及社交媒体宣传；转发官方活动宣传",
          },
          { value: "need_talk", label: "希望主办方与我们进一步沟通" },
        ],
      },
      {
        key: "authorize_media",
        label:
          "是否同意主办方在活动宣传及回顾中使用品牌提供的照片、商品图片及品牌名称？",
        type: "single",
        required: true,
        options: [
          { value: "agree", label: "同意" },
          { value: "need_scope", label: "需要另行确认授权范围" },
        ],
      },
    ],
  },
];

const DEFAULT_SCHEMA: FormSchema = {
  version: "v2",
  enforced: false,
  requiredHint: "带 * 为必填项",
  feedback: DEFAULT_FEEDBACK,
  itemsHint: DEFAULT_ITEMS_HINT,
  zones: ZONES.map((zone) => ({ ...zone })),
  groups: DEFAULT_SCHEMA_GROUPS,
};

const DEFAULT_QUESTIONS = DEFAULT_SCHEMA_GROUPS.flatMap(
  (group) => group.questions,
);
const REQUIRED_SCHEMA_ZONES = ["A", "B", "C", "D"];
const REQUIRED_QUESTION_KEYS = DEFAULT_QUESTIONS.map((question) => question.key);
const RESERVED_QUESTION_KEYS = new Set([
  "brand_name",
  "contact_name",
  "phone",
  "wechat",
  "email",
  "city",
  "entity_type",
  "is_first_time",
  "categories",
  "zones",
  "expected_qty",
  "price_min",
  "price_max",
  "structure",
  "items",
  "file_ids",
  "consent",
  "source",
]);

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
  answers: Record<string, QuestionValue>;
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

function emptyAnswer(question: SchemaQuestion): QuestionValue {
  if (question.type === "multi") return [];
  if (question.type === "url_list") return [""];
  if (question.type === "bool") return null;
  return "";
}

function createInitialAnswers() {
  return Object.fromEntries(
    DEFAULT_QUESTIONS.map((question) => [
      question.key,
      emptyAnswer(question),
    ]),
  );
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
    answers: createInitialAnswers(),
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
        answers:
          parsed.answers && typeof parsed.answers === "object"
            ? { ...base.answers, ...parsed.answers }
            : base.answers,
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

function textLength(value: string) {
  return Array.from(value.trim()).length;
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function structureState(sourceForm: FormState) {
  const values = STRUCTURE_FIELDS.map((field) =>
    Number.parseInt(sourceForm.structure[field.key] || "0", 10),
  );
  const touched = STRUCTURE_FIELDS.some(
    (field) => sourceForm.structure[field.key] !== "",
  );
  const total = values.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
  return {
    values,
    touched,
    total,
    filled: touched && !values.every((value) => value === 0),
    valid:
      !touched || values.every((value) => value === 0) || total === 100,
  };
}

function ensureHttpProtocol(value: string) {
  const link = value.trim();
  if (
    !link ||
    /^https?:\/\//i.test(link) ||
    /^[a-z][a-z0-9+.-]*:/i.test(link)
  ) {
    return link;
  }
  return link.startsWith("//") ? `https:${link}` : `https://${link}`;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function answerAsString(value: QuestionValue | undefined) {
  return typeof value === "string" ? value : "";
}

function answerAsStrings(value: QuestionValue | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function answerAsBool(value: QuestionValue | undefined) {
  return typeof value === "boolean" ? value : null;
}

function questionAnswered(question: SchemaQuestion, value: QuestionValue | undefined) {
  if (question.type === "bool") return typeof value === "boolean";
  if (question.type === "multi" || question.type === "url_list") {
    return uniqueStrings(answerAsStrings(value)).length > 0;
  }
  return answerAsString(value).trim().length > 0;
}

function schemaQuestions(schema: FormSchema) {
  return schema.groups.flatMap((group) => group.questions);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeOption(value: unknown): SchemaOption | null {
  const option = asRecord(value);
  if (!option || typeof option.label !== "string") return null;
  if (typeof option.value !== "string" && typeof option.value !== "boolean") {
    return null;
  }
  return { value: option.value, label: option.label };
}

function normalizeQuestion(
  value: unknown,
  fallback?: SchemaQuestion,
): SchemaQuestion | null {
  const question = asRecord(value);
  if (!question || typeof question.key !== "string" || !question.key.trim()) {
    return null;
  }
  const key = question.key.trim();
  if (!SCHEMA_KEY_RE.test(key) || RESERVED_QUESTION_KEYS.has(key)) return null;
  const type = question.type;
  if (
    type !== "year" &&
    type !== "url_list" &&
    type !== "textarea" &&
    type !== "multi" &&
    type !== "single" &&
    type !== "bool"
  ) {
    return null;
  }

  const rawOptions = Array.isArray(question.options)
    ? question.options
        .map(normalizeOption)
        .filter((option): option is SchemaOption => Boolean(option))
    : [];
  const typedOptions = rawOptions.filter((option) =>
    type === "bool"
      ? typeof option.value === "boolean"
      : typeof option.value === "string",
  );
  const options = typedOptions.length ? typedOptions : fallback?.options;
  if (
    (type === "single" || type === "multi" || type === "bool") &&
    !options?.length
  ) {
    return null;
  }
  const numberValue = (field: keyof SchemaQuestion) => {
    const candidate = question[field];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(0, Math.trunc(candidate));
    }
    const fallbackValue = fallback?.[field];
    return typeof fallbackValue === "number"
      ? Math.max(0, Math.trunc(fallbackValue))
      : undefined;
  };

  return {
    key,
    label:
      typeof question.label === "string" && question.label.trim()
        ? question.label
        : fallback?.label ?? key,
    type,
    required:
      typeof question.required === "boolean"
        ? question.required
        : fallback?.required ?? false,
    help:
      typeof question.help === "string" ? question.help : fallback?.help,
    placeholder:
      typeof question.placeholder === "string"
        ? question.placeholder
        : fallback?.placeholder,
    min: numberValue("min"),
    max: numberValue("max"),
    min_items: numberValue("min_items"),
    max_items: numberValue("max_items"),
    min_length: numberValue("min_length"),
    max_length: numberValue("max_length"),
    options,
  };
}

function normalizeSchema(value: unknown): FormSchema {
  const schema = asRecord(value);
  if (!schema) return DEFAULT_SCHEMA;
  const copy = asRecord(schema.copy);
  const fallbackByKey = new Map(
    DEFAULT_QUESTIONS.map((question) => [question.key, question]),
  );

  const rawGroups = Array.isArray(schema.groups) ? schema.groups : [];
  const seenQuestionKeys = new Set<string>();
  const groups = rawGroups
    .map((rawGroup, index) => {
      const group = asRecord(rawGroup);
      if (!group || !Array.isArray(group.questions)) return null;
      const questions = group.questions
        .map((rawQuestion) => {
          const key = asRecord(rawQuestion)?.key;
          const question = normalizeQuestion(
            rawQuestion,
            typeof key === "string" ? fallbackByKey.get(key) : undefined,
          );
          if (!question || seenQuestionKeys.has(question.key)) return null;
          seenQuestionKeys.add(question.key);
          return question;
        })
        .filter((question): question is SchemaQuestion => Boolean(question));
      if (!questions.length) return null;
      return {
        title:
          typeof group.title === "string" && group.title.trim()
            ? group.title
            : DEFAULT_SCHEMA_GROUPS[index]?.title ?? "品牌背景与经营情况",
        questions,
      };
    })
    .filter((group): group is SchemaGroup => Boolean(group));

  const localZoneByValue = new Map(
    DEFAULT_SCHEMA.zones.map((zone) => [zone.value, zone]),
  );
  const seenZones = new Set<string>();
  const zones: ZoneOption[] = [];
  for (const rawZone of Array.isArray(schema.zones) ? schema.zones : []) {
    const zone = asRecord(rawZone);
    if (!zone || typeof zone.value !== "string" || !zone.value.trim()) continue;
    const value = zone.value.trim();
    if (seenZones.has(value)) continue;
    seenZones.add(value);
    const local = localZoneByValue.get(value);
    zones.push({
      value,
      title:
        typeof zone.label === "string" && zone.label.trim()
          ? zone.label
          : local?.title ?? value,
      desc: local?.desc,
    });
  }
  const hasRequiredZones = REQUIRED_SCHEMA_ZONES.every((value) =>
    seenZones.has(value),
  );
  const hasRequiredQuestions = REQUIRED_QUESTION_KEYS.every((key) =>
    seenQuestionKeys.has(key),
  );

  return {
    version:
      typeof schema.version === "string" && schema.version.trim()
        ? schema.version
        : DEFAULT_SCHEMA.version,
    enforced:
      typeof schema.enforced === "boolean"
        ? schema.enforced
        : DEFAULT_SCHEMA.enforced,
    requiredHint:
      typeof schema.required_hint === "string" && schema.required_hint.trim()
        ? schema.required_hint
        : DEFAULT_SCHEMA.requiredHint,
    feedback:
      copy && typeof copy.feedback === "string" && copy.feedback.trim()
        ? copy.feedback
        : DEFAULT_SCHEMA.feedback,
    itemsHint:
      copy && typeof copy.items_hint === "string" && copy.items_hint.trim()
        ? copy.items_hint
        : DEFAULT_SCHEMA.itemsHint,
    zones: hasRequiredZones ? zones : DEFAULT_SCHEMA.zones,
    groups: hasRequiredQuestions ? groups : DEFAULT_SCHEMA.groups,
  };
}

function normalizeFormAnswers(sourceForm: FormState, schema: FormSchema) {
  const answers = { ...sourceForm.answers };
  for (const question of schemaQuestions(schema)) {
    const value = answers[question.key];
    if (question.type === "url_list") {
      answers[question.key] = uniqueStrings(
        answerAsStrings(value).map(ensureHttpProtocol),
      );
    } else if (question.type === "multi") {
      answers[question.key] = uniqueStrings(answerAsStrings(value));
    }
  }
  return { ...sourceForm, answers };
}

function buildSurveyPayload(
  schema: FormSchema,
  answers: Record<string, QuestionValue>,
) {
  const payload: Record<string, unknown> = {};
  for (const question of schemaQuestions(schema)) {
    const value = answers[question.key];
    if (question.type === "bool") {
      if (typeof value === "boolean") payload[question.key] = value;
      continue;
    }
    if (question.type === "multi") {
      const selected = uniqueStrings(answerAsStrings(value));
      if (selected.length) payload[question.key] = selected;
      continue;
    }
    if (question.type === "url_list") {
      const links = uniqueStrings(answerAsStrings(value));
      if (links.length) payload[question.key] = links;
      continue;
    }

    const text = answerAsString(value).trim();
    if (!text) continue;
    if (question.type === "year") {
      const year = Number.parseInt(text, 10);
      if (Number.isFinite(year)) payload[question.key] = year;
    } else {
      payload[question.key] = text;
    }
  }
  return payload;
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
    const error = data.error as {
      message: string;
      fields?: Array<{ message?: unknown }>;
    };
    const fieldMessage = Array.isArray(error.fields)
      ? error.fields.find(
          (field) =>
            field &&
            typeof field.message === "string" &&
            field.message.trim(),
        )?.message
      : null;
    return typeof fieldMessage === "string"
      ? fieldMessage.trim()
      : error.message;
  }
  return fallback;
}

class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (aborted) throw new RequestTimeoutError(timeoutMessage);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function errorIdFor(key: string) {
  const itemMatch = key.match(
    /^items\[(\d+)\](?:\.(name|era_series|condition_source|price))?/,
  );
  if (itemMatch) {
    const fieldByKey: Record<string, string> = {
      name: "name",
      era_series: "era",
      condition_source: "condition",
      price: "price",
    };
    return `item-${itemMatch[1]}-${fieldByKey[itemMatch[2] ?? "name"]}`;
  }
  const rootKey = key.split(/[.\[]/, 1)[0];
  const groups: Record<string, string> = {
    contact: "field-contact",
    categories: "field-categories",
    zones: "field-zones",
    structure: "field-structure",
    uploads: "field-uploads",
    consent: "field-consent",
  };
  return groups[rootKey] ?? rootKey;
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
      <a className="apply-header__brand" href={HOME_HREF} aria-label="66th & 2nd Ave. 活动首页">
        <picture>
          <source type="image/webp" srcSet={brandWebp} />
          <img src={brandFallback} alt="66th & 2nd Ave." />
        </picture>
      </a>
      <p className="apply-header__title">商家参展申请及意向登记表</p>
      <a className="apply-header__back" href={HOME_HREF}>
        返回活动首页 <ArrowIcon className="arrow" />
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
  const [schema, setSchema] = useState<FormSchema>(DEFAULT_SCHEMA);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<UploadKind>("photos");
  const [dragOver, setDragOver] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initialDraft.savedAt);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const fileStore = useRef(new Map<string, File>());
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    document.title = "商家参展申请｜66th & 2nd Ave.";
  }, []);

  useEffect(() => {
    if (!APPLICATION_API_ENABLED) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8_000);
    void fetch(`${API_BASE}/api/v1/form-schema`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => setSchema(normalizeSchema(data)))
      .catch(() => {
        // 问卷接口尚未发布时使用与当前 v2 契约一致的本地兜底。
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    const heading = successRef.current?.querySelector("h2");
    heading?.focus({ preventScroll: true });
  }, [result]);

  useEffect(() => {
    if (!submitting) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    setElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitting]);

  useEffect(() => {
    const busy =
      submitting || form.files.some((file) => file.status === "uploading");
    if (!busy) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [form.files, submitting]);

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

  function updateAnswer(key: string, value: QuestionValue) {
    setForm((prev) => ({
      ...prev,
      answers: { ...prev.answers, [key]: value },
    }));
    clearError(key);
  }

  function toggleAnswerOption(question: SchemaQuestion, value: string | boolean) {
    const current = form.answers[question.key];
    if (question.type === "multi") {
      const selected = answerAsStrings(current);
      const option = String(value);
      let next: string[];
      if (selected.includes(option)) {
        next = selected.filter((item) => item !== option);
      } else if (question.key === "planned_activities" && option === "none") {
        next = ["none"];
      } else if (question.key === "planned_activities") {
        next = [...selected.filter((item) => item !== "none"), option];
      } else {
        next = [...selected, option];
      }
      updateAnswer(question.key, next);
      return;
    }
    updateAnswer(question.key, value);
  }

  function updateLink(question: SchemaQuestion, index: number, value: string) {
    const links = answerAsStrings(form.answers[question.key]);
    const next = [...links];
    next[index] = value;
    updateAnswer(question.key, next);
  }

  function addLink(question: SchemaQuestion) {
    const links = answerAsStrings(form.answers[question.key]);
    if (links.length >= (question.max_items ?? 5)) return;
    updateAnswer(question.key, [...links, ""]);
  }

  function removeLink(question: SchemaQuestion, index: number) {
    const links = answerAsStrings(form.answers[question.key]);
    if (links.length <= 1) {
      updateAnswer(question.key, [""]);
      return;
    }
    updateAnswer(
      question.key,
      links.filter((_, linkIndex) => linkIndex !== index),
    );
  }

  function normalizeLink(question: SchemaQuestion, index: number) {
    const links = answerAsStrings(form.answers[question.key]);
    const link = ensureHttpProtocol(links[index] ?? "");
    if (link === (links[index] ?? "").trim()) return;
    const next = [...links];
    next[index] = link;
    updateAnswer(question.key, next);
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
    clearError(`items[${index}].${key}`);
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
      const response = await fetchWithTimeout(
        `${API_BASE}/api/v1/uploads`,
        { method: "POST", body },
        UPLOAD_TIMEOUT_MS,
        "附件上传超时，请重试",
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiMessage(data, "附件上传失败，请重试"));
      }
      const uploaded = data as { file_id?: unknown; size?: unknown } | null;
      if (
        !uploaded ||
        typeof uploaded.file_id !== "string" ||
        !uploaded.file_id.trim()
      ) {
        throw new Error("上传服务未返回有效的文件编号，请重试");
      }
      const fileId = uploaded.file_id.trim();
      setForm((prev) => ({
        ...prev,
        files: prev.files.map((item) =>
          item.localId === entry.localId
            ? {
                ...item,
                fileId,
                size:
                  typeof uploaded.size === "number"
                    ? uploaded.size
                    : item.size,
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
                  error instanceof RequestTimeoutError
                    ? error.message
                    : error instanceof TypeError
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

    await Promise.allSettled(
      queued.map((item) =>
        item.file ? uploadOne(item.entry, item.file) : Promise.resolve(),
      ),
    );
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
    clearError("uploads");
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

  const {
    values: structureValues,
    touched: structureTouched,
    total: structureTotal,
    valid: structureIsValid,
  } = structureState(form);
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
  const surveyQuestions = schemaQuestions(schema);
  const profileComplete = surveyQuestions
    .filter((question) => question.required)
    .every((question) =>
      questionAnswered(question, form.answers[question.key]),
    );
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

  const sectionComplete = [
    brandComplete,
    categoriesComplete,
    false,
    profileComplete,
    false,
    form.consent,
  ];

  function validate(currentForm = form): Errors {
    const next: Errors = {};
    const structure = structureState(currentForm);
    if (!currentForm.brand_name.trim()) next.brand_name = "请填写品牌或店铺名称";
    else if (currentForm.brand_name.trim().length > 120)
      next.brand_name = "品牌名称不能超过 120 字";

    if (!currentForm.contact_name.trim()) next.contact_name = "请填写联系人姓名";
    else if (currentForm.contact_name.trim().length > 60)
      next.contact_name = "联系人姓名不能超过 60 字";

    if (!currentForm.phone.trim()) next.phone = "请填写手机号码";
    else if (!PHONE_RE.test(normalizePhone(currentForm.phone)))
      next.phone = "请填写有效的 11 位手机号";

    if (!currentForm.wechat.trim() && !currentForm.email.trim())
      next.contact = "微信与邮箱至少填写一项，用于发送合同与后续联络";
    if (currentForm.email.trim() && !EMAIL_RE.test(currentForm.email.trim()))
      next.email = "邮箱格式不正确";
    if (currentForm.email.trim().length > 120)
      next.email = "邮箱不能超过 120 字";
    if (currentForm.wechat.trim().length > 60)
      next.wechat = "微信不能超过 60 字";
    if (currentForm.city.trim().length > 60)
      next.city = "城市不能超过 60 字";

    if (!currentForm.categories.length)
      next.categories = "请至少选择一个经营品类";
    if (!currentForm.zones.length) next.zones = "请至少选择一个意向区域";

    if (currentForm.price_min && currentForm.price_max) {
      const min = Number.parseInt(currentForm.price_min, 10);
      const max = Number.parseInt(currentForm.price_max, 10);
      if (max < min) next.price_max = "价格上限不能小于下限";
    }
    if (
      currentForm.expected_qty &&
      Number.parseInt(currentForm.expected_qty, 10) > 1_000_000
    ) {
      next.expected_qty = "预计带货数量不能超过 1,000,000 件";
    }

    if (structure.touched && structure.values.every((value) => value === 0)) {
      // 全为 0 视为未填写，不提交商品结构。
    } else if (structure.touched && structure.total !== 100) {
      next.structure = `商品结构四项合计须为 100%，当前 ${structure.total}%`;
    }

    currentForm.items.forEach((item, index) => {
      const hasOtherValue = Boolean(
        item.era_series.trim() || item.condition_source.trim() || item.price,
      );
      if (!item.name.trim() && hasOtherValue) {
        next[`items[${index}].name`] = "请填写商品名称，或清空该行";
      }
      if (item.name.trim().length > 120)
        next[`items[${index}].name`] = "商品名称不能超过 120 字";
      if (item.era_series.trim().length > 200)
        next[`items[${index}].era_series`] =
          "年代 / 系列说明不能超过 200 字";
      if (item.condition_source.trim().length > 200)
        next[`items[${index}].condition_source`] =
          "状态及来源不能超过 200 字";
      if (item.price && Number.parseInt(item.price, 10) > 100_000_000)
        next[`items[${index}].price`] = "拟售价超出可填写范围";
    });

    // H5 v2 上线后按题目 required 做前置校验；服务端 enforced 只决定接口是否再次拒绝缺项。
    surveyQuestions.forEach((question) => {
      const value = currentForm.answers[question.key];
      if (question.type === "bool") {
        if (question.required && typeof value !== "boolean") {
          next[question.key] = `请选择「${question.label}」`;
        }
        return;
      }

      if (question.type === "multi") {
        const selected = uniqueStrings(answerAsStrings(value));
        const available = new Set(
          (question.options ?? []).map((option) => String(option.value)),
        );
        if (question.required && !selected.length) {
          next[question.key] = `请选择「${question.label}」`;
        } else if (
          selected.length &&
          question.min_items &&
          selected.length < question.min_items
        ) {
          next[question.key] =
            `${question.label}至少选择 ${question.min_items} 项`;
        } else if (question.max_items && selected.length > question.max_items) {
          next[question.key] =
            `${question.label}最多选择 ${question.max_items} 项`;
        } else if (selected.some((item) => !available.has(item))) {
          next[question.key] = `「${question.label}」选项已更新，请重新选择`;
        }
        if (
          question.key === "planned_activities" &&
          selected.includes("none") &&
          selected.length > 1
        ) {
          next[question.key] = "「没有特别安排」不能与其他选项同时选择";
        }
        return;
      }

      if (question.type === "url_list") {
        const links = uniqueStrings(answerAsStrings(value));
        if (question.required && !links.length) {
          next[question.key] = `请填写「${question.label}」`;
        } else if (
          links.length &&
          question.min_items &&
          links.length < question.min_items
        ) {
          next[question.key] =
            `${question.label}至少填写 ${question.min_items} 条`;
        } else if (question.max_items && links.length > question.max_items) {
          next[question.key] =
            `${question.label}最多填写 ${question.max_items} 条`;
        } else {
          const invalid = links.find((link) => !isHttpUrl(link));
          if (invalid) {
            next[question.key] =
              `链接需以 http:// 或 https:// 开头：${invalid.slice(0, 40)}`;
          }
        }
        return;
      }

      const text = answerAsString(value).trim();
      if (question.type === "year") {
        if (!text) {
          if (question.required) {
            next[question.key] = `请填写「${question.label}」`;
          }
          return;
        }
        const year = Number(text);
        const min = question.min ?? 1900;
        const max = question.max ?? 2100;
        if (!/^\d{4}$/.test(text) || year < min || year > max) {
          next[question.key] =
            `${question.label}需为 ${min}–${max} 的四位年份`;
        }
        return;
      }

      if (question.type === "textarea") {
        if (!text) {
          if (question.required) {
            next[question.key] = `请填写「${question.label}」`;
          }
          return;
        }
        const length = textLength(text);
        const min = question.min_length ?? 0;
        const max = question.max_length;
        if (min && length < min) {
          next[question.key] =
            `${question.label}需 ${min}–${max ?? "不限"} 字，当前 ${length} 字`;
        } else if (max && length > max) {
          next[question.key] =
            `${question.label}不能超过 ${max} 字，当前 ${length} 字`;
        }
        return;
      }

      if (question.type === "single" && question.required && !text) {
        next[question.key] = `请选择「${question.label}」`;
      } else if (
        question.type === "single" &&
        text &&
        !(question.options ?? []).some(
          (option) => typeof option.value === "string" && option.value === text,
        )
      ) {
        next[question.key] = `「${question.label}」选项已更新，请重新选择`;
      }
    });

    if (uploadingCount) next.uploads = "附件仍在上传，请稍候再提交";
    else if (failedUploads) next.uploads = "有附件上传失败，请重试或移除";
    if (!currentForm.consent) next.consent = "请勾选确认后提交";

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
      const target = /^items\[/.test(path) ? path : path.split(/[.\[]/, 1)[0];
      next[target === "file_ids" ? "uploads" : target] = field.message;
    }
    setErrors((prev) => ({ ...prev, ...next }));
  }

  function buildPayload(currentForm = form) {
    const structure = structureState(currentForm);
    return {
      brand_name: currentForm.brand_name.trim(),
      contact_name: currentForm.contact_name.trim(),
      phone: normalizePhone(currentForm.phone),
      wechat: currentForm.wechat.trim() || null,
      email: currentForm.email.trim() || null,
      city: currentForm.city.trim() || null,
      entity_type: currentForm.entity_type || null,
      is_first_time: currentForm.is_first_time,
      categories: currentForm.categories,
      zones: currentForm.zones,
      expected_qty: toIntOrNull(currentForm.expected_qty),
      price_min: toIntOrNull(currentForm.price_min),
      price_max: toIntOrNull(currentForm.price_max),
      structure: structure.filled
        ? {
            secondhand: structure.values[0],
            new_stock: structure.values[1],
            sample: structure.values[2],
            replica: structure.values[3],
          }
        : null,
      items: currentForm.items
        .filter((item) => item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          era_series: item.era_series.trim() || null,
          condition_source: item.condition_source.trim() || null,
          price: toIntOrNull(item.price),
        })),
      ...buildSurveyPayload(schema, currentForm.answers),
      file_ids: currentForm.files
        .flatMap((file) =>
          file.status === "done" && file.fileId ? [file.fileId] : [],
        ),
      consent: true,
      source: "h5",
    };
  }

  function focusSummary() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollUnderHeader(summaryRef.current);
        summaryRef.current?.focus({ preventScroll: true });
      });
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (uploadingCount > 0) {
      setGeneralError("附件仍在上传，请耐心等待完成后再提交。");
      focusSummary();
      return;
    }
    setGeneralError(null);
    const preparedForm = normalizeFormAnswers(form, schema);
    setForm(preparedForm);
    const nextErrors = validate(preparedForm);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusSummary();
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

    submittingRef.current = true;
    setSubmitting(true);
    setErrors({});
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/api/v1/applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(preparedForm)),
        },
        SUBMIT_TIMEOUT_MS,
        "报名服务响应超时",
      );
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
        setGeneralError("提交过于频繁，请稍等 1 分钟再试");
      } else if (response.status >= 500) {
        setGeneralError(
          "报名服务暂时不可用，请稍后重试，或将资料发送至 buzzlu@qq.com。",
        );
      } else {
        setGeneralError(readApiMessage(data, "提交失败，请稍后重试"));
      }
      focusSummary();
    } catch (error) {
      setGeneralError(
        error instanceof RequestTimeoutError
          ? "报名服务响应超时，请稍后重试。资料仍保留在本页，请勿重复提交。"
          : "无法连接报名服务，请检查网络后重试；如持续失败，可将资料发送至 buzzlu@qq.com。",
      );
      focusSummary();
    } finally {
      submittingRef.current = false;
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

  function renderSurveyQuestion(question: SchemaQuestion) {
    const value = form.answers[question.key];
    const error = errors[question.key];
    const labelId = `${question.key}-label`;
    const helpId = question.help ? `${question.key}-help` : undefined;
    const fullWidth =
      question.type === "url_list" ||
      question.type === "textarea" ||
      question.type === "multi" ||
      question.type === "single";
    const className = `field ${fullWidth ? "field--full" : ""} ${
      error ? "has-error" : ""
    }`;

    if (question.type === "year") {
      return (
        <div className={className} key={question.key}>
          <label className="field__label" htmlFor={question.key}>
            <span>
              {question.label}{" "}
              {question.required && <span className="field__required">*</span>}
            </span>
          </label>
          <input
            className={`apply-input ${error ? "is-invalid" : ""}`}
            id={question.key}
            name={question.key}
            inputMode="numeric"
            maxLength={4}
            value={answerAsString(value)}
            placeholder="2018"
            aria-invalid={Boolean(error)}
            aria-describedby={helpId}
            onChange={(event) =>
              updateAnswer(
                question.key,
                event.target.value.replace(/\D/g, "").slice(0, 4),
              )
            }
          />
          {question.help && (
            <p className="field__hint" id={helpId}>
              {question.help}
            </p>
          )}
          {error && <p className="field__error">{error}</p>}
        </div>
      );
    }

    if (question.type === "textarea") {
      const text = answerAsString(value);
      const count = textLength(text);
      return (
        <div className={className} key={question.key}>
          <label className="field__label" htmlFor={question.key}>
            <span>
              {question.label}{" "}
              {question.required && <span className="field__required">*</span>}
            </span>
          </label>
          <textarea
            className={`apply-textarea ${error ? "is-invalid" : ""}`}
            id={question.key}
            name={question.key}
            value={text}
            maxLength={question.max_length}
            aria-invalid={Boolean(error)}
            aria-describedby={helpId}
            placeholder={question.placeholder ?? "请输入"}
            onChange={(event) =>
              updateAnswer(question.key, event.target.value)
            }
          />
          <div className="field__meta">
            <p className="field__hint" id={helpId}>
              {question.help}
            </p>
            <span
              className={`char-count ${
                text && question.min_length && count < question.min_length
                  ? "is-below"
                  : ""
              }`}
            >
              {count}
              {question.max_length ? ` / ${question.max_length}` : ""} 字
            </span>
          </div>
          {error && <p className="field__error">{error}</p>}
        </div>
      );
    }

    if (question.type === "url_list") {
      const links = answerAsStrings(value);
      const visibleLinks = links.length ? links : [""];
      const maxItems = question.max_items ?? 5;
      return (
        <div className={className} key={question.key}>
          <p className="field__label" id={labelId}>
            <span>
              {question.label}{" "}
              {question.required && <span className="field__required">*</span>}
            </span>
            <span className="field__hint">
              {visibleLinks.length} / {maxItems}
            </span>
          </p>
          <div className="url-list">
            {visibleLinks.map((link, index) => (
              <div className="url-row" key={`${question.key}-${index}`}>
                <input
                  className={`apply-input ${error ? "is-invalid" : ""}`}
                  id={index === 0 ? question.key : `${question.key}-${index}`}
                  name={question.key}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={link}
                  aria-label={`${question.label} ${index + 1}`}
                  aria-invalid={Boolean(error)}
                  aria-describedby={helpId}
                  placeholder={question.placeholder ?? "https://..."}
                  onChange={(event) =>
                    updateLink(question, index, event.target.value)
                  }
                  onBlur={() => normalizeLink(question, index)}
                />
                <button
                  className="url-row__remove"
                  type="button"
                  aria-label={`删除第 ${index + 1} 个链接`}
                  disabled={visibleLinks.length === 1}
                  onClick={() => removeLink(question, index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="field__meta">
            <p className="field__hint" id={helpId}>
              {question.help}
            </p>
            <button
              className="text-button"
              type="button"
              disabled={visibleLinks.length >= maxItems}
              onClick={() => addLink(question)}
            >
              + 添加链接
            </button>
          </div>
          {error && <p className="field__error">{error}</p>}
        </div>
      );
    }

    const options = question.options ?? [];
    const isMulti = question.type === "multi";
    const stack =
      question.type === "single" && question.key === "willing_to_promote";
    return (
      <div className={className} id={question.key} key={question.key}>
        <p className="field__label" id={labelId}>
          <span>
            {question.label}{" "}
            {question.required && <span className="field__required">*</span>}
          </span>
        </p>
        <div
          className={`choice-list ${stack ? "choice-list--stack" : ""}`}
          role={isMulti ? "group" : "radiogroup"}
          aria-labelledby={labelId}
          aria-describedby={helpId}
        >
          {options.map((option) => {
            const checked = isMulti
              ? answerAsStrings(value).includes(String(option.value))
              : typeof option.value === "boolean"
                ? answerAsBool(value) === option.value
                : answerAsString(value) === option.value;
            return (
              <label
                className={`choice-option ${checked ? "is-checked" : ""}`}
                key={`${question.key}-${String(option.value)}`}
              >
                <input
                  id={`${question.key}-${String(option.value)}`}
                  type={isMulti ? "checkbox" : "radio"}
                  name={question.key}
                  value={String(option.value)}
                  checked={checked}
                  onChange={() => toggleAnswerOption(question, option.value)}
                />
                <span
                  className={`choice-option__mark ${
                    isMulti ? "is-square" : ""
                  }`}
                  aria-hidden="true"
                >
                  {isMulti && checked ? "✓" : ""}
                </span>
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {question.help && (
          <p className="field__hint" id={helpId}>
            {question.help}
          </p>
        )}
        {error && <p className="field__error">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={`apply-page ${
        submitting || uploadingCount > 0 ? "has-flow-dock" : ""
      }`}
    >
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
              <a className="apply-hero__faq-link" href={FAQ_HREF}>
                <span>申请前你想知道的事</span>
                <ArrowIcon className="arrow" />
              </a>
              <p className="apply-hero__note">
                线上表用于结构化登记；商品明细、店铺与陈列照片、展位与协助需求等补充材料，可在提交后发送至{" "}
                {CONTACT_EMAIL}，或下载 Word 完整表填写。
              </p>
              <p className="apply-hero__compact">
                2026.12.25—27 / 深圳华侨城创意文化园
                <br />
                分轮截止 / 统一回复
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
                <dd>分轮评审 / 统一回复</dd>
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
                : `感谢提交。主办方会核对品牌、货盘与区域意向。${schema.feedback}`}
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
                    可补充 5–10 张代表商品图、店铺或陈列照片、商品明细与年代 / 来源说明，
                    发送至 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。
                    未回复不视为录取；最终商品、区域、费用和服务以双方签署文件为准。
                  </>
                )}
              </p>
            </div>
            <div className="apply-success__actions">
              <a href={HOME_HREF}>返回活动首页 <ArrowIcon className="arrow" /></a>
              <button type="button" onClick={startAnother}>
                {result.preview ? "重新预览" : "再提交一份"}
              </button>
            </div>
          </section>
        ) : (
          <div className="apply-layout">
            <form
              className="apply-form"
              noValidate
              onSubmit={handleSubmit}
              ref={formRef}
              aria-busy={submitting}
            >
              {!APPLICATION_API_ENABLED && (
                <div className="preview-notice" role="status">
                  <strong>样式预览版</strong>
                  <p>表单可正常填写与校验，附件和报名数据暂不会上传至报名系统。</p>
                </div>
              )}

              <p className="form-required-hint">
                <span aria-hidden="true">*</span> {schema.requiredHint}
              </p>

              {(errorEntries.length > 0 || generalError) && (
                <div
                  className="error-summary"
                  role="alert"
                  tabIndex={-1}
                  ref={summaryRef}
                >
                  <strong>{generalError ? "提交未完成" : "请检查以下内容"}</strong>
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
                  {generalError && APPLICATION_API_ENABLED && !submitting && (
                    <button
                      className="error-summary__retry"
                      type="button"
                      onClick={() => formRef.current?.requestSubmit()}
                    >
                      重新提交
                    </button>
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
                      {schema.zones.map((zone) => (
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
                            {zone.title.startsWith(`${zone.value} 区`)
                              ? zone.title
                              : `${zone.value} 区 · ${zone.title}`}
                          </span>
                          <span className="zone-option__desc">{zone.desc}</span>
                        </label>
                      ))}
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
                        aria-invalid={Boolean(errors.expected_qty)}
                        onChange={(event) => {
                          update("expected_qty", toDigits(event.target.value, 7));
                          clearError("expected_qty");
                        }}
                      />
                      <span className="input-unit__unit">件</span>
                    </span>
                    {errors.expected_qty && (
                      <p className="field__error">{errors.expected_qty}</p>
                    )}
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
                          <label
                            className={`field ${
                              errors[`items[${index}].name`] ? "has-error" : ""
                            }`}
                            htmlFor={`item-${index}-name`}
                          >
                            <span className="field__label">商品及品牌</span>
                            <input
                              className="apply-input"
                              id={`item-${index}-name`}
                              value={item.name}
                              maxLength={120}
                              placeholder="例如：Hermès Birkin 30 金棕"
                              aria-invalid={Boolean(
                                errors[`items[${index}].name`],
                              )}
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
                          <label
                            className={`field ${
                              errors[`items[${index}].era_series`]
                                ? "has-error"
                                : ""
                            }`}
                            htmlFor={`item-${index}-era`}
                          >
                            <span className="field__label">年代 / 系列或库存属性</span>
                            <input
                              className="apply-input"
                              id={`item-${index}-era`}
                              value={item.era_series}
                              maxLength={200}
                              placeholder="2015 年 / Birkin"
                              aria-invalid={Boolean(
                                errors[`items[${index}].era_series`],
                              )}
                              onChange={(event) =>
                                updateItem(index, "era_series", event.target.value)
                              }
                            />
                            {errors[`items[${index}].era_series`] && (
                              <span className="field__error">
                                {errors[`items[${index}].era_series`]}
                              </span>
                            )}
                          </label>
                          <label
                            className={`field ${
                              errors[`items[${index}].condition_source`]
                                ? "has-error"
                                : ""
                            }`}
                            htmlFor={`item-${index}-condition`}
                          >
                            <span className="field__label">状态及来源</span>
                            <input
                              className="apply-input"
                              id={`item-${index}-condition`}
                              value={item.condition_source}
                              maxLength={200}
                              placeholder="二手 / 附购买凭证"
                              aria-invalid={Boolean(
                                errors[`items[${index}].condition_source`],
                              )}
                              onChange={(event) =>
                                updateItem(index, "condition_source", event.target.value)
                              }
                            />
                            {errors[`items[${index}].condition_source`] && (
                              <span className="field__error">
                                {errors[`items[${index}].condition_source`]}
                              </span>
                            )}
                          </label>
                          <label
                            className={`field ${
                              errors[`items[${index}].price`] ? "has-error" : ""
                            }`}
                            htmlFor={`item-${index}-price`}
                          >
                            <span className="field__label">拟售价</span>
                            <span className="input-unit">
                              <input
                                className="apply-input"
                                id={`item-${index}-price`}
                                inputMode="numeric"
                                value={item.price}
                                placeholder="0"
                                aria-invalid={Boolean(
                                  errors[`items[${index}].price`],
                                )}
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
                    <p className="items__hint">{schema.itemsHint}</p>
                    {errors.items && <p className="field__error">{errors.items}</p>}
                  </div>
                </div>
              </section>

              <section
                className="form-section"
                id="profile"
                aria-labelledby="profile-title"
              >
                <div className="form-section__head">
                  <span className="form-section__num">04</span>
                  <h2 id="profile-title">品牌背景与经营情况</h2>
                  <p className="form-section__label">
                    BRAND BACKGROUND &amp; OPERATIONS
                  </p>
                  <p className="form-section__intro">
                    用于了解品牌定位、经营经历与活动合作意愿。 {schema.requiredHint}
                  </p>
                </div>

                <div className="profile-groups">
                  {schema.groups.map((group) => (
                    <div className="profile-group" key={group.title}>
                      <h3>{group.title}</h3>
                      <div className="field-grid">
                        {group.questions.map(renderSurveyQuestion)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="form-section"
                id="attachments"
                aria-labelledby="attachments-title"
              >
                <div className="form-section__head">
                  <span className="form-section__num">05</span>
                  <h2 id="attachments-title">资料与附件</h2>
                  <p className="form-section__label">DOCUMENTS &amp; PHOTOS</p>
                  <p className="form-section__intro">
                    建议将代表商品图、商品明细与来源说明整理为一个 ZIP
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
                    className={`dropzone ${dragOver ? "is-over" : ""} ${
                      submitting ? "is-disabled" : ""
                    }`}
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
                      disabled={submitting}
                      accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.zip"
                      onChange={(event) => {
                        if (event.target.files) void addFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <span className="dropzone__recommendation">建议打包上传</span>
                    <span className="dropzone__title">
                      {uploadingCount
                        ? "正在上传附件，请耐心等待…"
                        : "拖放文件到这里，或点击选择"}
                    </span>
                    <span className="dropzone__hint">
                      优先上传 ZIP 压缩包；JPG、PNG、WebP、HEIC、PDF 也可单独上传。上传后请保持页面开启。
                    </span>
                    <span className="dropzone__limit">
                      单个文件不超过 {MAX_FILE_MB} MB / 合计不超过 {MAX_TOTAL_MB} MB
                      ，大文件可能需要 1–2 分钟
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
                                disabled={submitting}
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
                            disabled={submitting}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="field__hint">
                    {APPLICATION_API_ENABLED
                      ? "建议将多张图片和商品清单合并为一个 ZIP 包。上传过程中请耐心等待并保持页面开启；附件上传后需完成提交才会绑定到报名，未提交的文件不会进入审核。"
                      : "建议将多张图片和商品清单合并为一个 ZIP 包。当前为样式预览，附件只在本页展示，不会上传至服务器。"}
                  </p>
                </div>
              </section>

              <section className="form-section" id="confirm" aria-labelledby="confirm-title">
                <div className="form-section__head">
                  <span className="form-section__num">06</span>
                  <h2 id="confirm-title">确认提交</h2>
                  <p className="form-section__label">REVIEW &amp; CONSENT</p>
                  <p className="form-section__intro">
                    请核对关键信息，并确认提交前已阅读报名与资料使用说明。
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
                    <span className="review__label">品牌背景</span>
                    <span>
                      {answerAsString(form.answers.founded_year)
                        ? `${answerAsString(form.answers.founded_year)} 年成立`
                        : "未填写"}
                    </span>
                    <a className="review__edit" href="#profile">修改</a>
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
                    <button
                      className="submit-button"
                      type="submit"
                      disabled={submitting || uploadingCount > 0}
                    >
                      <span>
                        {submitting
                          ? `正在提交，请稍候${elapsedSeconds > 0 ? `（${elapsedSeconds} 秒）` : ""}`
                          : uploadingCount > 0
                            ? "附件上传中，请稍候"
                          : APPLICATION_API_ENABLED
                            ? "提交参展申请"
                            : "预览提交"}
                      </span>
                      <span className="arrow" aria-hidden="true">
                        {submitting || uploadingCount > 0 ? "…" : <ArrowIcon />}
                      </span>
                    </button>
                    <button
                      className="text-button text-button--danger"
                      type="button"
                      onClick={clearDraft}
                      disabled={submitting || uploadingCount > 0}
                    >
                      清空本机草稿
                    </button>
                  </div>
                  <p className="submit-panel__feedback">{schema.feedback}</p>
                  <p className="submit-panel__patience">
                    {APPLICATION_API_ENABLED
                      ? "提交后请耐心等待，通常需要 10–60 秒；请勿重复点击或关闭页面。"
                      : "当前为样式预览，预览提交不会发送报名数据。"}
                  </p>
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
                    {sectionComplete[index] ? (
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
                    <dd>A / B / C / D 区可多选，最终以主办方审核确认为准</dd>
                  </div>
                  <div>
                    <dt>附件</dt>
                    <dd>
                      建议打包为 ZIP，最多 10 个，单个 {MAX_FILE_MB} MB，合计 {MAX_TOTAL_MB} MB
                    </dd>
                  </div>
                  <div>
                    <dt>反馈</dt>
                    <dd>{schema.feedback}</dd>
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
                  商品明细、店铺与陈列照片、展位与协助需求等补充材料，可在提交后发送至主办方，
                  或下载 Word 完整表填写。
                </p>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("66th 商家参展申请补充资料")}`}>
                  发送补充资料 <ArrowIcon />
                </a>
                <a href={DOCX_URL} download>
                  下载 Word 完整表 <ArrowIcon direction="down" />
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

      {(submitting || uploadingCount > 0) && (
        <div className="flow-dock">
          <span className="spinner flow-dock__spinner" aria-hidden="true" />
          <div className="flow-dock__body">
            <strong role="status" aria-live="polite">
              {submitting
                ? "正在提交申请，请耐心等待"
                : "正在上传附件，请耐心等待"}
            </strong>
            <p aria-hidden="true">
              {submitting
                ? `资料已校验，正在写入报名系统 · 已等待 ${elapsedSeconds} 秒`
                : `${uploadingCount} 个文件处理中，上传完成后才能提交`}
            </p>
          </div>
          <span className="flow-dock__hint">
            {submitting ? "请勿关闭页面或重复提交" : "大文件可能需要 1–2 分钟"}
          </span>
          <span className="flow-dock__bar" aria-hidden="true">
            <span />
          </span>
        </div>
      )}
    </div>
  );
}
