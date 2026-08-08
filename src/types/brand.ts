export interface BrandStyle {
  backgroundColor?: string;
  headingColor?: string;
  textColor?: string;
  headingFont?: string;
  textFont?: string;
}

export interface BrandDNA {
  brand_name: string;
  kind: "ecommerce" | "physical";
  audience: string;
  tone: string[];
  voice_rules: string[];
  banned_words: string[];
  value_props: string[];
  recurring_phrases: string[];
  colors: string[];
  fonts: string[];
  hashtag_bank: string[];
  example_posts: ExamplePost[];
  style?: BrandStyle;
}

export interface ExamplePost {
  format: ContentFormat;
  text: string;
  objective?: string;
}

export type ContentFormat = "single_post" | "carousel" | "reel" | "ad" | "email";

export type ContentObjective =
  | "awareness"
  | "sale"
  | "new_product"
  | "seasonal"
  | "restock"
  | "engagement";

export type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "scheduled"
  | "posted"
  | "failed";

export interface GeneratedCopy {
  caption: string;
  hooks: string[];
  cta: string;
  hashtags: string[];
  carousel_slides?: CarouselSlide[];
  image_brief: string;
}

export interface CarouselSlide {
  headline: string;
  body: string;
}

export interface ContentAsset {
  type: "image" | "video";
  path: string;
  meta?: Record<string, unknown>;
}

export interface ContentRevision {
  timestamp: string;
  field: string;
  before: unknown;
  after: unknown;
}
