# radar

Who is buying what in Portugal's public sector — a searchable view of public tenders by sector and district.

A snapshot of the notices read by the amplified tender radar from **Portal BASE**, **Diário da República** and **TED**: every notice with its buyer, district, sector, base price, deadline, procedure and a link to the official announcement. Filter by sector (or the "digital & communication" group), click a district on the map, search titles and buyers, sort by newest, closing soonest or value.

The map is Portugal drawn in ridge lines. Each line is a slice of the country, and its peaks rise with the tenders in view — so the landscape reshapes itself as you filter: search "vídeo" or pick a sector and the mountains move. Click a district to light its ridges and read only its notices; hover a notice and its district lights up.

## How it works

- `data.json` — the snapshot, exported from our private radar. Public information only: the fields a published notice already carries.
- **District** comes from the buyer's name (a municipality, or a region such as *Algarve* or *Alto Minho*). National bodies — ministries, agencies, the armed forces — have no district and are grouped apart.
- **Sector** comes from the first CPV code, with the broad "business services" division (79) split by sub-code: marketing, design, events, printing, security, consultancy, and so on.
- **Deadlines** are counted from the snapshot date, so the page reads the same however old the data is.
- `districts.js` — district outlines from [Natural Earth](https://www.naturalearthdata.com/) (public domain), projected and simplified to SVG paths; Azores and Madeira as insets.
- **The ridges** are drawn in the browser: the outlines are painted once to an offscreen canvas as a lookup mask (which district owns each point), then every row of the map is a polyline whose height is a sum of Gaussian peaks centred on each district, weighted by its share of the tenders in the current view. Each row is filled with the background before it is stroked, so nearer rows hide the ones behind.

No build step, no dependencies. Serve the folder over HTTP and open `index.html`.

The radar detects; it never submits anything.

## Licence

MIT. Map data: Natural Earth, public domain.
