# Laredo Gov

A single public site that gathers the recurring information Laredo-area governments already publish for free, so a resident can see what's happening without checking a dozen agency websites.

## Language

**Publisher**:
A government body that puts information online: City of Laredo, Webb County, Webb County Appraisal District, and so on. Departments (Police, Fire, Health) are Publishers in their own right when they publish under their own name.
_Avoid_: Agency, department, entity, jurisdiction

**Source**:
One specific place a Publisher posts things, such as the City Council calendar in Legistar or the City Newsroom. A Publisher has many Sources.
_Avoid_: Site, page, endpoint, scraper

**Feed**:
A Source whose content grows over time, so new Items keep appearing. Council agendas and press releases are Feeds.
_Avoid_: Stream, channel

**Lookup**:
A Source you search by a key such as an address, owner, or account number, and which never "posts" anything new. Property appraisal search and tax bill search are Lookups. The site points at Lookups but never ingests them.
_Avoid_: Database, portal, records

**Item**:
One thing a Feed published on a given date: an agenda, a press release, a notice, an event listing. An Item always links to where the Publisher put it.
_Avoid_: Post, article, document, entry, record

**Body**:
A council, board, commission, or committee that holds Meetings: City Council, Planning and Zoning Commission, Commissioners Court. A Body belongs to one Publisher.
_Avoid_: Committee (too narrow), department, group

**Meeting**:
A scheduled session of a Body convened under the Texas Open Meetings Act. A Meeting may be cancelled and stays visible as cancelled. A Meeting collects the Items that belong to it: agenda, packet, minutes, and video.
_Avoid_: Event (reserved for public happenings), session

**Event**:
A public happening that residents can attend and that is not a Meeting: a festival, clinic, library program, or town hall. If a Body convenes it under the Open Meetings Act it is a Meeting, otherwise it is an Event.
_Avoid_: Meeting, activity

**Stream line**:
An Item that announces a document (agenda, packet, minutes, or video) attaching to a Meeting, dated by the Publisher and linking to the Meeting. Stream lines are how the New panel shows Meeting activity without a reader revisiting the Meeting page.
_Avoid_: Notification, update, activity

**Topic**:
A resident-facing category an Item is filed under. Every Item has exactly one Topic. Every Topic has its own RSS feed.
_Avoid_: Category, tag, section

**Election**:
One election day run by a Publisher, such as the City of Laredo's 2026 general election or a 2026 special election. An Election has Races.
_Avoid_: Ballot, vote, cycle

**Race**:
One office or proposition on an Election's ballot, such as Mayor or Council District 3. An office Race has Candidates; a proposition Race has a question and no Candidates.
_Avoid_: Contest, seat, position, measure

**Candidate**:
A person the Publisher lists by name under a Race. A row the Publisher has not yet named (a treasurer appointment with no name) is not a Candidate until the name appears. A person who files for Races in two Elections is two Candidates. A Candidate page shows only what the Publisher posted under their name and the Figures copied from it; the site never labels anyone an incumbent.
_Avoid_: Nominee, contender, politician, incumbent, filer

**Filing**:
Something the Publisher posts under a Candidate's name: a treasurer appointment, a ballot application, or a campaign finance report for a stated period (including reports the same person filed as an officeholder, labelled as such). Its kind and period come from where the Publisher placed it, never from reading it. Every Filing links to where the Publisher put it. A finance report Filing is also an Item in the Elections Topic because the Publisher dates it; a ballot application is not, because the Publisher does not.
_Avoid_: Document, report, attachment, upload

**Alias**:
A name the Publisher uses for a Candidate somewhere other than the Race table, declared by the owner so a Filing posted under that spelling attaches to the right Candidate. Only an exact Alias match attaches a Filing; anything else is reported as unmatched.
_Avoid_: Nickname, variant, fuzzy match

**Figure**:
A number copied from a Filing, such as total contributions for a reporting period, together with the Filing it came from and whether the owner has verified it against that Filing. Figures are totals the Candidate reported; individual contributors and their addresses are never Figures.
_Avoid_: Stat, metric, data point, amount

## Topics

The fixed list: **Meetings**, **News and Notices**, **Public Safety**, **Events**, **Taxes and Property**, **Roads and Transit**, **Health**, **Jobs and Bids**, **Elections**.

**Directory**:
The part of the site that lists every known Source and Lookup with a plain-language description of what is there and how often it updates, regardless of whether the site ingests it.
_Avoid_: Links page, resources
