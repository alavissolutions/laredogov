/** Mobile-first, no horizontal scroll, readable on a phone. One first-party stylesheet, no fonts fetched. */
export const CSS = `:root{--ink:#1c1c1c;--muted:#5a5a5a;--line:#d9d9d9;--accent:#0b5394;--warn-bg:#fff4e0;--warn-line:#d98b00;--bg:#fff;--soft:#f5f5f2}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);overflow-wrap:anywhere}
.wrap{max-width:60rem;margin:0 auto;padding:0 1rem}
a{color:var(--accent)}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}
.skip{position:absolute;left:-999px;top:0;background:#fff;padding:.5rem}
.skip:focus{left:1rem;z-index:10}
.site-header{background:var(--soft);border-bottom:1px solid var(--line)}
.site-header .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.5rem;padding-top:.75rem;padding-bottom:.75rem}
.brand{font-weight:700;font-size:1.25rem;text-decoration:none;color:var(--ink)}
.site-header nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.25rem 1rem}
.site-header nav a[aria-current]{font-weight:700;text-decoration:none;color:var(--ink)}
.lang-switch{font-weight:600}
.unofficial{font-size:.9rem;color:var(--muted);margin:.75rem auto}
main{padding-bottom:2rem}
h1{font-size:1.6rem;line-height:1.25;margin:1rem 0 .5rem}
h2{font-size:1.25rem;margin:1.75rem 0 .5rem;border-bottom:1px solid var(--line);padding-bottom:.25rem}
h3{font-size:1.05rem;margin:1.25rem 0 .25rem}
.intro{color:var(--muted);margin-top:0}
.items,.meetings-list,.entries{list-style:none;margin:0;padding:0}
.items>li,.meetings-list>li{padding:.75rem 0;border-bottom:1px solid var(--line)}
.items .title{font-size:1.05rem}
.meta{display:block;font-size:.875rem;color:var(--muted);margin-top:.15rem}
.meta a{color:inherit}
.meta .sep{margin:0 .35rem}
.reason,.stale{display:block;font-size:.8rem;color:var(--muted);margin-top:.15rem}
.badge{display:inline-block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.02em;padding:.05rem .4rem;border-radius:.25rem;background:#eee;color:#333;vertical-align:middle;margin-left:.35rem}
.badge.cancelled{background:#fde2e1;color:#8a1c12}
.badge.event{background:#e3f1e5;color:#1e5b2a}
.badge.meeting{background:#e2ecf7;color:#173d66}
.topics ul{list-style:none;margin:.5rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
.topics a{display:inline-block;padding:.3rem .7rem;border:1px solid var(--line);border-radius:1rem;text-decoration:none;background:var(--soft)}
.warning{background:var(--warn-bg);border-left:4px solid var(--warn-line);padding:.5rem .75rem;margin:.5rem 0}
.entries>li{padding:.75rem 0;border-bottom:1px solid var(--line)}
.entries .kind{font-size:.8rem;color:var(--muted)}
dl{margin:.5rem 0}
dt{font-weight:600;font-size:.875rem;color:var(--muted)}
dd{margin:0 0 .5rem}
.docs{list-style:none;padding:0;margin:.5rem 0}
.docs li{margin:.25rem 0}
.body-filter ul{list-style:none;padding:0;margin:.5rem 0;display:flex;flex-wrap:wrap;gap:.35rem}
.body-filter a{display:inline-block;padding:.2rem .6rem;border:1px solid var(--line);border-radius:1rem;text-decoration:none;font-size:.9rem}
.body-filter a[aria-current]{background:var(--accent);color:#fff;border-color:var(--accent)}
form.search{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}
form.search label{flex-basis:100%;font-weight:600}
form.search input{flex:1 1 14rem;font:inherit;padding:.5rem;border:1px solid var(--muted);border-radius:.25rem;min-width:0}
form.search button{font:inherit;padding:.5rem 1rem;border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:.25rem}
.site-footer{border-top:1px solid var(--line);background:var(--soft);font-size:.875rem;color:var(--muted);padding:1rem 0}
.site-footer p{margin:.25rem 0}
.elections-list>li{padding:.75rem 0;border-bottom:1px solid var(--line)}
.elections-list .title{font-size:1.05rem}
.election-calendar,.election-forums,.voting-sites,.link-list{list-style:none;margin:.5rem 0;padding:0}
.election-calendar>li,.election-forums>li{padding:.4rem 0;border-bottom:1px solid var(--line)}
.election-calendar .when,.election-forums time{display:block;font-size:.875rem;color:var(--muted)}
.voting-sites li,.link-list li{padding:.3rem 0}
.link-list .note,.voting-sites .note{display:block;font-size:.8rem;color:var(--muted)}
.link-list a,.voting-sites a{display:inline-block}
.election-links>section>h3{margin-top:1rem}
.races-list{list-style:none;margin:.5rem 0;padding:0}
.races-list>li{padding:.4rem 0;border-bottom:1px solid var(--line)}
.races-list .title{font-size:1.05rem}
.neutrality{font-size:.9rem;color:var(--muted);background:var(--soft);border-left:4px solid var(--line);padding:.5rem .75rem;margin:.75rem 0}
.table-scroll{position:relative;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:.5rem 0;max-width:100%}
.race-table{border-collapse:collapse;min-width:34rem;width:100%;font-size:.95rem}
.race-table th,.race-table td{text-align:left;vertical-align:top;padding:.5rem .75rem;border-bottom:1px solid var(--line);overflow-wrap:normal}
.race-table thead th{font-size:.8rem;text-transform:uppercase;letter-spacing:.02em;color:var(--muted);border-bottom:2px solid var(--line)}
.race-table tbody th{font-weight:600;min-width:9rem}
.race-table .empty{color:var(--muted)}
.race-table tr.unnamed th{font-weight:400;color:var(--muted);font-style:italic}
.visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (min-width:40rem){.election-calendar .when,.election-forums time{display:inline-block;min-width:16rem;vertical-align:top}}
@media (min-width:40rem){h1{font-size:2rem}body{font-size:17px}}
`;
