import { MemorySchemaSource, type ModelSchema } from "../services/schema/types"

const component = (uid: string, attributes: ModelSchema["attributes"]): ModelSchema => ({
  uid,
  modelType: "component",
  displayName: uid,
  attributes,
})

const contentType = (uid: string, attributes: ModelSchema["attributes"], extra: Partial<ModelSchema> = {}): ModelSchema => ({
  uid,
  modelType: "contentType",
  kind: "collectionType",
  displayName: uid,
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes,
  ...extra,
})

export const fixtureSource = () =>
  new MemorySchemaSource([
    contentType("api::article.article", {
      title: { type: "string", required: true },
      slug: { type: "uid", targetField: "title", required: true },
      pages: { type: "relation", relation: "manyToMany", target: "api::website-page.website-page", mappedBy: "relatedArticles" },
    }),
    contentType("api::website-page.website-page", {
      title: { type: "string", required: true },
      slug: { type: "uid", targetField: "title", required: true },
      showBreadcrumb: { type: "boolean" },
      pageType: { type: "enumeration", enum: ["default", "landing"] },
      rank: { type: "integer" },
      eventDate: { type: "date" },
      metadata: { type: "json" },
      body: { type: "richtext" },
      notes: { type: "blocks" },
      seo: { type: "component", component: "shared.seo", repeatable: false },
      sections: {
        type: "dynamiczone",
        components: [
          "sections.hero",
          "sections.features",
          "sections.tabbed-showcase",
          "sections.explore-card",
          "sections.value-section",
        ],
      },
      relatedArticles: { type: "relation", relation: "manyToMany", target: "api::article.article", inversedBy: "pages" },
    }),
    contentType(
      "api::homepage.homepage",
      {
        pathname: { type: "string", unique: true, required: true },
        seo: { type: "component", component: "shared.seo" },
      },
      { kind: "singleType", pluginOptions: {} }
    ),
    component("shared.seo", {
      metaTitle: { type: "string", required: true },
      metaDescription: { type: "text" },
      shareImage: { type: "media", multiple: false },
      structuredData: { type: "json" },
    }),
    component("ui.cta", {
      label: { type: "string", required: true },
      url: { type: "string" },
    }),
    component("sections.hero", {
      title: { type: "string", required: true },
      image: { type: "media", multiple: false },
      gallery: { type: "media", multiple: true },
      cta: { type: "component", component: "ui.cta", repeatable: false },
    }),
    component("shared.feature", {
      title: { type: "string" },
      icon: { type: "media", multiple: false },
    }),
    component("sections.features", {
      title: { type: "string" },
      items: { type: "component", component: "shared.feature", repeatable: true },
    }),
    component("shared.tab-panel", {
      body: { type: "blocks" },
      image: { type: "media", multiple: false },
    }),
    component("shared.tab", {
      label: { type: "string" },
      panel: { type: "component", component: "shared.tab-panel" },
    }),
    component("sections.tabbed-showcase", {
      tabs: { type: "component", component: "shared.tab", repeatable: true },
    }),
    component("sections.explore-card", {
      title: { type: "string" },
      article: { type: "relation", relation: "manyToOne", target: "api::article.article" },
    }),
    component("sections.block-a", {
      title: { type: "string" },
      image: { type: "media", multiple: false },
      article: { type: "relation", relation: "manyToOne", target: "api::article.article" },
    }),
    component("sections.block-b", {
      text: { type: "richtext" },
      count: { type: "integer" },
    }),
    component("sections.value-section", {
      title: { type: "string" },
      blocks: { type: "dynamiczone", components: ["sections.block-a", "sections.block-b"] },
    }),
  ])

export const media = (name: string, id = 1) => ({
  id,
  documentId: `media-${id}`,
  name,
  hash: `hash-${name}`,
  mime: "image/png",
  ext: ".png",
  size: 1.5,
  sizeInBytes: 1536,
  width: 10,
  height: 12,
  alternativeText: name,
  caption: null,
  url: `/uploads/${name}`,
})

export const pageEntry = () => ({
  documentId: "page-1",
  locale: "en",
  title: "About Us",
  slug: "about-us",
  showBreadcrumb: false,
  pageType: "landing",
  rank: 2,
  eventDate: "2026-10-05",
  metadata: { theme: "blue", flags: [true, false] },
  body: "Hello **world**",
  notes: [{ type: "paragraph", children: [{ text: "Note" }] }],
  seo: {
    id: 9,
    metaTitle: "About",
    metaDescription: "Company",
    shareImage: media("share.png", 3),
    structuredData: { "@type": "WebPage" },
  },
  sections: [
    {
      __component: "sections.hero",
      id: 1,
      title: "Welcome",
      image: media("hero.png", 1),
      gallery: [media("one.png", 4), media("two.png", 5)],
      cta: { id: 2, label: "Contact", url: "/contact" },
    },
    {
      __component: "sections.features",
      id: 3,
      title: "Features",
      items: [
        { id: 4, title: "Feature 1", icon: media("icon.png", 6) },
        { id: 5, title: "Feature 2", icon: null },
      ],
    },
    {
      __component: "sections.tabbed-showcase",
      id: 6,
      tabs: [
        {
          id: 7,
          label: "Overview",
          panel: { id: 8, body: [{ type: "paragraph", children: [{ text: "Tab" }] }], image: media("tab.png", 7) },
        },
      ],
    },
    {
      __component: "sections.explore-card",
      id: 10,
      title: "Explore",
      article: { documentId: "article-1", locale: "en", slug: "story", title: "Story" },
    },
    {
      __component: "sections.value-section",
      id: 11,
      title: "Values",
      blocks: [
        { __component: "sections.block-a", id: 12, title: "A", image: media("a.png", 8), article: { documentId: "article-1", slug: "story" } },
        { __component: "sections.block-b", id: 13, text: "Plain", count: 4 },
      ],
    },
  ],
  relatedArticles: [{ documentId: "article-1", locale: "en", slug: "story", title: "Story" }],
})
