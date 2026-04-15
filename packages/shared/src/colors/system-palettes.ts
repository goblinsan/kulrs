/**
 * Programmatic system palette generator.
 *
 * Instead of hardcoding ~1500 palettes, this module generates them
 * deterministically from theme-specific color rules. Each theme gets
 * ~30 unique palettes with between 2-7 colors each.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Simple seeded PRNG (mulberry32) for deterministic palette generation. */
function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a number seed. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** HSL to hex conversion. h: 0-360, s: 0-100, l: 0-100 */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** Interpolate between two values */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Types ────────────────────────────────────────────────────────────

export interface SystemPalette {
  name: string;
  description: string;
  colors: string[];       // hex values
  tagSlugs: string[];     // tag slugs for DB
  themeSlug: string;      // which theme this belongs to
}

/** Theme generation config: hue ranges, saturation, lightness, and naming. */
interface ThemeGenConfig {
  /** Generate one palette given the index (0-29) and a seeded rng. */
  generate: (index: number, rng: () => number) => { name: string; description: string; colors: string[] };
  /** Tag slugs to attach to every palette from this theme. */
  tags: string[];
}

// ── Per-theme configs ────────────────────────────────────────────────

function rangeRng(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

/** Generate a monochromatic palette around a hue range */
function monoHue(
  rng: () => number,
  hMin: number, hMax: number,
  sMin: number, sMax: number,
  count: number,
  baseName: string,
): { name: string; description: string; colors: string[] } {
  const hue = rangeRng(rng, hMin, hMax);
  const sat = rangeRng(rng, sMin, sMax);
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const l = lerp(20, 85, i / (count - 1)) + rangeRng(rng, -5, 5);
    colors.push(hslToHex(hue + rangeRng(rng, -8, 8), sat + rangeRng(rng, -10, 10), l));
  }
  return { name: baseName, description: `${baseName} color palette`, colors };
}

/** Generate a palette from explicit hue+sat+light tuples */
function fromTuples(
  rng: () => number,
  tuples: Array<[number, number, number]>,
  jitter: number,
  name: string,
): { name: string; description: string; colors: string[] } {
  const colors = tuples.map(([h, s, l]) =>
    hslToHex(
      h + rangeRng(rng, -jitter, jitter),
      s + rangeRng(rng, -jitter / 2, jitter / 2),
      l + rangeRng(rng, -jitter / 2, jitter / 2),
    ),
  );
  return { name, description: `${name} color palette`, colors };
}

// Color-category name pools
const COLOR_ADJECTIVES = [
  'Soft', 'Deep', 'Vivid', 'Muted', 'Rich', 'Light', 'Bold', 'Warm',
  'Cool', 'Pale', 'Dusty', 'Bright', 'Classic', 'Modern', 'Gentle',
  'Intense', 'Faded', 'Pure', 'Subtle', 'Lush', 'Smoky', 'Electric',
  'Dreamy', 'Crisp', 'Earthy', 'Silky', 'Misty', 'Wild', 'Fresh', 'Aged',
];

const TOPIC_NOUNS: Record<string, string[]> = {
  christmas: ['Jingle', 'Noel', 'Frost', 'Holly', 'Tinsel', 'Candy Cane', 'Fireplace', 'Snowfall', 'Mistletoe', 'Gingerbread', 'Ornament', 'Wreath', 'Nutcracker', 'Stocking', 'Reindeer', 'Sleigh', 'Evergreen', 'Starlight', 'Yule Log', 'Silver Bells', 'Pine', 'Cinnamon', 'Mulled Wine', 'Eggnog', 'Winter Rose', 'Cranberry', 'Plum Pudding', 'Frosty', 'Glacier', 'Caroler'],
  halloween: ['Phantom', 'Witch', 'Pumpkin', 'Cauldron', 'Shadow', 'Specter', 'Moonlight', 'Cobweb', 'Raven', 'Skull', 'Tombstone', 'Haunted', 'Potion', 'Bat Wing', 'Black Cat', 'Skeleton', 'Ghoul', 'Spider', 'Lantern', 'Trick', 'Treat', 'Hex', 'Zombie', 'Scarecrow', 'Voodoo', 'Crypt', 'Fog', 'Nightshade', 'Cursed', 'Wicked'],
  pride: ['Unity', 'Spectrum', 'Freedom', 'Courage', 'Joy', 'Fierce', 'Radiant', 'Bold', 'Shine', 'Glow', 'Brilliant', 'Dazzle', 'Power', 'Love', 'Spirit', 'Hope', 'Vivid', 'Light', 'Triumph', 'Harmony', 'Bliss', 'Grace', 'Wonder', 'Magic', 'Spark', 'Dawn', 'Bloom', 'Rise', 'Dream', 'Glory'],
  sunset: ['Dusk', 'Horizon', 'Afterglow', 'Ember', 'Twilight', 'Golden Hour', 'Amber Sky', 'Coral Dusk', 'Burnt Sienna', 'Crimson Fade', 'Peach Dream', 'Warm Horizon', 'Fire Sky', 'Lavender Dusk', 'Rose Glow', 'Copper Sun', 'Desert Dusk', 'Tangerine', 'Saffron', 'Blush', 'Marigold', 'Persimmon', 'Cayenne', 'Mulberry', 'Clementine', 'Nectarine', 'Papaya', 'Mango', 'Apricot', 'Flamingo'],
  spring: ['Bloom', 'Blossom', 'Petal', 'Meadow', 'Garden', 'Sprout', 'Dewdrop', 'Tulip', 'Daisy', 'Lilac', 'Iris', 'Cherry', 'Mint', 'Breeze', 'April', 'Seedling', 'Fern', 'Clover', 'Buttercup', 'Hyacinth', 'Crocus', 'Violet', 'Wisteria', 'Lavender', 'Peony', 'Magnolia', 'Primrose', 'Forsythia', 'Dandelion', 'Robin'],
  winter: ['Frost', 'Ice', 'Snow', 'Arctic', 'Glacier', 'Blizzard', 'Crystal', 'Icicle', 'Permafrost', 'Tundra', 'Polar', 'Frozen', 'Flurry', 'Sleet', 'Nordic', 'Alpine', 'Boreal', 'Solstice', 'Midnight', 'Aurora', 'Diamond', 'Penguin', 'Silver', 'Pewter', 'Slate', 'Steel', 'Quartz', 'Mercury', 'Platinum', 'Cobalt'],
  summer: ['Sunshine', 'Beach', 'Tropical', 'Coral', 'Palm', 'Surf', 'Hibiscus', 'Citrus', 'Lemonade', 'Watermelon', 'Poolside', 'Bonfire', 'Sandcastle', 'Seashell', 'Coast', 'Paradise', 'Breezy', 'Sundress', 'Flipflop', 'Hammock', 'Siesta', 'Gelato', 'Popsicle', 'Firefly', 'Canopy', 'Boardwalk', 'Cabana', 'Lagoon', 'Oasis', 'Festival'],
  autumn: ['Maple', 'Harvest', 'Amber', 'Cider', 'Acorn', 'Pumpkin', 'Hayride', 'Scarlet', 'Russet', 'Copper', 'Chestnut', 'Walnut', 'Hickory', 'Oak', 'Sycamore', 'Birch', 'Cranberry', 'Bonfire', 'Flannel', 'Cinnamon', 'Nutmeg', 'Clove', 'Pecan', 'Persimmon', 'Sunflower', 'Cornucopia', 'Twilight', 'Ember', 'Leaves', 'Orchard'],
  gold: ['Bullion', 'Crown', 'Sovereign', 'Aureate', 'Gilded', 'Treasure', 'Topaz', 'Honey', 'Marigold', 'Saffron', 'Champagne', 'Bronze', 'Antique', 'Midas', 'Opulent', 'Luxe', 'Noble', 'Regal', 'Imperial', 'Golden Gate', 'Sunbeam', 'Harvest', 'Wheat', 'Caramel', 'Toffee', 'Amber', 'Cognac', 'Brass', 'Copper', 'Medallion'],
  wedding: ['Blush', 'Ivory', 'Lace', 'Pearl', 'Satin', 'Bouquet', 'Vow', 'Chapel', 'Garden Party', 'Champagne', 'Rose Quartz', 'Dusty Rose', 'Sage', 'Eucalyptus', 'Mauve', 'Lavender', 'Peony', 'Magnolia', 'Dahlia', 'Orchid', 'Serenity', 'Buttercream', 'Tulle', 'Silk', 'Chiffon', 'Nostalgia', 'Forever', 'Grace', 'Elegance', 'Romance'],
  party: ['Confetti', 'Fiesta', 'Sparkle', 'Disco', 'Carnival', 'Balloon', 'Streamers', 'Glitter', 'Fireworks', 'Celebration', 'Piñata', 'Neon', 'Strobe', 'Dance', 'Rhythm', 'Beats', 'Jubilee', 'Gala', 'Soirée', 'Rave', 'Pop', 'Fizz', 'Punch', 'Kazoo', 'Fanfare', 'Toast', 'Cheers', 'Boom', 'Flash', 'Groove'],
  space: ['Nebula', 'Cosmos', 'Galaxy', 'Pulsar', 'Quasar', 'Nova', 'Orbit', 'Andromeda', 'Eclipse', 'Void', 'Stellar', 'Astral', 'Comet', 'Meteor', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Pluto', 'Starfield', 'Dark Matter', 'Black Hole', 'Supernova', 'Milky Way', 'Cosmic Dust', 'Solar Flare', 'Constellation', 'Zenith', 'Event Horizon'],
  kids: ['Crayon', 'Bubblegum', 'Lollipop', 'Teddy', 'Rainbow', 'Candy', 'Toy Box', 'Playground', 'Jellybeans', 'Unicorn', 'Dinosaur', 'Robot', 'Spaceship', 'Pirate', 'Princess', 'Treehouse', 'Sandbox', 'Butterfly', 'Ladybug', 'Puppy', 'Kitten', 'Bunny', 'Carousel', 'Balloon', 'Ice Cream', 'Cookie', 'Cupcake', 'Stickers', 'Finger Paint', 'Chalk'],
  nature: ['Forest', 'Mountain', 'Ocean', 'River', 'Meadow', 'Desert', 'Coral Reef', 'Rainforest', 'Tundra', 'Savanna', 'Marsh', 'Canyon', 'Volcano', 'Waterfall', 'Glacier', 'Prairie', 'Jungle', 'Lagoon', 'Valley', 'Peak', 'Cliff', 'Dune', 'Moss', 'Fern', 'Bamboo', 'Sequoia', 'Redwood', 'Willow', 'Birch', 'Heather'],
  city: ['Skyline', 'Metro', 'Downtown', 'Neon Sign', 'Subway', 'Boulevard', 'Penthouse', 'Rooftop', 'Brick', 'Concrete', 'Steel', 'Asphalt', 'Traffic', 'Taxi', 'Studio', 'Gallery', 'Café', 'Boutique', 'Highrise', 'Bridge', 'Tower', 'Alley', 'Market', 'Park', 'Fountain', 'Lamppost', 'Fire Escape', 'Terrace', 'Loft', 'District'],
  food: ['Avocado', 'Tomato', 'Blueberry', 'Lemon', 'Mint', 'Chocolate', 'Espresso', 'Matcha', 'Turmeric', 'Paprika', 'Saffron', 'Berry', 'Peach', 'Plum', 'Fig', 'Olive', 'Honey', 'Caramel', 'Cinnamon', 'Basil', 'Rosemary', 'Lavender', 'Truffle', 'Pistachio', 'Mango', 'Raspberry', 'Lime', 'Grapefruit', 'Coconut', 'Vanilla'],
  happy: ['Sunshine', 'Joyful', 'Cheerful', 'Playful', 'Lively', 'Radiant', 'Blissful', 'Gleeful', 'Buoyant', 'Merry', 'Jubilant', 'Elated', 'Bright Side', 'Good Vibes', 'Upbeat', 'Delight', 'Ecstatic', 'Euphoria', 'Peppy', 'Spirited', 'Zesty', 'Perky', 'Chipper', 'Jolly', 'Festive', 'Sunny', 'Warm Smile', 'Giggles', 'Twinkle', 'Spark'],
  water: ['Ocean', 'River', 'Rain', 'Tide', 'Wave', 'Mist', 'Lagoon', 'Brook', 'Cascade', 'Ripple', 'Droplet', 'Spray', 'Foam', 'Coral', 'Depths', 'Shallows', 'Current', 'Tsunami', 'Monsoon', 'Drizzle', 'Puddle', 'Spring', 'Falls', 'Delta', 'Estuary', 'Fjord', 'Reservoir', 'Aquifer', 'Whirlpool', 'Swell'],
  relax: ['Calm', 'Zen', 'Serene', 'Tranquil', 'Peaceful', 'Still', 'Gentle', 'Soothing', 'Breeze', 'Drift', 'Float', 'Hammock', 'Spa', 'Candle', 'Incense', 'Meditation', 'Whisper', 'Lullaby', 'Hush', 'Cloud', 'Feather', 'Silk', 'Velvet', 'Lotus', 'Jasmine', 'Chamomile', 'Sage', 'Eucalyptus', 'Lavender', 'Moonlight'],
};

// ── Theme generation configs ─────────────────────────────────────────

function colorThemeConfig(
  slug: string,
  hMin: number, hMax: number,
  sMin: number, sMax: number,
): ThemeGenConfig {
  return {
    tags: [slug],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const label = slug.charAt(0).toUpperCase() + slug.slice(1);
      return monoHue(rng, hMin, hMax, sMin, sMax, count, `${adj} ${label}`);
    },
  };
}

function topicThemeConfig(
  slug: string,
  baseColors: Array<[number, number, number]>[],
  jitter: number,
): ThemeGenConfig {
  const nouns = TOPIC_NOUNS[slug] ?? COLOR_ADJECTIVES;
  return {
    tags: [slug],
    generate(i, rng) {
      const base = baseColors[i % baseColors.length];
      const count = Math.min(base.length, Math.floor(rangeRng(rng, 3, base.length + 1)));
      const selected = base.slice(0, count);
      const noun = nouns[i % nouns.length];
      return fromTuples(rng, selected, jitter, noun);
    },
  };
}

const THEME_CONFIGS: Record<string, ThemeGenConfig> = {
  // ── Colors ──
  red:       colorThemeConfig('red', 350, 370, 50, 90),
  orange:    colorThemeConfig('orange', 20, 40, 55, 90),
  brown:     colorThemeConfig('brown', 20, 40, 25, 50),
  yellow:    colorThemeConfig('yellow', 45, 65, 60, 95),
  green:     colorThemeConfig('green', 100, 150, 40, 85),
  turquoise: colorThemeConfig('turquoise', 165, 195, 45, 80),
  blue:      colorThemeConfig('blue', 200, 240, 45, 90),
  violet:    colorThemeConfig('violet', 260, 300, 40, 80),
  pink:      colorThemeConfig('pink', 320, 350, 45, 85),
  gray: {
    tags: ['gray'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(25, 85, j / (count - 1)) + rangeRng(rng, -5, 5);
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 0, 8), l));
      }
      return { name: `${adj} Gray`, description: `${adj} Gray color palette`, colors };
    },
  },
  black: {
    tags: ['black'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 6));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(2, 30, j / (count - 1)) + rangeRng(rng, -3, 3);
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 0, 15), l));
      }
      return { name: `${adj} Noir`, description: `${adj} Noir color palette`, colors };
    },
  },
  white: {
    tags: ['white'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 6));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(85, 99, j / (count - 1)) + rangeRng(rng, -2, 2);
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 0, 15), l));
      }
      return { name: `${adj} Light`, description: `${adj} Light color palette`, colors };
    },
  },

  // ── Styles ──
  warm: {
    tags: ['warm'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        colors.push(hslToHex(rangeRng(rng, 0, 50), rangeRng(rng, 40, 90), rangeRng(rng, 30, 80)));
      }
      return { name: `${adj} Warmth`, description: `${adj} Warmth color palette`, colors };
    },
  },
  cold: {
    tags: ['cool'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        colors.push(hslToHex(rangeRng(rng, 180, 260), rangeRng(rng, 30, 80), rangeRng(rng, 30, 80)));
      }
      return { name: `${adj} Frost`, description: `${adj} Frost color palette`, colors };
    },
  },
  bright: {
    tags: ['bright'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 75, 100), rangeRng(rng, 50, 65)));
      }
      return { name: `${adj} Bright`, description: `${adj} Bright color palette`, colors };
    },
  },
  dark: {
    tags: ['dark'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 20, 70), rangeRng(rng, 8, 30)));
      }
      return { name: `${adj} Shadow`, description: `${adj} Shadow color palette`, colors };
    },
  },
  pastel: {
    tags: ['pastel'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 7));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 30, 60), rangeRng(rng, 75, 90)));
      }
      return { name: `${adj} Pastel`, description: `${adj} Pastel color palette`, colors };
    },
  },
  vintage: {
    tags: ['vintage'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 3, 6));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        colors.push(hslToHex(rangeRng(rng, 0, 360), rangeRng(rng, 15, 45), rangeRng(rng, 35, 65)));
      }
      return { name: `${adj} Vintage`, description: `${adj} Vintage color palette`, colors };
    },
  },
  monochromatic: {
    tags: ['monochromatic'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 4, 8));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const hue = rangeRng(rng, 0, 360);
      const sat = rangeRng(rng, 30, 80);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(15, 90, j / (count - 1));
        colors.push(hslToHex(hue, sat + rangeRng(rng, -8, 8), l + rangeRng(rng, -3, 3)));
      }
      return { name: `${adj} Mono`, description: `${adj} Mono color palette`, colors };
    },
  },
  gradient: {
    tags: ['gradient'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 4, 8));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const hStart = rangeRng(rng, 0, 360);
      const hEnd = hStart + rangeRng(rng, 30, 120);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const t = j / (count - 1);
        colors.push(hslToHex(lerp(hStart, hEnd, t), rangeRng(rng, 50, 85), lerp(35, 75, t)));
      }
      return { name: `${adj} Gradient`, description: `${adj} Gradient color palette`, colors };
    },
  },
  rainbow: {
    tags: ['rainbow'],
    generate(i, rng) {
      const count = Math.floor(rangeRng(rng, 5, 9));
      const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length];
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const h = (j / count) * 360 + rangeRng(rng, -10, 10);
        colors.push(hslToHex(h, rangeRng(rng, 60, 95), rangeRng(rng, 45, 65)));
      }
      return { name: `${adj} Rainbow`, description: `${adj} Rainbow color palette`, colors };
    },
  },
  // N-color styles
  '2-colors': { tags: ['2-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Duo`, description: `${adj} Duo color palette`, colors: [hslToHex(h, rangeRng(rng, 40, 90), rangeRng(rng, 30, 70)), hslToHex(h + rangeRng(rng, 90, 270), rangeRng(rng, 40, 90), rangeRng(rng, 30, 70))] }; } },
  '3-colors': { tags: ['3-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Triad`, description: `${adj} Triad color palette`, colors: [0, 120, 240].map(off => hslToHex(h + off + rangeRng(rng, -15, 15), rangeRng(rng, 45, 85), rangeRng(rng, 35, 65))) }; } },
  '4-colors': { tags: ['4-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Quad`, description: `${adj} Quad color palette`, colors: [0, 90, 180, 270].map(off => hslToHex(h + off + rangeRng(rng, -12, 12), rangeRng(rng, 45, 80), rangeRng(rng, 35, 65))) }; } },
  '5-colors': { tags: ['5-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Penta`, description: `${adj} Penta color palette`, colors: [0, 72, 144, 216, 288].map(off => hslToHex(h + off + rangeRng(rng, -10, 10), rangeRng(rng, 40, 80), rangeRng(rng, 35, 65))) }; } },
  '6-colors': { tags: ['6-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Hexa`, description: `${adj} Hexa color palette`, colors: [0, 60, 120, 180, 240, 300].map(off => hslToHex(h + off + rangeRng(rng, -8, 8), rangeRng(rng, 40, 75), rangeRng(rng, 35, 65))) }; } },
  '7-colors': { tags: ['7-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Hepta`, description: `${adj} Hepta color palette`, colors: Array.from({ length: 7 }, (_, j) => hslToHex(h + j * (360 / 7) + rangeRng(rng, -8, 8), rangeRng(rng, 40, 75), rangeRng(rng, 35, 65))) }; } },
  '8-colors': { tags: ['8-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Octa`, description: `${adj} Octa color palette`, colors: Array.from({ length: 8 }, (_, j) => hslToHex(h + j * 45 + rangeRng(rng, -8, 8), rangeRng(rng, 40, 70), rangeRng(rng, 35, 65))) }; } },
  '9-colors': { tags: ['9-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Nona`, description: `${adj} Nona color palette`, colors: Array.from({ length: 9 }, (_, j) => hslToHex(h + j * 40 + rangeRng(rng, -6, 6), rangeRng(rng, 40, 70), rangeRng(rng, 35, 65))) }; } },
  '10-colors': { tags: ['10-colors'], generate(i, rng) { const adj = COLOR_ADJECTIVES[i % COLOR_ADJECTIVES.length]; const h = rangeRng(rng, 0, 360); return { name: `${adj} Deca`, description: `${adj} Deca color palette`, colors: Array.from({ length: 10 }, (_, j) => hslToHex(h + j * 36 + rangeRng(rng, -5, 5), rangeRng(rng, 40, 70), rangeRng(rng, 35, 65))) }; } },

  // ── Topics ──
  christmas: topicThemeConfig('christmas', [
    [[0, 80, 45], [120, 60, 35], [45, 90, 55], [0, 0, 95], [0, 80, 30]],
    [[350, 75, 40], [130, 55, 30], [40, 85, 50], [0, 0, 90], [10, 70, 45]],
    [[355, 70, 50], [140, 50, 40], [50, 80, 60], [0, 5, 85], [0, 60, 35]],
    [[5, 82, 42], [125, 65, 32], [48, 88, 52], [0, 0, 92], [355, 72, 38]],
    [[350, 78, 38], [135, 58, 28], [42, 82, 48], [0, 3, 88], [8, 68, 42]],
    [[0, 72, 48], [118, 52, 38], [52, 78, 58], [0, 8, 82], [358, 65, 32]],
    [[3, 85, 44], [128, 62, 34], [46, 92, 54], [0, 2, 93], [352, 75, 36]],
    [[348, 68, 42], [138, 48, 36], [55, 75, 62], [0, 6, 86], [12, 72, 40]],
    [[8, 78, 46], [115, 58, 30], [38, 86, 56], [0, 4, 90], [356, 70, 34]],
    [[355, 82, 40], [132, 60, 36], [44, 90, 52], [0, 0, 94], [2, 76, 42]],
    [[4, 74, 50], [122, 54, 32], [50, 84, 58], [0, 7, 84], [360, 66, 36]],
    [[348, 80, 44], [140, 56, 34], [40, 88, 50], [0, 1, 92], [6, 74, 38]],
    [[2, 76, 46], [126, 58, 36], [48, 86, 56], [0, 4, 88], [354, 72, 40]],
    [[356, 84, 38], [130, 64, 30], [42, 94, 52], [0, 2, 96], [350, 78, 34]],
    [[6, 70, 52], [120, 50, 34], [54, 76, 64], [0, 10, 80], [14, 66, 44]],
    [[352, 76, 42], [136, 52, 32], [46, 80, 54], [0, 2, 90], [0, 70, 38]],
    [[10, 80, 44], [116, 56, 28], [36, 88, 52], [0, 6, 86], [358, 74, 36]],
    [[346, 72, 46], [142, 50, 38], [58, 74, 60], [0, 8, 82], [16, 64, 42]],
    [[358, 86, 40], [124, 66, 32], [40, 92, 50], [0, 0, 98], [348, 80, 36]],
    [[8, 68, 48], [114, 54, 30], [52, 82, 56], [0, 4, 88], [2, 68, 40]],
    [[0, 82, 46], [132, 62, 36], [44, 86, 54], [0, 2, 92], [354, 76, 38]],
    [[354, 74, 44], [128, 56, 34], [48, 84, 52], [0, 6, 88], [4, 72, 42]],
    [[6, 80, 42], [118, 60, 32], [42, 90, 56], [0, 0, 94], [352, 74, 36]],
    [[350, 78, 48], [136, 54, 36], [50, 78, 58], [0, 4, 86], [8, 70, 44]],
    [[4, 76, 44], [126, 64, 34], [46, 88, 54], [0, 2, 90], [356, 72, 38]],
    [[358, 84, 42], [134, 58, 30], [38, 92, 52], [0, 0, 96], [346, 80, 34]],
    [[12, 72, 50], [112, 52, 36], [56, 76, 62], [0, 8, 84], [18, 66, 46]],
    [[348, 80, 40], [140, 60, 32], [44, 86, 50], [0, 2, 92], [0, 74, 36]],
    [[2, 78, 46], [122, 62, 38], [48, 84, 56], [0, 4, 88], [358, 70, 40]],
    [[356, 82, 44], [130, 56, 34], [42, 90, 54], [0, 0, 94], [352, 76, 38]],
  ], 8),
  halloween: topicThemeConfig('halloween', [
    [[25, 90, 50], [0, 0, 10], [275, 60, 35], [45, 85, 55], [0, 0, 95]],
    [[30, 85, 48], [0, 0, 8], [270, 55, 30], [50, 80, 50], [0, 80, 40]],
    [[20, 92, 52], [0, 0, 12], [280, 65, 40], [40, 88, 58], [0, 0, 90]],
    [[28, 88, 46], [0, 0, 6], [268, 58, 32], [48, 82, 52], [5, 75, 42]],
    [[32, 86, 50], [0, 0, 10], [278, 62, 38], [42, 86, 56], [0, 0, 92]],
    [[22, 94, 48], [0, 0, 14], [272, 52, 28], [52, 78, 48], [355, 82, 38]],
    [[26, 82, 54], [0, 0, 8], [282, 68, 42], [38, 90, 60], [0, 0, 88]],
    [[34, 90, 44], [0, 0, 6], [266, 56, 34], [46, 84, 54], [8, 78, 44]],
    [[18, 88, 52], [0, 0, 12], [276, 60, 36], [44, 82, 52], [0, 0, 94]],
    [[30, 92, 46], [0, 0, 10], [284, 64, 30], [50, 86, 58], [350, 76, 40]],
    [[24, 84, 50], [0, 0, 8], [270, 58, 38], [48, 80, 50], [0, 0, 90]],
    [[28, 90, 48], [0, 0, 14], [274, 54, 32], [42, 88, 56], [2, 80, 42]],
    [[36, 86, 52], [0, 0, 6], [286, 66, 44], [36, 92, 62], [0, 0, 86]],
    [[20, 94, 44], [0, 0, 12], [268, 60, 28], [54, 76, 46], [356, 84, 36]],
    [[32, 82, 56], [0, 0, 10], [280, 62, 40], [40, 84, 54], [0, 0, 92]],
    [[26, 88, 46], [0, 0, 8], [272, 56, 34], [46, 86, 58], [4, 72, 38]],
    [[22, 92, 50], [0, 0, 14], [278, 64, 36], [44, 80, 52], [0, 0, 88]],
    [[30, 84, 48], [0, 0, 6], [266, 52, 30], [50, 90, 60], [352, 78, 42]],
    [[34, 90, 52], [0, 0, 12], [282, 66, 38], [38, 82, 50], [0, 0, 94]],
    [[18, 86, 44], [0, 0, 10], [276, 58, 32], [52, 84, 56], [6, 76, 40]],
    [[28, 94, 50], [0, 0, 8], [274, 62, 42], [42, 88, 54], [0, 0, 90]],
    [[24, 82, 46], [0, 0, 14], [284, 54, 28], [48, 78, 48], [358, 80, 36]],
    [[36, 88, 54], [0, 0, 6], [270, 66, 44], [36, 92, 62], [0, 0, 86]],
    [[20, 90, 48], [0, 0, 12], [280, 60, 36], [44, 86, 52], [0, 82, 42]],
    [[32, 86, 44], [0, 0, 10], [268, 56, 30], [50, 80, 58], [0, 0, 92]],
    [[26, 92, 52], [0, 0, 8], [276, 64, 38], [46, 84, 50], [4, 74, 38]],
    [[22, 84, 46], [0, 0, 14], [286, 58, 34], [40, 90, 56], [0, 0, 88]],
    [[30, 90, 50], [0, 0, 6], [272, 52, 32], [52, 82, 48], [354, 80, 40]],
    [[34, 86, 48], [0, 0, 12], [278, 62, 40], [38, 86, 54], [0, 0, 94]],
    [[28, 88, 52], [0, 0, 10], [274, 60, 36], [48, 84, 56], [2, 76, 42]],
  ], 10),
  pride: topicThemeConfig('pride', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 5;
    return [[0 + shift, 80, 50], [30 + shift, 80, 55], [60 + shift, 80, 50], [120 + shift, 70, 45], [210 + shift, 75, 50], [270 + shift, 70, 50]] as [number, number, number][];
  }), 12),
  sunset: topicThemeConfig('sunset', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 3;
    return [[350 + shift, 75, 45], [15 + shift, 80, 55], [35 + shift, 85, 60], [45 + shift, 80, 65], [270 + shift, 40, 40]] as [number, number, number][];
  }), 10),
  spring: topicThemeConfig('spring', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 4;
    return [[120 + shift, 50, 65], [80 + shift, 55, 70], [320 + shift, 50, 75], [45 + shift, 60, 70], [180 + shift, 40, 60]] as [number, number, number][];
  }), 12),
  winter: topicThemeConfig('winter', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 3;
    return [[210 + shift, 50, 55], [200 + shift, 30, 75], [220 + shift, 20, 85], [190 + shift, 60, 40], [240 + shift, 15, 90]] as [number, number, number][];
  }), 10),
  summer: topicThemeConfig('summer', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 4;
    return [[45 + shift, 85, 55], [20 + shift, 80, 60], [170 + shift, 65, 50], [340 + shift, 70, 55], [50 + shift, 90, 65]] as [number, number, number][];
  }), 12),
  autumn: topicThemeConfig('autumn', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 3;
    return [[25 + shift, 70, 40], [35 + shift, 65, 50], [15 + shift, 75, 35], [45 + shift, 60, 55], [5 + shift, 55, 30]] as [number, number, number][];
  }), 10),
  gold: topicThemeConfig('gold', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 2;
    return [[45 + shift, 80, 50], [40 + shift, 70, 40], [50 + shift, 90, 60], [35 + shift, 60, 35], [48 + shift, 75, 55]] as [number, number, number][];
  }), 8),
  wedding: topicThemeConfig('wedding', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 3;
    return [[340 + shift, 30, 80], [0 + shift, 0, 92], [320 + shift, 25, 75], [120 + shift, 20, 70], [280 + shift, 20, 78]] as [number, number, number][];
  }), 10),
  party: topicThemeConfig('party', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 12;
    return [[330 + shift, 85, 55], [180 + shift, 80, 50], [60 + shift, 90, 55], [270 + shift, 75, 50], [120 + shift, 85, 50]] as [number, number, number][];
  }), 15),
  space: topicThemeConfig('space', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 4;
    return [[240 + shift, 50, 15], [260 + shift, 60, 25], [280 + shift, 45, 35], [200 + shift, 40, 20], [300 + shift, 70, 50]] as [number, number, number][];
  }), 10),
  kids: topicThemeConfig('kids', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 12;
    return [[0 + shift, 75, 60], [60 + shift, 80, 65], [120 + shift, 70, 55], [240 + shift, 75, 60], [300 + shift, 70, 65]] as [number, number, number][];
  }), 15),
  nature: topicThemeConfig('nature', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 3;
    return [[120 + shift, 45, 40], [90 + shift, 40, 50], [30 + shift, 50, 45], [180 + shift, 35, 55], [60 + shift, 55, 60]] as [number, number, number][];
  }), 12),
  city: topicThemeConfig('city', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 4;
    return [[220 + shift, 20, 35], [0 + shift, 0, 50], [40 + shift, 60, 55], [200 + shift, 30, 45], [350 + shift, 50, 40]] as [number, number, number][];
  }), 10),
  food: topicThemeConfig('food', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 5;
    return [[0 + shift, 70, 50], [30 + shift, 75, 55], [120 + shift, 50, 45], [50 + shift, 80, 60], [10 + shift, 60, 40]] as [number, number, number][];
  }), 12),
  happy: topicThemeConfig('happy', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 8;
    return [[50 + shift, 85, 60], [30 + shift, 80, 55], [340 + shift, 70, 60], [170 + shift, 65, 55], [280 + shift, 60, 60]] as [number, number, number][];
  }), 14),
  water: topicThemeConfig('water', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 3;
    return [[200 + shift, 60, 45], [190 + shift, 50, 55], [210 + shift, 70, 35], [185 + shift, 40, 65], [220 + shift, 55, 50]] as [number, number, number][];
  }), 10),
  relax: topicThemeConfig('relax', Array.from({ length: 30 }, (_, i) => {
    const shift = i * 4;
    return [[210 + shift, 25, 70], [270 + shift, 20, 75], [160 + shift, 25, 68], [30 + shift, 15, 80], [240 + shift, 20, 72]] as [number, number, number][];
  }), 8),
};

// ── Public API ───────────────────────────────────────────────────────

const PALETTES_PER_THEME = 30;

/**
 * Generate all system palettes for a given theme slug.
 * Returns 30 deterministically-generated palettes.
 */
export function generatePalettesForTheme(themeSlug: string): SystemPalette[] {
  const config = THEME_CONFIGS[themeSlug];
  if (!config) return [];

  const results: SystemPalette[] = [];
  for (let i = 0; i < PALETTES_PER_THEME; i++) {
    const seed = hashStr(`${themeSlug}-${i}`);
    const rng = seededRng(seed);
    const { name, description, colors } = config.generate(i, rng);
    results.push({
      name,
      description,
      colors,
      tagSlugs: config.tags,
      themeSlug,
    });
  }
  return results;
}

/**
 * Generate all system palettes across all themes.
 * Returns ~1500 palettes total (30 per theme × ~50 themes).
 */
export function generateAllSystemPalettes(): SystemPalette[] {
  return Object.keys(THEME_CONFIGS).flatMap(generatePalettesForTheme);
}

/**
 * Get the list of all theme slugs that have generation configs.
 */
export function getSystemPaletteThemeSlugs(): string[] {
  return Object.keys(THEME_CONFIGS);
}
