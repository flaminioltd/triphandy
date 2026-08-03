const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../apps/mobile/src/lib/local-info-data.ts');
const CSV_URL = 'https://raw.githubusercontent.com/database-of-embassies/database-of-embassies/master/database_of_embassies.csv';

// Helper to wait
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log('1. Parsing countries.ts to get valid codes...');
  const countriesTs = fs.readFileSync(path.join(__dirname, '../apps/mobile/src/lib/countries.ts'), 'utf-8');
  const countryMatches = [...countriesTs.matchAll(/name:\s*'([^']+)',\s*region:[^,]+,\s*code:\s*'([^']+)'/g)];
  const nameToCode = {};
  for (const match of countryMatches) {
    nameToCode[match[1]] = match[2];
  }
  
  // Manual overrides for Wikidata names
  const overrides = {
    'United States of America': 'US',
    "People's Republic of China": 'CN',
    'South Korea': 'KR',
    'Kingdom of Denmark': 'DK',
    'Czech Republic': 'CZ',
    'Republic of Ireland': 'IE',
    'Great Britain': 'GB',
    'United Kingdom': 'GB',
    'Vatican City': 'IT', // sometimes mapped inside Italy
    'Türkiye': 'TR',
    'Turkey': 'TR',
  };
  Object.assign(nameToCode, overrides);

  console.log('2. Fetching database_of_embassies.csv...');
  const csvRes = await fetch(CSV_URL);
  const csvContent = await csvRes.text();
  const lines = csvContent.split(/\r?\n/);
  const headers = lines[0].split(';');

  const operatorIdx = headers.indexOf('operator');
  const countryIdx = headers.indexOf('country');
  const qidIdx = headers.indexOf('QID');
  const typeIdx = headers.indexOf('type');
  const latIdx = headers.indexOf('latitude');
  const lonIdx = headers.indexOf('longitude');

  const combinations = {}; // destCode -> homeCode -> record

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < headers.length - 1) continue;
    
    let operator = cols[operatorIdx];
    let country = cols[countryIdx];
    const qidUrl = cols[qidIdx];
    const type = cols[typeIdx];
    const lat = cols[latIdx];
    const lon = cols[lonIdx];

    if (!operator || !country || !qidUrl) continue;
    
    const qid = qidUrl.split('/').pop();
    const homeCode = nameToCode[operator];
    const destCode = nameToCode[country];
    
    if (homeCode && destCode && homeCode !== destCode) {
      if (!combinations[destCode]) combinations[destCode] = {};
      
      const existing = combinations[destCode][homeCode];
      let priority = type === 'embassy' ? 3 : type === 'consulate general' ? 2 : type === 'consulate' ? 1 : 0;
      let existingPriority = existing ? (existing.type === 'embassy' ? 3 : existing.type === 'consulate general' ? 2 : existing.type === 'consulate' ? 1 : 0) : -1;
      
      if (priority > existingPriority) {
        combinations[destCode][homeCode] = { qid, type, lat, lon };
      }
    }
  }

  const allTargets = [];
  for (const destCode in combinations) {
    for (const homeCode in combinations[destCode]) {
      allTargets.push({ destCode, homeCode, ...combinations[destCode][homeCode] });
    }
  }

  console.log(`Found ${allTargets.length} valid combinations.`);

  console.log('3. Fetching Wikidata SPARQL...');
  // We can fetch in batches of 50 QIDs
  const BATCH_SIZE = 50;
  for (let i = 0; i < allTargets.length; i += BATCH_SIZE) {
    const batch = allTargets.slice(i, i + BATCH_SIZE);
    const qids = batch.map(b => `wd:${b.qid}`).join(' ');
    
    const sparql = `
      SELECT ?embassy ?website ?address ?phone WHERE {
        VALUES ?embassy { ${qids} }
        OPTIONAL { ?embassy wdt:P856 ?website. }
        OPTIONAL { ?embassy wdt:P6375 ?address. }
        OPTIONAL { ?embassy wdt:P1329 ?phone. }
      }
    `;
    
    try {
      const res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TripHandyBot/1.0 (benko@example.com)'
        },
        body: `query=${encodeURIComponent(sparql)}`
      });
      const data = await res.json();
      const bindings = data.results.bindings;
      for (const b of batch) {
        // Find matching binding
        const qidUrl = `http://www.wikidata.org/entity/${b.qid}`;
        // There could be multiple bindings if multiple websites etc. We just take the first.
        const match = bindings.find(bind => bind.embassy.value === qidUrl);
        if (match) {
          if (match.website) b.website = match.website.value;
          if (match.address) b.address = match.address.value;
          if (match.phone) b.phone = match.phone.value;
        }
      }
      console.log(`Wikidata batch ${i/BATCH_SIZE + 1} completed.`);
    } catch (e) {
      console.error(`Wikidata error on batch ${i/BATCH_SIZE + 1}:`, e.message);
    }
    await delay(1000); // 1s delay
  }

  console.log('4. Fetching highly accurate addresses from OSM Overpass...');
  const OSM_BATCH_SIZE = 25;
  for (let i = 0; i < allTargets.length; i += OSM_BATCH_SIZE) {
    const batch = allTargets.slice(i, i + OSM_BATCH_SIZE).filter(t => t.lat && t.lon);
    if (batch.length === 0) continue;

    // Batch multiple around queries
    const queryStatements = batch.map(t => `node["amenity"~"embassy|consulate"](around:200, ${t.lat}, ${t.lon});`).join('');
    const query = `[out:json];(${queryStatements});out body;`;
    
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TripHandyBot/1.0 (benko@example.com)'
        },
        body: `data=${encodeURIComponent(query)}`
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error(`OSM JSON Parse Error on batch ${i/OSM_BATCH_SIZE + 1}. First 100 chars: ${text.substring(0, 100)}`);
        await delay(5000); // 5s backoff
        continue;
      }
      
      const elements = data.elements;
      if (elements && elements.length > 0) {
        for (const target of batch) {
          // Find the closest element to this target
          const targetLat = parseFloat(target.lat);
          const targetLon = parseFloat(target.lon);
          
          // Simple euclidean distance just to match the closest returned node
          let closestEl = null;
          let minDist = Infinity;
          for (const el of elements) {
            const dist = Math.pow(el.lat - targetLat, 2) + Math.pow(el.lon - targetLon, 2);
            if (dist < minDist) {
              minDist = dist;
              closestEl = el;
            }
          }
          
          if (closestEl && minDist < 0.0001) { // roughly within ~100m
            const tags = closestEl.tags;
            let street = tags['addr:street'] || '';
            let housenumber = tags['addr:housenumber'] || '';
            let city = tags['addr:city'] || '';
            let postcode = tags['addr:postcode'] || '';
            
            let osmAddressParts = [];
            if (street && housenumber) osmAddressParts.push(`${housenumber} ${street}`);
            else if (street) osmAddressParts.push(street);
            
            if (city && postcode) osmAddressParts.push(`${postcode} ${city}`);
            else if (city) osmAddressParts.push(city);
            
            if (osmAddressParts.length > 0) {
              target.address = osmAddressParts.join(', '); // Override with highly accurate OSM address
            }
            if (tags['website'] && !target.website) {
              target.website = tags['website'];
            }
            if (tags['phone'] && !target.phone) {
              target.phone = tags['phone'];
            }
          }
        }
      }
    } catch (e) {
      console.error(`OSM error on batch ${i/OSM_BATCH_SIZE + 1}:`, e.message);
    }
    
    console.log(`OSM progress: ${Math.min(i + OSM_BATCH_SIZE, allTargets.length)}/${allTargets.length}`);
    await delay(3000); // 3s delay for Overpass batch to avoid 429 Too Many Requests
  }

  console.log('5. Assembling output object...');
  const EMBASSIES = {};
  for (const t of allTargets) {
    if (!EMBASSIES[t.destCode]) EMBASSIES[t.destCode] = {};
    EMBASSIES[t.destCode][t.homeCode] = {
      name: t.type === 'embassy' ? 'Embassy' : (t.type === 'consulate general' ? 'Consulate General' : 'Consulate'),
      address: t.address || '',
      phone: t.phone || '',
      website: t.website || '',
      latitude: parseFloat(t.lat) || undefined,
      longitude: parseFloat(t.lon) || undefined
    };
  }

  console.log('6. Writing to src/lib/local-info-data.ts...');
  const localInfoTs = fs.readFileSync(DATA_FILE, 'utf-8');
  
  // We need to replace the export const EMBASSIES ... block.
  // We can use a regex to replace everything from `export const EMBASSIES: Record<string, Record<string, EmbassyInfo>> = {` 
  // to the end of that object.
  const regex = /export const EMBASSIES:[^=]+=\s*\{[\s\S]*?(?=\n\n|\n$)/;
  
  const formattedObj = JSON.stringify(EMBASSIES, null, 2).replace(/"([^"]+)":/g, '$1:');
  const replacement = `export const EMBASSIES: Record<string, Record<string, EmbassyInfo>> = ${formattedObj};`;
  
  const newLocalInfoTs = localInfoTs.replace(regex, replacement);
  fs.writeFileSync(DATA_FILE, newLocalInfoTs, 'utf-8');

  console.log('Done!');
}

main().catch(console.error);
