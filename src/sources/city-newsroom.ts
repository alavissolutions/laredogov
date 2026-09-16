import { load } from 'cheerio';
import { parseUsDateTime } from '../dates.js';
import type { Topic } from '../domain.js';
import { ensureOk } from '../fetcher/types.js';
import type { NewItem, SourceAdapter } from './types.js';

export const NEWSROOM_URL = 'https://www.cityoflaredo.com/government/newsroom';
const CITY = 'https://www.cityoflaredo.com';

/**
 * Department IDs from the Newsroom's department filter, enumerated once on 2026-09-16
 * (the `newsdepts_41_2276_35` select on /government/newsroom).
 */
export const NEWSROOM_DEPARTMENTS: Record<string, string> = {
  '28': 'Airport',
  '2': 'Animal Care',
  '29': 'Bridge',
  '3': 'Budget',
  '4': 'Building',
  '5': "City Attorney's Office",
  '6': "City Manager's Office",
  '7': "City Secretary's Office",
  '8': 'Community Development',
  '33': 'Detoxification',
  '9': 'Economic Development',
  '10': 'Engineering',
  '11': 'Environmental Services',
  '12': 'Finance/Purchasing',
  '13': 'Fire',
  '15': 'Fleet Management',
  '14': 'Health',
  '16': 'Human Resources',
  '17': 'Information Services & Telecommunication',
  '18': 'Internal Audit Office',
  '30': 'Library',
  '19': 'Mayor & Council',
  '20': 'Municipal Court',
  '21': 'Parks & Recreation',
  '22': 'Planning & Zoning',
  '23': 'Police',
  '24': 'Public Works',
  '31': 'Tax Assessor / Collector Office',
  '26': 'Traffic Safety',
  '27': 'Utilities',
  '32': 'Veterans',
};

/** The Topic rule (ADR-0004): Police and Fire to Public Safety, Health to Health, everything else to News and Notices. */
export const DEPARTMENT_TOPICS: Record<string, Topic> = {
  '13': 'public-safety',
  '23': 'public-safety',
  '14': 'health',
};

/**
 * The city tags city-wide notices (tax hearings, holiday closures) to every department, so a notice
 * that also appears under an unrelated department is city-wide and stays under News and Notices.
 * The Airport list is fetched as that control; verified 2026-09-16.
 */
export const CONTROL_DEPARTMENT = '28';

export const DEFAULT_TOPIC: Topic = 'news-and-notices';

export function departmentListUrl(departmentId: string): string {
  return `${NEWSROOM_URL}/-seldept-${departmentId}-41`;
}

interface ListedItem {
  id: string;
  title: string;
  url: string;
  date: string;
}

export function parseNewsroomList(html: string): ListedItem[] {
  const $ = load(html);
  const out: ListedItem[] = [];
  $('section.news_widget ul.list-main > li').each((_, li) => {
    const link = $(li).find('a.item-title').first();
    const href = link.attr('href');
    const title = link.text().replace(/\s+/g, ' ').trim();
    const m = href ? /\/Home\/Components\/News\/News\/(\d+)\/(\d+)/i.exec(href) : null;
    const when = parseUsDateTime($(li).find('p.item-date').first().text());
    if (!m || !title || !when) return;
    out.push({ id: m[1]!, title, url: `${CITY}/Home/Components/News/News/${m[1]}/${m[2]}`, date: when.iso });
  });
  return out;
}

/** City press releases and notices, filed by the department the city posted them under. */
export const cityNewsroom: SourceAdapter = {
  id: 'city-newsroom',
  publisher: 'city-of-laredo',
  fetchMode: 'browser',
  topicRule: { topics: ['news-and-notices', 'public-safety', 'health'], stringsKey: 'topicRule.city-newsroom' },
  directory: { url: NEWSROOM_URL, stringsKey: 'dir.city-newsroom', lastVerified: '2026-09-16' },
  async run({ fetcher, log }) {
    const listed = parseNewsroomList(ensureOk(await fetcher.fetch(NEWSROOM_URL, 'browser')).body);

    const inDepartment = new Map<string, Set<string>>();
    for (const dept of [...Object.keys(DEPARTMENT_TOPICS), CONTROL_DEPARTMENT]) {
      const res = ensureOk(await fetcher.fetch(departmentListUrl(dept), 'browser'));
      inDepartment.set(dept, new Set(parseNewsroomList(res.body).map((i) => i.id)));
    }

    const items: NewItem[] = listed.map((entry) => {
      const filed = fileByDepartment(entry.id, inDepartment);
      return {
        id: `city-newsroom:${entry.id}`,
        title: entry.title,
        date: entry.date,
        url: entry.url,
        topic: filed.topic,
        ...(filed.department ? { topicReason: { department: filed.department } } : {}),
      };
    });
    log(`city-newsroom: ${items.length} items listed`);
    return { items };
  },
};

export function fileByDepartment(id: string, inDepartment: Map<string, Set<string>>): { topic: Topic; department?: string } {
  if (inDepartment.get(CONTROL_DEPARTMENT)?.has(id)) return { topic: DEFAULT_TOPIC };
  const hits = Object.entries(DEPARTMENT_TOPICS).filter(([dept]) => inDepartment.get(dept)?.has(id));
  const topics = new Set(hits.map(([, topic]) => topic));
  if (topics.size !== 1) return { topic: DEFAULT_TOPIC };
  const [dept, topic] = hits[0]!;
  return { topic, department: NEWSROOM_DEPARTMENTS[dept] ?? dept };
}
