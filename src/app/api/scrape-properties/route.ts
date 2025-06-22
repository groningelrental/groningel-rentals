import { NextResponse } from "next/server";

// Force Node.js runtime for web scraping
export const runtime = "nodejs";

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
const cachedResult: ScrapingResponse | null = null;
const lastScrapeTs = 0; // epoch ms of last successful scrape

// Helper function to generate unique IDs
function generateUniqueId(prefix: string, index: number): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
}

// Static property data for Gruno Verhuur
function getGrunoProperties(): ScrapedProperty[] {
  return [
    {
      id: generateUniqueId("gruno", 0),
      title: "Hoendiep 61A, 9718TC Groningen",
      price: 424,
      location: "Groningen Centrum",
      size: "43m²",
      rooms: 1,
      image:
        "https://images.unsplash.com/photo-1545374823?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1545374823?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.grunoverhuur.nl/woningaanbod/huur/groningen/hoendiep/61-a-ref-00662",
      agent: "Gruno Verhuur",
      description:
        "Hoendiep 61A, 9718TC Groningen - Aangeboden door Gruno Verhuur",
      listedDate: "2025-06-19",
      daysAgo: 3,
    },
    {
      id: generateUniqueId("gruno", 1),
      title: "Jozef Israëlsstraat 29, 9718GB Groningen",
      price: 720,
      location: "Groningen Centrum",
      size: "47m²",
      rooms: 1,
      image:
        "https://images.unsplash.com/photo-1545408115?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1545408115?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.grunoverhuur.nl/woningaanbod/huur/groningen/jozef-israelsstraat/29",
      agent: "Gruno Verhuur",
      description:
        "Jozef Israëlsstraat 29, 9718GB Groningen - Aangeboden door Gruno Verhuur",
      listedDate: "2025-06-21",
      daysAgo: 1,
    },
    {
      id: generateUniqueId("gruno", 2),
      title: "Nieuwe Ebbingestraat 175a, 9715BC Groningen",
      price: 670,
      location: "Groningen Centrum",
      size: "25m²",
      rooms: 1,
      image:
        "https://images.unsplash.com/photo-1545421683?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1545421683?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.grunoverhuur.nl/woningaanbod/huur/groningen/nieuwe-ebbingestraat/175-a-ref-00659",
      agent: "Gruno Verhuur",
      description:
        "Nieuwe Ebbingestraat 175a, 9715BC Groningen - Aangeboden door Gruno Verhuur",
      listedDate: "2025-06-15",
      daysAgo: 7,
    },
    {
      id: generateUniqueId("gruno", 3),
      title: "Friesestraatweg 17, 9718NA Groningen",
      price: 1500,
      location: "Groningen Centrum",
      size: "24m²",
      rooms: 1,
      image:
        "https://images.unsplash.com/photo-1545365399?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1545365399?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.grunoverhuur.nl/woningaanbod/huur/groningen/friesestraatweg/17",
      agent: "Gruno Verhuur",
      description:
        "Friesestraatweg 17, 9718NA Groningen - Aangeboden door Gruno Verhuur",
      listedDate: "2025-06-18",
      daysAgo: 4,
    },
    {
      id: generateUniqueId("gruno", 4),
      title: "Kloosterstraat 49, 9717LC Groningen",
      price: 1500,
      location: "Groningen Centrum",
      size: "43m²",
      rooms: 1,
      image:
        "https://images.unsplash.com/photo-1545374394?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1545374394?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.grunoverhuur.nl/woningaanbod/huur/groningen/kloosterstraat/49",
      agent: "Gruno Verhuur",
      description:
        "Kloosterstraat 49, 9717LC Groningen - Aangeboden door Gruno Verhuur",
      listedDate: "2025-06-16",
      daysAgo: 6,
    },
  ];
}

// Static property data for Van der Meulen
function getVanDerMeulenProperties(): ScrapedProperty[] {
  return [
    {
      id: generateUniqueId("vandermeulen", 0),
      title: "Van Lenneplaan, Groningen",
      price: 1475,
      location: "Groningen",
      size: "85m²",
      rooms: 2,
      image:
        "https://images.unsplash.com/photo-1568605213714?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1568605213714?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.vandermeulenmakelaars.nl/huurwoningen/van-lenneplaan-groningen-h107120027/",
      agent: "Van der Meulen Makelaars",
      description:
        "Van Lenneplaan, Groningen - Aangeboden door Van der Meulen Makelaars",
      listedDate: "2025-06-22",
      daysAgo: 0,
    },
    {
      id: generateUniqueId("vandermeulen", 1),
      title: "Hereweg, Groningen",
      price: 1200,
      location: "Groningen",
      size: "60m²",
      rooms: 2,
      image:
        "https://images.unsplash.com/photo-1568605213411?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1568605213411?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.vandermeulenmakelaars.nl/huurwoningen/hereweg-groningen-h107120377/",
      agent: "Van der Meulen Makelaars",
      description:
        "Hereweg, Groningen - Aangeboden door Van der Meulen Makelaars",
      listedDate: "2025-06-21",
      daysAgo: 1,
    },
    {
      id: generateUniqueId("vandermeulen", 2),
      title: "Heresingel, Groningen",
      price: 1215,
      location: "Groningen",
      size: "60m²",
      rooms: 2,
      image:
        "https://images.unsplash.com/photo-1568605195903?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1568605195903?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.vandermeulenmakelaars.nl/huurwoningen/heresingel-groningen-h107120090/",
      agent: "Van der Meulen Makelaars",
      description:
        "Heresingel, Groningen - Aangeboden door Van der Meulen Makelaars",
      listedDate: "2025-06-21",
      daysAgo: 1,
    },
    {
      id: generateUniqueId("vandermeulen", 4),
      title: "Gorterlaan, Groningen",
      price: 1765,
      location: "Groningen",
      size: "110m²",
      rooms: 2,
      image:
        "https://images.unsplash.com/photo-1568605114976?w=400&h=250&fit=crop&crop=center",
      images: [
        "https://images.unsplash.com/photo-1568605114976?w=400&h=250&fit=crop&crop=center",
      ],
      sourceUrl:
        "https://www.vandermeulenmakelaars.nl/huurwoningen/gorterlaan-groningen-h107120408/",
      agent: "Van der Meulen Makelaars",
      description:
        "Gorterlaan, Groningen - Aangeboden door Van der Meulen Makelaars",
      listedDate: "2025-06-19",
      daysAgo: 3,
    },
  ];
}

// Static property data for Nova Vastgoed
function getNovaVastgoedProperties(): ScrapedProperty[] {
  return [
    {
      id: generateUniqueId("nova", 1),
      title: "Zuiderpark: Souterrain kamer",
      price: 405,
      location: "9724 AE Groningen",
      size: "10m²",
      rooms: 1,
      image: "https://images.unsplash.com/photo-1560518217722?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518217722?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://www.novavastgoed.com/property/zuiderpark-souterrain-kamer/",
      agent: "Nova Vastgoed",
      description: "Zuiderpark: Souterrain kamer - Beschikbaar - 10m² kamer met eigen wastafel",
      listedDate: "2025-06-21",
      daysAgo: 1,
    },
    {
      id: generateUniqueId("nova", 2),
      title: "Old Ebbingestraat: Appartement in Groningen",
      price: 1423,
      location: "Groningen",
      size: "50m²",
      rooms: 2,
      image: "https://images.unsplash.com/photo-1560518240930?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518240930?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://www.novavastgoed.com/property/oude-ebbingestraat-appartement-in-groningen/",
      agent: "Nova Vastgoed",
      description: "Old Ebbingestraat: Appartement in Groningen - Nieuw in de verhuur - 50m² appartement",
      listedDate: "2025-06-20",
      daysAgo: 2,
    },
    {
      id: generateUniqueId("nova", 3),
      title: "Turftorenstraat: Studio 4",
      price: 1085,
      location: "Groningen",
      size: "20m²",
      rooms: 1,
      image: "https://images.unsplash.com/photo-1560518206746?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518206746?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://www.novavastgoed.com/property/turftorenstraat-studio-4/",
      agent: "Nova Vastgoed",
      description: "Turftorenstraat: Studio 4 - Beschikbaar - 20m² studio",
      listedDate: "2025-06-19",
      daysAgo: 3,
    },
    {
      id: generateUniqueId("nova", 4),
      title: "Grote Markt: Kamer in Centrum Groningen",
      price: 563,
      location: "Groningen Centrum",
      size: "14m²",
      rooms: 1,
      image: "https://images.unsplash.com/photo-1560518217569?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518217569?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://www.novavastgoed.com/property/grote-markt-kamer-in-centrum-groningen",
      agent: "Nova Vastgoed",
      description: "Grote Markt: Kamer in Centrum Groningen - Beschikbaar - 14m² kamer in centrum",
      listedDate: "2025-06-18",
      daysAgo: 4,
    },
    {
      id: generateUniqueId("nova", 5),
      title: "Boterdiep: Kamer in Groningen",
      price: 465,
      location: "Groningen",
      size: "14m²",
      rooms: 1,
      image: "https://images.unsplash.com/photo-1560518269591?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518269591?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://www.novavastgoed.com/property/boterdiep-kamer-in-groningen/",
      agent: "Nova Vastgoed",
      description: "Boterdiep: Kamer in Groningen - Beschikbaar - 14m² kamer",
      listedDate: "2025-06-17",
      daysAgo: 5,
    },
  ];
}

// Static property data for DC Wonen
function getDCWonenProperties(): ScrapedProperty[] {
  return [
    {
      id: generateUniqueId("dcwonen", 0),
      title: "Appartement Stationsweg – Bedum",
      price: 1225,
      location: "Stationsweg, 9781 Bedum, Netherlands",
      size: "98m²",
      rooms: 4,
      image: "https://images.unsplash.com/photo-1560518217722?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518217722?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://dcwonen.nl/appartement-stationsweg-bedum/",
      agent: "DC Wonen",
      description: "As of July 1st, a neat 4-room apartment (approx. 98m²) is available at the Stationsweg in Bedum. The apartment has four bedrooms, a spacious living room with open kitchen (approx. 46m²), separate toilet and balcony. The apartment is located on the first and second floor and is centrally heated.",
      listedDate: "2025-06-22",
      daysAgo: 0,
    },
    {
      id: generateUniqueId("dcwonen", 1),
      title: "Appartement Havenstraat",
      price: 1025,
      location: "Havenstraat, 9712 Groningen, Netherlands",
      size: "28m²",
      rooms: 1,
      image: "https://images.unsplash.com/photo-1560518240930?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518240930?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://dcwonen.nl/appartement-havenstraat/",
      agent: "DC Wonen",
      description: "As of July 1, an apartment (approx. 28m²) will become available on Havenstraat, located on the first floor. The apartment has a separate bedroom (approx. 7m²), separate bathroom, spacious living room with open kitchen (approx. 17m²) and a roof terrace.",
      listedDate: "2025-06-22",
      daysAgo: 0,
    },
    {
      id: generateUniqueId("dcwonen", 2),
      title: "Appartement Fongersplaats",
      price: 1129,
      location: "Fongersplaats, 9725 Groningen, Netherlands",
      size: "60m²",
      rooms: 1,
      image: "https://images.unsplash.com/photo-1560518206746?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518206746?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://dcwonen.nl/appartement-fongersplaats",
      agent: "DC Wonen",
      description: "As of August 1, a furnished apartment (approx. 60m²) will become available at Fongersplaats on the first floor with one bedroom and energy label A. The apartment is centrally heated by its own central heating boiler.",
      listedDate: "2025-06-22",
      daysAgo: 0,
    },
    {
      id: generateUniqueId("dcwonen", 3),
      title: "Appartement Oude Ebbingestraat",
      price: 1429,
      location: "Old Ebbingestraat, 9712 HB Groningen, Netherlands",
      size: "70m²",
      rooms: 2,
      image: "https://images.unsplash.com/photo-1560518217569?w=400&h=250&fit=crop&crop=center",
      images: ["https://images.unsplash.com/photo-1560518217569?w=400&h=250&fit=crop&crop=center"],
      sourceUrl: "https://dcwonen.nl/appartement-oude-ebbingestraat",
      agent: "DC Wonen",
      description: "In the center of Groningen in a very beautiful monumental building a spacious 3-room apartment in the basement will be available from July 1st. All facilities and shops are within walking distance of the apartment.",
      listedDate: "2025-06-22",
      daysAgo: 0,
    },
  ];
}

// MAIN GET FUNCTION
export async function GET() {
  try {
    console.log("🚀 Starting property data retrieval...");

    // Define data sources in an array
    const dataSources = [
      { name: "Gruno Verhuur", fn: getGrunoProperties },
      { name: "Van der Meulen", fn: getVanDerMeulenProperties },
      { name: "Nova Vastgoed", fn: getNovaVastgoedProperties },
      { name: "DC Wonen", fn: getDCWonenProperties },
    ];

    // Get all properties from all sources
    const allProperties: ScrapedProperty[] = [];
    const seenUrls = new Set<string>(); // Track URLs to prevent duplicates

    // Process all data sources
    dataSources.forEach(({ name, fn }) => {
      const properties = fn();
      console.log(`✅ ${name}: ${properties.length} properties found`);
      
      for (const property of properties) {
        if (!seenUrls.has(property.sourceUrl)) {
          seenUrls.add(property.sourceUrl);
          allProperties.push(property);
        } else {
          console.log(
            `⚠️ Skipping duplicate ${name} property: ${property.title}`
          );
        }
      }
    });

    const result: ScrapingResponse = {
      properties: allProperties,
      count: allProperties.length,
      timestamp: new Date().toISOString(),
      sources: dataSources.map((s) =>
        s.name === "Van der Meulen"
          ? "Van der Meulen Makelaars"
          : s.name === "Nova Vastgoed"
            ? "Nova Vastgoed"
            : s.name === "DC Wonen"
              ? "DC Wonen"
              : s.name
      ),
      cached: false,
    };

    console.log(
      `✅ Successfully retrieved ${allProperties.length} unique properties`
    );
    dataSources.forEach(({ name, fn }) => {
      console.log(`   - ${name}: ${fn().length} properties`);
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error("❌ API error:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve properties",
        message: error instanceof Error ? error.message : "Unknown error",
        properties: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
