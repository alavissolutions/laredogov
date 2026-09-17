# 02: Race pages with the comparison table

**What to build:** From the Election page a resident opens a Race (Mayor, District 1, 2, 3, 6, Municipal Court Judge Position 1) and sees a table of Candidates in the city's ballot order with name on ballot, treasurer, and the ballot application link. The adapter follows the Candidates Information link and reads one table per Race; Filing kinds come from the table column and anchor title, never from filenames. The non-binding pediatric hospital question renders as a question Race with the city's ordinance linked. A row the city has not named renders as "candidate name not yet posted" with its treasurer link and creates no Candidate. Applications and treasurer appointments are Filings but not Items.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Fixture recorded for the general candidates sub-page
- [ ] First build yields 6 office Races with 16 named Candidates and 1 question Race
- [ ] Race pages render in both languages with the table in ballot order and the table scrolling within its container on a phone
- [ ] Question Race page shows the question title and ordinance link
- [ ] No Item is created for applications or treasurer appointments
- [ ] Document identity drops the trailing ticks and treats both city document URL forms as one id
