import { addDays, centralDate } from '../dates.js';
import type { DataFile, Lang, Topic } from '../domain.js';

export interface RenderConfig {
  /** Absolute site URL without trailing slash, used for RSS links and the language alternates. */
  siteUrl: string;
  /** Path prefix when the site is served under a subdirectory (GitHub Pages project sites). Empty or '/name'. */
  basePath: string;
  now: Date;
}

export interface RenderContext extends RenderConfig {
  data: DataFile;
  today: string;
  windowStart: string;
  windowEnd: string;
  lang: Lang;
}

export const NEW_WINDOW_DAYS = 90;
export const COMING_UP_DAYS = 14;
export const BODY_ACTIVE_MONTHS = 12;
export const UNREACHABLE_WARNING_DAYS = 7;

export function makeContext(data: DataFile, config: RenderConfig, lang: Lang): RenderContext {
  const today = centralDate(config.now);
  return {
    ...config,
    data,
    lang,
    today,
    windowStart: addDays(today, -NEW_WINDOW_DAYS),
    windowEnd: addDays(today, COMING_UP_DAYS),
  };
}

/** Site-relative href for a page in the current language tree. `path` starts with '/'. */
export function href(ctx: Pick<RenderContext, 'basePath' | 'lang'>, path: string): string {
  return `${ctx.basePath}/${ctx.lang}${path}`;
}

/** Site-relative href for a language-independent file at the root. */
export function rootHref(ctx: Pick<RenderContext, 'basePath'>, path: string): string {
  return `${ctx.basePath}${path}`;
}

export function absolute(ctx: Pick<RenderContext, 'siteUrl'>, sitePath: string): string {
  return `${ctx.siteUrl}${sitePath}`;
}

export const PATHS = {
  home: '/',
  topic: (topic: Topic) => `/topics/${topic}/`,
  topicFeed: (topic: Topic) => `/topics/${topic}/feed.xml`,
  feed: '/feed.xml',
  meetings: '/meetings/',
  election: (slug: string) => `/elections/${slug}/`,
  race: (electionSlug: string, raceSlug: string) => `/elections/${electionSlug}/${raceSlug}/`,
  body: (bodyId: string) => `/meetings/body/${bodyId}/`,
  meeting: (id: string) => `/meetings/${id}/`,
  directory: '/directory/',
  search: '/search/',
  about: '/about/',
};
