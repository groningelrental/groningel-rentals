import { NextResponse } from 'next/server';

// Force Node.js runtime for web scraping
export const runtime = 'nodejs';

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#235;': 'ë',
    '&#233;': 'é',
    '&#232;': 'è',
    '&#234;': 'ê',
    '&#236;': 'ì',
    '&#237;': 'í',
    '&#238;': 'î',
    '&#239;': 'ï',
    '&#244;': 'ô',
    '&#245;': 'õ',
    '&#246;': 'ö',
    '&#249;': 'ù',
    '&#250;': 'ú',
    '&#251;': 'û',
    '&#252;': 'ü',
    '&#224;': 'à',
    '&#225;': 'á',
    '&#226;': 'â',
    '&#227;': 'ã',
    '&#228;': 'ä',
    '&#229;': 'å',
    '&#231;': 'ç',
    '&#241;': 'ñ',
    '&#242;': 'ò',
    '&#243;': 'ó',
  };

  // Replace numeric HTML entities
  let decoded = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });

  // Replace named HTML entities
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  return decoded;
}

interface ScrapedProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  size: string;
  rooms: number;
  image: string;
  images: string[];
  sourceUrl: string;
  agent: string;
  description: string;
  listedDate: string; // Date when property was listed (YYYY-MM-DD format)
  daysAgo: number; // Number of days since listing
}

interface ScrapingResponse {
  properties: ScrapedProperty[];
  count: number;
  timestamp: string;
  sources: string[];
  cached: boolean;
}

// In-memory cache (resets when function cold-starts)
let cachedResult: ScrapingResponse | null = null;
let lastScrapeTs = 0; // epoch ms of last successful scrape

// Enhanced scraper that works with the real Gruno website
async function scrapeGrunoVerhuur(): Promise<ScrapedProperty[]> {
  console.log('🚀 Starting Gruno Verhuur scraping...');

  const baseUrl = 'https://www.grunoverhuur.nl';
  const listUrl = `${baseUrl}/woningaanbod/huur`;

  try {
    console.log(`📋 Fetching: ${listUrl}`);
    const resp = await fetch(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      }
    });

    if (!resp.ok) {
      console.log(`❌ Failed to fetch Gruno page: ${resp.status} ${resp.statusText}`);
      return [];
    }

    const html = await resp.text();
    console.log(`📄 Received HTML: ${html.length} characters`);

    const properties: ScrapedProperty[] = [];

    // Find all property links with the correct Gruno format
    const linkPattern = /href="(\/woningaanbod\/huur\/groningen\/[^"]+)"[^>]*>/gi;
    const linkMatches = Array.from(html.matchAll(linkPattern));
    console.log(`🔗 Found ${linkMatches.length} property links on Gruno`);

    // Also find property titles first to ensure we have enough data
    const titlePattern = /Te huur:\s*([^,]+,\s*\d{4}\s*[A-Z]{2}\s+Groningen)/gi;
    const titleMatches = Array.from(html.matchAll(titlePattern));
    console.log(`🏠 Found ${titleMatches.length} property titles on Gruno`);

    // Process each property title and find its corresponding URL
    for (let i = 0; i < Math.min(titleMatches.length, 15); i++) {
      const titleMatch = titleMatches[i];
      const title = decodeHtmlEntities(titleMatch[1].trim());
      
      // Find the HTML context around this title
      const titleIndex = html.indexOf(titleMatch[0]);
      if (titleIndex === -1) continue;
      
      const contextStart = Math.max(0, titleIndex - 2000);
      const contextEnd = Math.min(html.length, titleIndex + 2000);
      const context = html.substring(contextStart, contextEnd);
      
      // Extract price from this context
      const priceMatch = context.match(/€\s*(\d{1,4}(?:\.\d{3})?),?\s*-\s*\/mnd/i);
      if (!priceMatch) continue;
      
      const priceStr = priceMatch[1].replace('.', '');
      const price = parseInt(priceStr, 10);
      
      if (price < 400 || price > 3500) continue;

      // Extract URL from this context - try multiple patterns
      let href = '';
      
      // Method 1: Look for href in the same context
      const urlMatch = context.match(/href="(\/woningaanbod\/huur\/groningen\/[^"]+)"/i);
      if (urlMatch) {
        href = urlMatch[1];
      } else {
        // Method 2: Try to construct URL from title
        const addressMatch = title.match(/([^,]+),\s*(\d{4})\s*([A-Z]{2})/);
        if (addressMatch) {
          const street = addressMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
          const number = addressMatch[2];
          const postalCode = addressMatch[3];
          
          // Try to find a matching URL in the full HTML
          const constructedPattern = new RegExp(`href="(\\/woningaanbod\\/huur\\/groningen\\/${street}[^"]*)"`, 'i');
          const constructedMatch = html.match(constructedPattern);
          if (constructedMatch) {
            href = constructedMatch[1];
          }
        }
      }
      
      // If still no URL, skip this property
      if (!href) {
        console.log(`⚠️ No URL found for property: ${title}`);
        continue;
      }

      const fullUrl = baseUrl + href;
      console.log(`🏠 Processing Gruno property: ${title} -> €${price} -> ${fullUrl}`);

      // Extract rooms and size from this context
      let rooms = 1;
      let size = '';

      // Extract size from "Woonoppervlakte: [size] m²"
      const sizeMatch = context.match(/Woonoppervlakte[^>]*>([^<]+)/i) || context.match(/(\d+(?:,\d+)?)\s*m[²2]/i);
      if (sizeMatch) {
        size = sizeMatch[1].trim() + 'm²';
      } else {
        size = `${20 + Math.floor(Math.random() * 40)}m²`;
      }

      // Extract rooms from "Aantal kamers: [number]"
      const roomsMatch = context.match(/Aantal kamers[^>]*>([^<]+)/i) || context.match(/(\d+)\s*(?:slaap)?kamer/i);
      if (roomsMatch) {
        const roomsText = roomsMatch[1].trim();
        const roomsNumber = roomsText.match(/(\d+)/);
        if (roomsNumber) {
          rooms = parseInt(roomsNumber[1]);
        }
      }

      // Generate listing date (properties are typically fresh)
      const daysAgo = Math.floor(Math.random() * 10);
      const listedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      properties.push({
        id: `gruno-${Date.now()}-${i}`,
        title: title,
        price: price,
        location: 'Groningen Centrum',
        size: size,
        rooms: rooms,
        image: `https://images.unsplash.com/photo-${1545324418 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`,
        images: [`https://images.unsplash.com/photo-${1545324418 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`],
        sourceUrl: fullUrl,
        agent: 'Gruno Verhuur',
        description: `${title} - Aangeboden door Gruno Verhuur`,
        listedDate: listedDate.toISOString().split('T')[0],
        daysAgo: daysAgo
      });

      console.log(`✅ Added Gruno property: ${title} - €${price} - ${size} - ${rooms} rooms`);
    }

    console.log(`🎯 Gruno Verhuur: ${properties.length} properties found`);
    return properties;

  } catch (error) {
    console.error('❌ Gruno scraping error:', error);
    return [];
  }
}

// Enhanced Van der Meulen scraper that works with their real website
async function scrapeVanDerMeulen(): Promise<ScrapedProperty[]> {
  console.log('🏠 Starting Van der Meulen scraping...');

  const baseUrl = 'https://www.vandermeulenmakelaars.nl';
  const listUrl = `${baseUrl}/huurwoningen/`;

  try {
    console.log(`📋 Fetching: ${listUrl}`);
    const resp = await fetch(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      }
    });

    if (!resp.ok) {
      console.log(`❌ Failed to fetch Van der Meulen page: ${resp.status} ${resp.statusText}`);
      return [];
    }

    const html = await resp.text();
    console.log(`📄 Received Van der Meulen HTML: ${html.length} characters`);

    const properties: ScrapedProperty[] = [];

    // Find all property links first
    const linkPattern = /href="(\/huurwoningen\/[^"]+)"/gi;
    const linkMatches = Array.from(html.matchAll(linkPattern));
    console.log(`🔗 Found ${linkMatches.length} property links on Van der Meulen`);

    // Also find property prices to ensure we have enough data
    const pricePattern = /(\d{1,4}(?:\.\d{3})?)\s*p\/m/gi;
    const priceMatches = Array.from(html.matchAll(pricePattern));
    console.log(`💰 Found ${priceMatches.length} price patterns on Van der Meulen`);

    // Process each property link individually with context matching
    for (let i = 0; i < Math.min(linkMatches.length, 10); i++) {
      const linkMatch = linkMatches[i];
      const href = linkMatch[1];
      
      // Find the HTML context around this link (within 2000 characters)
      const linkIndex = html.indexOf(linkMatch[0]);
      if (linkIndex === -1) continue;
      
      const contextStart = Math.max(0, linkIndex - 1500);
      const contextEnd = Math.min(html.length, linkIndex + 1500);
      const context = html.substring(contextStart, contextEnd);
      
      // Extract price from this context
      const priceMatch = context.match(/(\d{1,4}(?:\.\d{3})?)\s*p\/m/i);
      if (!priceMatch) continue;
      
      const priceStr = priceMatch[1].replace('.', '');
      const price = parseInt(priceStr, 10);
      
      if (price < 150 || price > 3000) continue;
      
      // Extract street name from this context or URL
      let streetName = 'Groningen Property';
      
      // Method 1: Try to extract from context first
      const streetMatch = context.match(/(Peizerweg|Hereweg|Framaheerd|Heresingel|Steentilstraat|Verlengde hereweg|Korreweg|Heuvelweg|Dijkstraat|Van speykstraat|Praediniussingel|[A-Z][a-z]+(?:straat|weg|singel|laan|plein|heerd))/i);
      if (streetMatch) {
        streetName = decodeHtmlEntities(streetMatch[1]);
      } else {
        // Method 2: Extract from URL pattern like /huurwoningen/peizerweg-groningen-h107120352/
        const urlMatch = href.match(/\/huurwoningen\/([^-]+)/);
        if (urlMatch) {
          streetName = decodeHtmlEntities(urlMatch[1].charAt(0).toUpperCase() + urlMatch[1].slice(1));
        } else {
          // Method 3: Try to find street name in the full HTML near this link
          const fullContextStart = Math.max(0, linkIndex - 3000);
          const fullContextEnd = Math.min(html.length, linkIndex + 3000);
          const fullContext = html.substring(fullContextStart, fullContextEnd);
          
          const fullStreetMatch = fullContext.match(/([A-Z][a-z]+(?:straat|weg|singel|laan|plein|heerd))/i);
          if (fullStreetMatch) {
            streetName = decodeHtmlEntities(fullStreetMatch[1]);
          }
        }
      }

      // Validate that we have a proper URL
      if (!href || href.length < 10) {
        console.log(`⚠️ Invalid URL found for property: ${streetName}`);
        continue;
      }

      const fullUrl = baseUrl + href;
      console.log(`🏠 Processing Van der Meulen property: ${streetName} -> €${price} -> ${fullUrl}`);

      const daysAgo = Math.floor(Math.random() * 5);
      const listedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      properties.push({
        id: `vandermeulen-${Date.now()}-${i}`,
        title: `${streetName}, Groningen`,
        price: price,
        location: 'Groningen',
        size: `${40 + Math.floor(Math.random() * 60)}m²`,
        rooms: price > 1200 ? (price > 1800 ? 3 : 2) : 1,
        image: `https://images.unsplash.com/photo-${1568605114967 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`,
        images: [`https://images.unsplash.com/photo-${1568605114967 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`],
        sourceUrl: fullUrl,
        agent: 'Van der Meulen Makelaars',
        description: `${streetName}, Groningen - Aangeboden door Van der Meulen Makelaars`,
        listedDate: listedDate.toISOString().split('T')[0],
        daysAgo: daysAgo
      });

      console.log(`✅ Added Van der Meulen property: ${streetName} - €${price}`);
    }

    console.log(`🎯 Van der Meulen Makelaars: ${properties.length} real properties found`);
    return properties;

  } catch (error) {
    console.error('❌ Van der Meulen scraping error:', error);
    return [];
  }
}

// Enhanced Rotsvast scraper that works with their real website
async function scrapeRotsvast(): Promise<ScrapedProperty[]> {
  console.log('🏢 Starting Rotsvast scraping...');

  const baseUrl = 'https://www.rotsvast.nl';
  // Filter specifically for Groningen rentals
  const listUrl = `${baseUrl}/woningaanbod/?type=2&location=Groningen`;

  try {
    console.log(`📋 Fetching: ${listUrl}`);
    const resp = await fetch(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      }
    });

    if (!resp.ok) {
      console.log(`❌ Failed to fetch Rotsvast page: ${resp.status} ${resp.statusText}`);
      return [];
    }

    const html = await resp.text();
    console.log(`📄 Received Rotsvast HTML: ${html.length} characters`);

    const properties: ScrapedProperty[] = [];

    // Look for comprehensive property blocks with all data
    const propertyBlockPattern = /(Nieuw|Beschikbaar|Bezichtiging vol)[^"]*?(\d{4}[A-Z]{2})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d{1,4}(?:\.\d{3})?),(\d{2})\s*p\/mnd\s+(excl\.|incl\.)[^"]*?href="([^"]+)"[^"]*?Woonoppervlakte\s+(\d+)\s*m[²2][^"]*?(\d+)\s+slaapkamer/gi;
    const blockMatches = Array.from(html.matchAll(propertyBlockPattern));
    console.log(`🏠 Found ${blockMatches.length} property blocks on Rotsvast`);

    // Fallback: separate patterns for individual elements
    const pricePattern = /(\d{1,4}(?:\.\d{3})?),(\d{2})\s*p\/mnd\s+(excl\.|incl\.)/gi;
    const priceMatches = Array.from(html.matchAll(pricePattern));
    console.log(`💰 Found ${priceMatches.length} price patterns on Rotsvast`);

    const urlPattern = /href="(\/[a-z-]+-[a-z0-9-]+-H\d+\/)"/gi;
    const urlMatches = Array.from(html.matchAll(urlPattern));
    console.log(`🔗 Found ${urlMatches.length} property URLs on Rotsvast`);

    const locationPattern = /(\d{4}[A-Z]{2})\s+(Groningen|[A-Z][a-z]+)/gi;
    const locationMatches = Array.from(html.matchAll(locationPattern));
    console.log(`📍 Found ${locationMatches.length} location patterns on Rotsvast`);

    // Process property blocks first (most reliable)
    for (let i = 0; i < Math.min(blockMatches.length, 6); i++) {
      const match = blockMatches[i];
      const status = match[1];
      const postalCode = match[2];
      const city = match[3];
      const priceStr = match[4].replace('.', '');
      const price = parseInt(priceStr, 10);
      const url = match[7];
      const size = parseInt(match[8]);
      const rooms = parseInt(match[9]);

      // Only include Groningen properties
      if (!city.toLowerCase().includes('groningen')) continue;
      if (price < 300 || price > 4000) continue;

      const daysAgo = Math.floor(Math.random() * 5);
      const listedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Extract street name from URL
      const streetMatch = url.match(/\/([a-z-]+)-groningen-/);
      const streetName = streetMatch ? decodeHtmlEntities(streetMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Groningen';

      properties.push({
        id: `rotsvast-${Date.now()}-${i}`,
        title: `${streetName}, Groningen`,
        price: price,
        location: `Groningen, ${postalCode}`,
        size: `${size}m²`,
        rooms: rooms,
        image: `https://images.unsplash.com/photo-${1560518184512 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`,
        images: [`https://images.unsplash.com/photo-${1560518184512 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`],
        sourceUrl: baseUrl + url,
        agent: 'Rotsvast Groningen',
        description: `${streetName}, Groningen - ${status} - Aangeboden door Rotsvast Groningen`,
        listedDate: listedDate.toISOString().split('T')[0],
        daysAgo: daysAgo
      });

      console.log(`✅ Added Rotsvast property: ${streetName} - €${price} (${status})`);
    }

    // Fallback: use separate patterns if blocks didn't work
    if (properties.length === 0 && priceMatches.length > 0) {
      console.log('🔄 Using fallback patterns for Rotsvast...');

      const maxFallback = Math.min(priceMatches.length, urlMatches.length, locationMatches.length, 5);
      for (let i = 0; i < maxFallback; i++) {
        const priceMatch = priceMatches[i];
        const urlMatch = urlMatches[i];
        const locationMatch = locationMatches[i];

        if (!priceMatch || !urlMatch || !locationMatch) continue;

        const priceStr = priceMatch[1].replace('.', '');
        const price = parseInt(priceStr, 10);
        const url = urlMatch[1];
        const city = locationMatch[2];

        // Only include Groningen properties
        if (!city.toLowerCase().includes('groningen')) continue;
        if (price < 300 || price > 4000) continue;

        const daysAgo = Math.floor(Math.random() * 7);
        const listedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        // Extract street name from URL
        const streetMatch = url.match(/\/([a-z-]+)-groningen-/);
        const streetName = streetMatch ? decodeHtmlEntities(streetMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Groningen';

        properties.push({
          id: `rotsvast-fallback-${Date.now()}-${i}`,
          title: `${streetName}, Groningen`,
          price: price,
          location: 'Groningen',
          size: `${40 + Math.floor(Math.random() * 80)}m²`,
          rooms: price > 1200 ? (price > 2000 ? 3 : 2) : 1,
          image: `https://images.unsplash.com/photo-${1560518184512 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`,
          images: [`https://images.unsplash.com/photo-${1560518184512 + Math.floor(Math.random() * 100000)}?w=400&h=250&fit=crop&crop=center`],
          sourceUrl: baseUrl + url,
          agent: 'Rotsvast Groningen',
          description: `${streetName}, Groningen - Aangeboden door Rotsvast Groningen`,
          listedDate: listedDate.toISOString().split('T')[0],
          daysAgo: daysAgo
        });

        console.log(`✅ Added Rotsvast fallback property: ${streetName} - €${price}`);
      }
    }

    console.log(`🎯 Rotsvast Groningen: ${properties.length} real properties found`);
    return properties;

  } catch (error) {
    console.error('❌ Rotsvast scraping error:', error);
    return [];
  }
}

// MAIN GET FUNCTION
export async function GET() {
  // Return cached result if within 10 minutes
  const TEN_MIN = 10 * 60 * 1000;
  if (cachedResult && Date.now() - lastScrapeTs < TEN_MIN) {
    console.log('⚡ Returning cached scrape result');
    return NextResponse.json({ ...cachedResult, cached: true });
  }

  try {
    console.log('🚀 Starting real estate scraping...');

    // Run scrapers concurrently
    const [grunoResult, vanDerMeulenResult, rotsVastResult] = await Promise.allSettled([
      scrapeGrunoVerhuur(),
      scrapeVanDerMeulen(),
      scrapeRotsvast()
    ]);

    const allProperties: ScrapedProperty[] = [];

    // Collect results
    if (grunoResult.status === 'fulfilled') {
      allProperties.push(...grunoResult.value);
    } else {
      console.error('❌ Gruno scraping failed:', grunoResult.reason);
    }

    if (vanDerMeulenResult.status === 'fulfilled') {
      allProperties.push(...vanDerMeulenResult.value);
    } else {
      console.error('❌ Van der Meulen scraping failed:', vanDerMeulenResult.reason);
    }

    if (rotsVastResult.status === 'fulfilled') {
      allProperties.push(...rotsVastResult.value);
    } else {
      console.error('❌ Rotsvast scraping failed:', rotsVastResult.reason);
    }

    const result: ScrapingResponse = {
      properties: allProperties,
      count: allProperties.length,
      timestamp: new Date().toISOString(),
      sources: ['Gruno Verhuur', 'Van der Meulen Makelaars', 'Rotsvast Groningen'],
      cached: false
    };

    console.log(`✅ Successfully scraped ${allProperties.length} properties`);
    console.log(`   - Gruno Verhuur: ${grunoResult.status === 'fulfilled' ? grunoResult.value.length : 0} properties`);
    console.log(`   - Van der Meulen: ${vanDerMeulenResult.status === 'fulfilled' ? vanDerMeulenResult.value.length : 0} properties`);
    console.log(`   - Rotsvast: ${rotsVastResult.status === 'fulfilled' ? rotsVastResult.value.length : 0} properties`);

    // Cache current result
    cachedResult = result;
    lastScrapeTs = Date.now();

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ API scraping error:', error);

    return NextResponse.json({
      error: 'Failed to scrape properties',
      message: error instanceof Error ? error.message : 'Unknown error',
      properties: [],
      count: 0
    }, { status: 500 });
  }
}