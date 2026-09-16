import type { DirectoryEntry, PublisherId } from '../domain.js';
import { SOURCES } from '../sources/index.js';

/** Publisher order on the Directory page: City of Laredo, Webb County, and Webb CAD first (issue 08). */
export const PUBLISHER_ORDER: readonly PublisherId[] = [
  'city-of-laredo',
  'webb-county',
  'webb-cad',
  'laredo-utilities',
  'laredo-police',
  'laredo-fire',
  'laredo-health',
  'laredo-library',
  'el-metro',
  'laredo-mpo',
  'lisd',
  'uisd',
  'laredo-college',
  'laredo-housing-authority',
  'txdot-laredo',
];

const VERIFIED = '2026-09-16';

/**
 * Directory-only Sources and Lookups: everything the research doc lists that the site links to but
 * does not ingest (docs/research/laredo-public-sources.md). Feeds declare their own entries on their adapter.
 */
export const DIRECTORY_ONLY: readonly DirectoryEntry[] = [
  { id: 'swagit-video', publisher: 'city-of-laredo', kind: 'source', url: 'https://laredotx.new.swagit.com/views/168/city-council', stringsKey: 'dir.swagit-video', lastVerified: VERIFIED },
  { id: 'budget', publisher: 'city-of-laredo', kind: 'source', url: 'https://www.cityoflaredo.com/departments/budget', stringsKey: 'dir.budget', lastVerified: VERIFIED },
  { id: 'opengov', publisher: 'city-of-laredo', kind: 'lookup', url: 'https://laredotx.opengov.com/transparency', stringsKey: 'dir.opengov', lastVerified: VERIFIED },
  { id: 'open-gis', publisher: 'city-of-laredo', kind: 'source', url: 'https://maps.openlaredo.com/', stringsKey: 'dir.open-gis', lastVerified: VERIFIED },
  { id: 'open-data', publisher: 'city-of-laredo', kind: 'source', url: 'https://data.openlaredo.com/dataset', stringsKey: 'dir.open-data', lastVerified: VERIFIED },
  { id: 'building-permits', publisher: 'city-of-laredo', kind: 'source', url: 'https://www.cityoflaredo.com/services/building-permits', stringsKey: 'dir.building-permits', lastVerified: VERIFIED },
  { id: 'jobs', publisher: 'city-of-laredo', kind: 'source', url: 'https://www.governmentjobs.com/careers/laredo', stringsKey: 'dir.jobs', lastVerified: VERIFIED },
  { id: 'municode', publisher: 'city-of-laredo', kind: 'lookup', url: 'https://library.municode.com/tx/laredo/codes/code_of_ordinances', stringsKey: 'dir.municode', lastVerified: VERIFIED },
  { id: '311', publisher: 'city-of-laredo', kind: 'lookup', url: 'https://www.cityoflaredo.com/services/311-online-services', stringsKey: 'dir.311', lastVerified: VERIFIED },
  { id: 'traffic-safety', publisher: 'city-of-laredo', kind: 'source', url: 'https://www.facebook.com/cityoflaredotrafficsafety/', stringsKey: 'dir.traffic-safety', lastVerified: VERIFIED, socialOnly: 'facebook' },
  { id: 'police', publisher: 'laredo-police', kind: 'source', url: 'https://www.cityoflaredo.com/departments/police-department', stringsKey: 'dir.police', lastVerified: VERIFIED },
  { id: 'fire', publisher: 'laredo-fire', kind: 'source', url: 'https://www.facebook.com/LaredoFireDepartment/', stringsKey: 'dir.fire', lastVerified: VERIFIED, socialOnly: 'facebook' },
  { id: 'health-epi', publisher: 'laredo-health', kind: 'source', url: 'https://www.cityoflaredo.com/departments/health-department/services/epi-phep', stringsKey: 'dir.health-epi', lastVerified: VERIFIED },
  { id: 'library-calendar', publisher: 'laredo-library', kind: 'source', url: 'https://www.laredolibrary.org/events-calendar/', stringsKey: 'dir.library-calendar', lastVerified: VERIFIED },
  { id: 'el-metro', publisher: 'el-metro', kind: 'source', url: 'https://elmetrotransit.com/maps-schedules/', stringsKey: 'dir.el-metro', lastVerified: VERIFIED },
  { id: 'mpo', publisher: 'laredo-mpo', kind: 'source', url: 'https://www.laredompo.org/agendas-minutes/', stringsKey: 'dir.mpo', lastVerified: VERIFIED },
  { id: 'commissioners-court', publisher: 'webb-county', kind: 'source', url: 'https://www.webbcountytx.gov/893/Agendas-and-Minutes', stringsKey: 'dir.commissioners-court', lastVerified: VERIFIED },
  { id: 'county-video', publisher: 'webb-county', kind: 'source', url: 'https://webbcountytx.new.swagit.com/', stringsKey: 'dir.county-video', lastVerified: VERIFIED },
  { id: 'county-newsflash', publisher: 'webb-county', kind: 'source', url: 'https://www.webbcountytx.gov/m/newsflash', stringsKey: 'dir.county-newsflash', lastVerified: VERIFIED },
  { id: 'county-bids', publisher: 'webb-county', kind: 'source', url: 'https://www.webbcountytx.gov/PurchasingAgent/PublicNoticeRFP/', stringsKey: 'dir.county-bids', lastVerified: VERIFIED },
  { id: 'county-elections', publisher: 'webb-county', kind: 'source', url: 'https://www.webbcountytx.gov/291/Elections-Department', stringsKey: 'dir.county-elections', lastVerified: VERIFIED },
  { id: 'county-tax', publisher: 'webb-county', kind: 'lookup', url: 'https://webb.go2gov.net/', stringsKey: 'dir.county-tax', lastVerified: VERIFIED },
  { id: 'county-clerk', publisher: 'webb-county', kind: 'lookup', url: 'https://www.webbcountytx.gov/329/Foreclosures', stringsKey: 'dir.county-clerk', lastVerified: VERIFIED },
  { id: 'county-district-clerk', publisher: 'webb-county', kind: 'lookup', url: 'https://www.webbcountytx.gov/277/District-Clerk', stringsKey: 'dir.county-district-clerk', lastVerified: VERIFIED },
  { id: 'county-sheriff-jail', publisher: 'webb-county', kind: 'lookup', url: 'http://www.webbcountytx.gov/Sheriff/', stringsKey: 'dir.county-sheriff-jail', lastVerified: VERIFIED },
  { id: 'cad-property-search', publisher: 'webb-cad', kind: 'lookup', url: 'https://propaccess.webbcad.org/clientdb/?cid=1', stringsKey: 'dir.cad-property-search', lastVerified: VERIFIED },
  { id: 'cad-online-appeals', publisher: 'webb-cad', kind: 'lookup', url: 'https://onlineappeals.webbcad.org/', stringsKey: 'dir.cad-online-appeals', lastVerified: VERIFIED },
  { id: 'lisd-board', publisher: 'lisd', kind: 'source', url: 'https://meetings.boardbook.org/Public/Organization/2520', stringsKey: 'dir.lisd-board', lastVerified: VERIFIED },
  { id: 'uisd-board', publisher: 'uisd', kind: 'source', url: 'https://meetings.boardbook.org/public/Organization/2029', stringsKey: 'dir.uisd-board', lastVerified: VERIFIED },
  { id: 'laredo-college-board', publisher: 'laredo-college', kind: 'source', url: 'https://www.laredo.edu/about/administration/board-of-trustees/agendas%20and%20meetings.html', stringsKey: 'dir.laredo-college-board', lastVerified: VERIFIED },
  { id: 'housing-authority', publisher: 'laredo-housing-authority', kind: 'source', url: 'https://larha.org/', stringsKey: 'dir.housing-authority', lastVerified: VERIFIED },
  { id: 'txdot-laredo', publisher: 'txdot-laredo', kind: 'source', url: 'https://www.txdot.gov/about/districts/laredo-district.html', stringsKey: 'dir.txdot-laredo', lastVerified: VERIFIED, socialOnly: 'x' },
];

/** Feeds first (from the adapters), then Directory-only entries. */
export function allDirectoryEntries(): DirectoryEntry[] {
  const feeds: DirectoryEntry[] = SOURCES.map((s) => ({ id: s.id, publisher: s.publisher, kind: 'feed', ...s.directory }));
  return [...feeds, ...DIRECTORY_ONLY];
}
