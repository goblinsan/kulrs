/**
 * Programmatic system palette generator.
 *
 * Generates palettes deterministically from theme-specific color rules.
 * Each theme gets 30 unique palettes with 4-6 colors each.
 *
 * Color quality principles:
 * - Each theme's hue/sat/light ranges are hand-tuned to match the theme name
 * - Palettes within a theme use consistent hue families, not random hues
 * - Lightness is spread across the palette for visual balance
 * - Saturation is controlled to avoid garish combinations
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

function rr(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

// ── Types ────────────────────────────────────────────────────────────

export interface SystemPalette {
  name: string;
  description: string;
  colors: string[];
  tagSlugs: string[];
  themeSlug: string;
}

interface ThemeGenConfig {
  generate: (index: number, rng: () => number) => { name: string; description: string; colors: string[] };
  tags: string[];
}

// ── Name pools ───────────────────────────────────────────────────────

const COLOR_ADJ = [
  'Soft', 'Deep', 'Vivid', 'Muted', 'Rich', 'Light', 'Bold', 'Warm',
  'Cool', 'Pale', 'Dusty', 'Bright', 'Classic', 'Modern', 'Gentle',
  'Intense', 'Faded', 'Pure', 'Subtle', 'Lush', 'Smoky', 'Electric',
  'Dreamy', 'Crisp', 'Earthy', 'Silky', 'Misty', 'Wild', 'Fresh', 'Aged',
];

const THEME_NOUNS: Record<string, string[]> = {
  christmas: ['Jingle', 'Noel', 'Holly', 'Tinsel', 'Candy Cane', 'Fireplace', 'Mistletoe', 'Gingerbread', 'Ornament', 'Wreath', 'Nutcracker', 'Stocking', 'Reindeer', 'Evergreen', 'Yule Log', 'Silver Bells', 'Pine', 'Cinnamon', 'Mulled Wine', 'Eggnog', 'Cranberry', 'Plum Pudding', 'Frosty', 'Caroler', 'Garland', 'Bauble', 'Ember', 'Nativity', 'Peppermint', 'Poinsettia'],
  halloween: ['Phantom', 'Witch', 'Pumpkin', 'Cauldron', 'Shadow', 'Specter', 'Cobweb', 'Raven', 'Tombstone', 'Haunted', 'Potion', 'Black Cat', 'Skeleton', 'Ghoul', 'Lantern', 'Hex', 'Scarecrow', 'Crypt', 'Fog', 'Nightshade', 'Cursed', 'Wicked', 'Moonrise', 'Talon', 'Banshee', 'Gargoyle', 'Abyss', 'Howl', 'Twilight', 'Omen'],
  spring: ['Bloom', 'Blossom', 'Petal', 'Meadow', 'Garden', 'Dewdrop', 'Tulip', 'Daisy', 'Lilac', 'Iris', 'Cherry', 'Clover', 'Buttercup', 'Hyacinth', 'Crocus', 'Wisteria', 'Peony', 'Magnolia', 'Primrose', 'Dandelion', 'Fern', 'Seedling', 'Breeze', 'April', 'Robin', 'Sprout', 'Mint', 'Pasture', 'Valley', 'Thaw'],
  summer: ['Sunshine', 'Beach', 'Coral', 'Palm', 'Surf', 'Hibiscus', 'Citrus', 'Lemonade', 'Watermelon', 'Poolside', 'Sandcastle', 'Seashell', 'Coast', 'Paradise', 'Gelato', 'Popsicle', 'Firefly', 'Boardwalk', 'Cabana', 'Lagoon', 'Oasis', 'Festival', 'Hammock', 'Siesta', 'Bonfire', 'Marina', 'Tide Pool', 'Sunburn', 'Breaker', 'Driftwood'],
  autumn: ['Maple', 'Harvest', 'Amber', 'Cider', 'Acorn', 'Hayride', 'Scarlet', 'Russet', 'Copper', 'Chestnut', 'Walnut', 'Hickory', 'Oak', 'Sycamore', 'Birch', 'Cranberry', 'Bonfire', 'Flannel', 'Cinnamon', 'Nutmeg', 'Clove', 'Pecan', 'Sunflower', 'Cornucopia', 'Ember', 'Orchard', 'Pumpkin', 'Spice', 'Tawny', 'Thicket'],
  winter: ['Frost', 'Ice', 'Snow', 'Arctic', 'Glacier', 'Blizzard', 'Crystal', 'Icicle', 'Tundra', 'Polar', 'Frozen', 'Flurry', 'Nordic', 'Alpine', 'Boreal', 'Solstice', 'Aurora', 'Diamond', 'Silver', 'Pewter', 'Slate', 'Steel', 'Quartz', 'Platinum', 'Cobalt', 'Everest', 'Fjord', 'Drift', 'Haze', 'Shiver'],
  sunset: ['Dusk', 'Horizon', 'Afterglow', 'Ember', 'Twilight', 'Golden Hour', 'Amber Sky', 'Coral Dusk', 'Crimson Fade', 'Warm Horizon', 'Fire Sky', 'Rose Glow', 'Copper Sun', 'Desert Dusk', 'Tangerine', 'Saffron', 'Blush', 'Marigold', 'Persimmon', 'Cayenne', 'Clementine', 'Nectarine', 'Papaya', 'Mango', 'Apricot', 'Flamingo', 'Peach Dream', 'Burnt Sienna', 'Lavender Dusk', 'Vermilion'],
  ocean: ['Deep Blue', 'Tidal', 'Coral Reef', 'Nautical', 'Mariner', 'Abyss', 'Seafoam', 'Current', 'Depths', 'Azure', 'Cerulean', 'Pacific', 'Atlantic', 'Sapphire Sea', 'Wave', 'Crest', 'Undertow', 'Lagoon', 'Shallows', 'Kelp', 'Barnacle', 'Harbor', 'Inlet', 'Driftwood', 'Anchor', 'Trident', 'Siren', 'Voyage', 'Compass', 'Helm'],
  forest: ['Canopy', 'Fern', 'Moss', 'Timber', 'Woodland', 'Grove', 'Thicket', 'Evergreen', 'Bark', 'Leaf', 'Acorn', 'Mushroom', 'Pine', 'Cedar', 'Birch', 'Willow', 'Sage', 'Vine', 'Lichen', 'Hollow', 'Glade', 'Trail', 'Undergrowth', 'Sapling', 'Root', 'Bracken', 'Canopy Light', 'Tree Line', 'Old Growth', 'Clearing'],
  desert: ['Dune', 'Mirage', 'Oasis', 'Sand', 'Mesa', 'Canyon', 'Cactus', 'Adobe', 'Sandstone', 'Pueblo', 'Dry Creek', 'Ridge', 'Butte', 'Gulch', 'Sage Brush', 'Tumbleweed', 'Heat Haze', 'Scorpion', 'Fossil', 'Bedrock', 'Plateau', 'Red Rock', 'Arroyo', 'Dust Devil', 'Horizon', 'Outback', 'Sahara', 'Basin', 'Steppe', 'Arid'],
  neon: ['Electric', 'Laser', 'Glow', 'Strobe', 'Plasma', 'Flux', 'Pulse', 'Voltage', 'Spark', 'Arc', 'Beam', 'Circuit', 'Prism', 'Neon Sign', 'Blacklight', 'Rave', 'Disco', 'Flash', 'Surge', 'Radiant', 'Vivid', 'Fluorescent', 'LED', 'Pixel', 'Hologram', 'Spectrum', 'Ultraviolet', 'Infrared', 'Ion', 'Charged'],
  pastel: ['Whisper', 'Petal', 'Cloud', 'Cotton', 'Bubble', 'Chalk', 'Blush', 'Serenity', 'Lullaby', 'Feather', 'Mist', 'Powder', 'Angelic', 'Dreamy', 'Cream', 'Silk', 'Shell', 'Dawn', 'Meringue', 'Opal', 'Moonstone', 'Fairy', 'Rose', 'Tulle', 'Sorbet', 'Macaron', 'Bonbon', 'Sugar', 'Dew', 'Haze'],
  earth: ['Clay', 'Ochre', 'Sienna', 'Terracotta', 'Sandstone', 'Slate', 'Pebble', 'Granite', 'Basalt', 'Loam', 'Silt', 'Umber', 'Charcoal', 'Flint', 'Fossil', 'Iron', 'Copper Ore', 'Limestone', 'Marble', 'Shale', 'Mineral', 'Topsoil', 'Chalk', 'Mudstone', 'Pumice', 'Obsidian', 'Agate', 'Jasper', 'Quartzite', 'Feldspar'],
  vintage: ['Antique', 'Faded Rose', 'Patina', 'Sepia', 'Daguerreotype', 'Victorian', 'Deco', 'Nostalgia', 'Heirloom', 'Gramophone', 'Typewriter', 'Filmstrip', 'Lace', 'Parchment', 'Brooch', 'Cameo', 'Tapestry', 'Porcelain', 'Velvet', 'Damask', 'Brocade', 'Tarnished', 'Aged Oak', 'Tea Stain', 'Ivory Key', 'Old World', 'Heritage', 'Classic', 'Timeworn', 'Old Rose'],
  midnight: ['Obsidian', 'Void', 'Eclipse', 'Shadow', 'Onyx', 'Raven', 'Coal', 'Ink', 'Noir', 'Smoke', 'Charcoal', 'Abyss', 'Dusk', 'Nebula', 'Storm', 'Thunder', 'Indigo Night', 'Deep Well', 'Blackout', 'Cavern', 'Phantom', 'Enigma', 'Cosmos', 'Twilight', 'Dark Matter', 'Iron', 'Pewter', 'Ash', 'Soot', 'Graphite'],
  candy: ['Bubblegum', 'Lollipop', 'Jellybean', 'Taffy', 'Gummy', 'Sherbet', 'Cotton Candy', 'Skittles', 'Jawbreaker', 'Pixie Dust', 'Gumdrop', 'Sugar Rush', 'Sweet Tooth', 'Frosting', 'Sprinkle', 'Caramel Swirl', 'Licorice', 'Pop Rock', 'Candy Floss', 'Bon Bon', 'Toffee', 'Fudge', 'Truffle', 'Macaroon', 'Eclair', 'Praline', 'Rock Candy', 'Peppermint', 'Butterscotch', 'Meringue'],
  tropical: ['Paradise', 'Hibiscus', 'Toucan', 'Monstera', 'Papaya', 'Mango', 'Guava', 'Plumeria', 'Bird of Paradise', 'Parrot', 'Rainforest', 'Coral', 'Lagoon', 'Palm', 'Coconut', 'Pineapple', 'Passion Fruit', 'Orchid', 'Jungle', 'Macaw', 'Fauna', 'Frangipani', 'Banyan', 'Bamboo', 'Liana', 'Cascade', 'Canopy', 'Mangrove', 'Breeze', 'Atoll'],
  nordic: ['Glacier', 'Fjord', 'Birch', 'Mist', 'Stone', 'Pine', 'Lichen', 'Pebble', 'Frost', 'Slate', 'Ash', 'Wool', 'Driftwood', 'Lake', 'Moss', 'Cloud', 'Bone', 'Linen', 'Flint', 'Tundra', 'Elk', 'Rune', 'Saga', 'Viking', 'Hearth', 'Aurora', 'Solstice', 'Midnight Sun', 'Fell', 'Dale'],
  sunrise: ['Dawn', 'Daybreak', 'First Light', 'Rosy', 'Awakening', 'Morning Dew', 'Golden', 'Amber Glow', 'Peach', 'Coral', 'Champagne', 'Horizon', 'Early Bloom', 'Lucent', 'Tender', 'Blushing', 'Morning Star', 'Fresh Start', 'New Day', 'Promise', 'Radiance', 'Gleam', 'Shimmer', 'Glow', 'Sun Ray', 'Warmth', 'Honey', 'Buttercup', 'Apricot', 'Bliss'],
  jewel: ['Ruby', 'Emerald', 'Sapphire', 'Amethyst', 'Topaz', 'Garnet', 'Jade', 'Tourmaline', 'Citrine', 'Tanzanite', 'Peridot', 'Opal', 'Aquamarine', 'Onyx', 'Lapis', 'Malachite', 'Carnelian', 'Moonstone', 'Turquoise', 'Spinel', 'Alexandrite', 'Zircon', 'Beryl', 'Chrysoprase', 'Kunzite', 'Larimar', 'Rhodolite', 'Sunstone', 'Iolite', 'Kyanite'],
  terracotta: ['Adobe', 'Clay', 'Brick', 'Rust', 'Sienna', 'Umber', 'Pueblo', 'Tile', 'Kiln', 'Pottery', 'Earthen', 'Morocco', 'Sandstone', 'Ochre', 'Paprika', 'Cayenne', 'Cinnamon', 'Nutmeg', 'Ginger', 'Saffron', 'Turmeric', 'Masala', 'Copper', 'Burnished', 'Patina', 'Warm Stone', 'Canyon', 'Sediment', 'Fossil', 'Hearth'],
  lavender: ['Lilac', 'Wisteria', 'Heather', 'Amethyst', 'Thistle', 'Orchid', 'Mauve', 'Plum', 'Iris', 'Violet', 'Periwinkle', 'Clematis', 'Lupin', 'Foxglove', 'Crocus', 'Hyacinth', 'Allium', 'Freesia', 'Aster', 'Verbena', 'Dahlia', 'Sweet Pea', 'Bellflower', 'Morning Glory', 'Pansy', 'Provence', 'Moonflower', 'Dusk Violet', 'Twilight', 'Sage Bloom'],
  monochrome: ['Tonal', 'Gradient', 'Spectrum', 'Scale', 'Range', 'Shade', 'Tint', 'Depth', 'Contrast', 'Harmony', 'Balance', 'Cadence', 'Rhythm', 'Flow', 'Wave', 'Ripple', 'Echo', 'Layer', 'Step', 'Fade', 'Blend', 'Sweep', 'Arc', 'Bridge', 'Span', 'Measure', 'Sequence', 'Cascade', 'Tier', 'Register'],
  gradient: ['Flow', 'Transition', 'Shift', 'Morph', 'Blend', 'Sweep', 'Wave', 'Drift', 'Melt', 'Dissolve', 'Fade', 'Ombre', 'Spectrum', 'Aurora', 'Horizon', 'River', 'Stream', 'Current', 'Cascade', 'Waterfall', 'Silk', 'Ribbon', 'Arc', 'Bridge', 'Path', 'Journey', 'Voyage', 'Passage', 'Traverse', 'Glide'],
  retro: ['Groovy', 'Funky', 'Boogie', 'Disco', 'Mod', 'Pop', 'Kitsch', 'Atomic', 'Space Age', 'Hi-Fi', 'Jukebox', 'Drive-In', 'Roller', 'Arcade', 'Vinyl', 'Neon Sign', 'Chrome', 'Diner', 'Muscle Car', 'Lava Lamp', 'Shag', 'Paisley', 'Tie-Dye', 'Psychedelic', 'Flower Power', 'Woodstock', 'Foxy', 'Cool Cat', 'Far Out', 'Boss'],
  minimalist: ['Zen', 'Clean', 'Pure', 'Simple', 'Calm', 'Quiet', 'Still', 'Serene', 'Bare', 'Crisp', 'Linear', 'Sparse', 'Sleek', 'Refined', 'Polished', 'Elegant', 'Breath', 'Space', 'Open', 'Clarity', 'Focus', 'Essential', 'Core', 'Distilled', 'Curated', 'Austere', 'Precise', 'Uncluttered', 'Harmonious', 'Balanced'],
  coffee: ['Espresso', 'Latte', 'Cappuccino', 'Mocha', 'Macchiato', 'Americano', 'Cortado', 'Ristretto', 'Affogato', 'Lungo', 'Robusta', 'Arabica', 'Breve', 'Crema', 'Roast', 'Grind', 'Brew', 'Press', 'Pour Over', 'Cold Brew', 'Drip', 'Filter', 'Bean', 'Biscotti', 'Cream', 'Sugar', 'Caramel', 'Vanilla', 'Cinnamon', 'Hazelnut'],
  aurora: ['Borealis', 'Australis', 'Northern Light', 'Solar Wind', 'Curtain', 'Veil', 'Dance', 'Shimmer', 'Glow', 'Ripple', 'Wave', 'Ray', 'Arc', 'Crown', 'Halo', 'Corona', 'Magnetic', 'Electron', 'Photon', 'Plasma', 'Ion', 'Charge', 'Field', 'Pole', 'Zenith', 'Apex', 'Meridian', 'Equinox', 'Solstice', 'Celestial'],
  space: ['Nebula', 'Cosmos', 'Galaxy', 'Pulsar', 'Quasar', 'Nova', 'Orbit', 'Andromeda', 'Eclipse', 'Void', 'Stellar', 'Astral', 'Comet', 'Meteor', 'Saturn', 'Jupiter', 'Mars', 'Supernova', 'Milky Way', 'Dark Matter', 'Black Hole', 'Cosmic Dust', 'Solar Flare', 'Constellation', 'Zenith', 'Event Horizon', 'Starfield', 'Deep Space', 'Light Year', 'Wormhole'],
  wedding: ['Blush', 'Ivory', 'Lace', 'Pearl', 'Satin', 'Bouquet', 'Vow', 'Chapel', 'Champagne', 'Rose Quartz', 'Dusty Rose', 'Sage', 'Eucalyptus', 'Mauve', 'Peony', 'Magnolia', 'Dahlia', 'Orchid', 'Serenity', 'Buttercream', 'Tulle', 'Silk', 'Chiffon', 'Grace', 'Elegance', 'Romance', 'Garden Party', 'Nostalgia', 'Forever', 'Timeless'],
};

// ── Theme generation configs ─────────────────────────────────────────

/** Color-by-hue: generates palettes within a tight hue range, spreading lightness */
function colorConfig(slug: string, hMin: number, hMax: number, sMin: number, sMax: number): ThemeGenConfig {
  return {
    tags: [slug],
    generate(i, rng) {
      const count = Math.floor(rr(rng, 4, 7));
      const adj = COLOR_ADJ[i % COLOR_ADJ.length];
      const label = slug.charAt(0).toUpperCase() + slug.slice(1);
      const baseHue = rr(rng, hMin, hMax);
      const baseSat = rr(rng, sMin, sMax);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const t = j / (count - 1);
        const l = lerp(25, 82, t) + rr(rng, -4, 4);
        const h = baseHue + rr(rng, -6, 6);
        const s = baseSat + rr(rng, -8, 8);
        colors.push(hslToHex(h, s, l));
      }
      return { name: `${adj} ${label}`, description: `${adj} ${label} color palette`, colors };
    },
  };
}

/** Curated topic themes using hand-tuned base palettes with controlled variation */
function curatedConfig(
  slug: string,
  basePalettes: Array<[number, number, number]>[],
  jitter: number,
): ThemeGenConfig {
  const nouns = THEME_NOUNS[slug] ?? COLOR_ADJ;
  return {
    tags: [slug],
    generate(i, rng) {
      const base = basePalettes[i % basePalettes.length];
      const noun = nouns[i % nouns.length];
      const colors = base.map(([h, s, l]) =>
        hslToHex(
          h + rr(rng, -jitter, jitter),
          Math.max(0, Math.min(100, s + rr(rng, -jitter * 0.5, jitter * 0.5))),
          Math.max(5, Math.min(95, l + rr(rng, -jitter * 0.4, jitter * 0.4))),
        ),
      );
      return { name: noun, description: `${noun} color palette`, colors };
    },
  };
}

// ── Config map ───────────────────────────────────────────────────────

const THEME_CONFIGS: Record<string, ThemeGenConfig> = {
  // ── Color themes ──
  red:       colorConfig('red', 350, 370, 55, 85),
  orange:    colorConfig('orange', 22, 38, 60, 88),
  brown:     colorConfig('brown', 22, 38, 25, 50),
  yellow:    colorConfig('yellow', 48, 60, 65, 92),
  green:     colorConfig('green', 110, 145, 40, 78),
  turquoise: colorConfig('turquoise', 170, 192, 45, 75),
  blue:      colorConfig('blue', 205, 235, 50, 85),
  violet:    colorConfig('violet', 265, 295, 40, 75),
  pink:      colorConfig('pink', 325, 348, 50, 82),
  gray: {
    tags: ['gray'],
    generate(i, rng) {
      const count = Math.floor(rr(rng, 4, 7));
      const adj = COLOR_ADJ[i % COLOR_ADJ.length];
      const tintHue = rr(rng, 0, 360);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(25, 88, j / (count - 1)) + rr(rng, -3, 3);
        colors.push(hslToHex(tintHue, rr(rng, 2, 8), l));
      }
      return { name: `${adj} Gray`, description: `${adj} Gray color palette`, colors };
    },
  },
  black: {
    tags: ['black'],
    generate(i, rng) {
      const count = Math.floor(rr(rng, 4, 6));
      const adj = COLOR_ADJ[i % COLOR_ADJ.length];
      const tintHue = rr(rng, 0, 360);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(3, 25, j / (count - 1)) + rr(rng, -2, 2);
        colors.push(hslToHex(tintHue + rr(rng, -15, 15), rr(rng, 5, 20), l));
      }
      return { name: `${adj} Noir`, description: `${adj} Noir color palette`, colors };
    },
  },
  white: {
    tags: ['white'],
    generate(i, rng) {
      const count = Math.floor(rr(rng, 4, 6));
      const adj = COLOR_ADJ[i % COLOR_ADJ.length];
      const tintHue = rr(rng, 0, 360);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(88, 98, j / (count - 1)) + rr(rng, -1, 1);
        colors.push(hslToHex(tintHue + rr(rng, -20, 20), rr(rng, 3, 15), l));
      }
      return { name: `${adj} Light`, description: `${adj} Light color palette`, colors };
    },
  },

  // ── Theme configs (carefully tuned colors) ──

  // Christmas: red, green, gold, white, deep red
  christmas: curatedConfig('christmas', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [0 + v, 78, 42],
      [145 + v, 55, 32],
      [48, 85, 52 + v % 8],
      [0, 0, 94],
      [350 - v, 70, 28],
    ] as [number, number, number][];
  }), 6),

  // Halloween: orange, black, purple, sickly green, bone white
  halloween: curatedConfig('halloween', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [25 + v, 88, 50],
      [0, 0, 8 + (i % 5)],
      [275 + v, 55, 32],
      [80, 45, 42 + v % 6],
      [40, 20, 88],
    ] as [number, number, number][];
  }), 5),

  // Spring: soft pinks, fresh greens, light yellows, lavender, sky blue
  spring: curatedConfig('spring', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [340 + v, 50, 78],
      [130 + v, 45, 62],
      [55, 55, 82 - v % 6],
      [280 + v, 35, 75],
      [200, 50, 72 + v % 5],
    ] as [number, number, number][];
  }), 8),

  // Summer: vibrant turquoise, coral, sunny yellow, hot pink, ocean blue
  summer: curatedConfig('summer', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [180 + v, 65, 52],
      [12 + v, 75, 60],
      [50, 82, 58 + v % 6],
      [335 + v, 68, 58],
      [210, 60, 48 + v % 6],
    ] as [number, number, number][];
  }), 8),

  // Autumn: burnt orange, deep red, golden yellow, chocolate, olive
  autumn: curatedConfig('autumn', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [25 + v, 72, 42],
      [5 + v, 60, 35],
      [45, 70, 52 + v % 6],
      [20, 40, 22 + v % 4],
      [75 + v, 35, 38],
    ] as [number, number, number][];
  }), 6),

  // Winter: icy blue, steel gray, white, navy, pale lavender
  winter: curatedConfig('winter', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [205 + v, 50, 72],
      [210, 12, 55 + v % 6],
      [210, 8, 92],
      [220 + v, 55, 25],
      [240 + v, 20, 80],
    ] as [number, number, number][];
  }), 5),

  // Sunset: warm peach, deep coral, burnt orange, mauve/purple, golden
  sunset: curatedConfig('sunset', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [20 + v, 78, 68],
      [5 + v, 72, 52],
      [30 + v, 80, 48],
      [310 + v, 35, 42],
      [45, 85, 58 + v % 6],
    ] as [number, number, number][];
  }), 7),

  // Ocean: deep navy, teal, seafoam, aquamarine, sand
  ocean: curatedConfig('ocean', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [215 + v, 60, 25],
      [185 + v, 55, 38],
      [160 + v, 40, 72],
      [180 + v, 50, 58],
      [45, 25, 78 + v % 5],
    ] as [number, number, number][];
  }), 6),

  // Forest: dark green, moss, bark brown, sage, golden light
  forest: curatedConfig('forest', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [140 + v, 50, 25],
      [95 + v, 35, 42],
      [25, 35, 28 + v % 5],
      [120 + v, 25, 58],
      [48, 40, 65 + v % 5],
    ] as [number, number, number][];
  }), 6),

  // Desert: sand, terracotta, cactus green, sky blue, bone
  desert: curatedConfig('desert', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [38 + v, 45, 72],
      [15 + v, 58, 48],
      [105 + v, 30, 42],
      [205, 45, 68 + v % 5],
      [40, 18, 88],
    ] as [number, number, number][];
  }), 6),

  // Neon: electric pink, lime, cyan, violet, hot orange
  neon: curatedConfig('neon', Array.from({ length: 30 }, (_, i) => {
    const v = i * 8;
    return [
      [325 + v, 95, 55],
      [100 + v, 90, 52],
      [185 + v, 92, 50],
      [270 + v, 88, 55],
      [25 + v, 95, 55],
    ] as [number, number, number][];
  }), 8),

  // Pastel: soft pink, baby blue, mint, lilac, peach
  pastel: curatedConfig('pastel', Array.from({ length: 30 }, (_, i) => {
    const v = i * 5;
    return [
      [340 + v, 45, 82],
      [210 + v, 45, 82],
      [155 + v, 38, 80],
      [275 + v, 38, 82],
      [25 + v, 48, 84],
    ] as [number, number, number][];
  }), 6),

  // Earth: ochre, sienna, olive, slate, cream
  earth: curatedConfig('earth', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [42 + v, 55, 50],
      [18 + v, 50, 38],
      [85 + v, 30, 35],
      [210, 10, 42 + v % 5],
      [45, 20, 88],
    ] as [number, number, number][];
  }), 5),

  // Vintage: dusty rose, sage, mustard, burgundy, cream
  vintage: curatedConfig('vintage', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [350 + v, 30, 62],
      [130 + v, 20, 52],
      [45, 50, 52 + v % 5],
      [345 + v, 40, 32],
      [40, 15, 90],
    ] as [number, number, number][];
  }), 6),

  // Midnight: deep navy, charcoal, midnight blue, dark purple, steel
  midnight: curatedConfig('midnight', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [225 + v, 50, 15],
      [220, 8, 22 + v % 4],
      [230 + v, 45, 25],
      [280 + v, 35, 22],
      [210, 15, 35 + v % 5],
    ] as [number, number, number][];
  }), 5),

  // Candy: hot pink, electric purple, bright cyan, bubblegum, violet
  candy: curatedConfig('candy', Array.from({ length: 30 }, (_, i) => {
    const v = i * 6;
    return [
      [335 + v, 78, 62],
      [285 + v, 72, 55],
      [190 + v, 70, 58],
      [340 + v, 60, 75],
      [265 + v, 65, 62],
    ] as [number, number, number][];
  }), 8),

  // Tropical: vivid green, coral, turquoise, mango, deep teal
  tropical: curatedConfig('tropical', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [135 + v, 65, 42],
      [10 + v, 72, 58],
      [175 + v, 60, 48],
      [38 + v, 80, 58],
      [185 + v, 55, 32],
    ] as [number, number, number][];
  }), 7),

  // Nordic: pale blue-gray, muted sage, warm white, charcoal, dusty blue
  nordic: curatedConfig('nordic', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [210 + v, 15, 75],
      [140 + v, 12, 55],
      [40, 8, 92],
      [210, 8, 28 + v % 4],
      [215 + v, 20, 62],
    ] as [number, number, number][];
  }), 5),

  // Sunrise: peach, soft gold, blush pink, warm coral, light blue
  sunrise: curatedConfig('sunrise', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [25 + v, 65, 75],
      [45, 70, 62 + v % 5],
      [345 + v, 50, 78],
      [12 + v, 68, 60],
      [205, 40, 78 + v % 4],
    ] as [number, number, number][];
  }), 6),

  // Jewel: deep ruby, emerald, sapphire, amethyst, topaz
  jewel: curatedConfig('jewel', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [350 + v, 72, 38],
      [155 + v, 65, 32],
      [225 + v, 68, 35],
      [285 + v, 58, 38],
      [42 + v, 75, 48],
    ] as [number, number, number][];
  }), 6),

  // Terracotta: warm clay, rust, burnt sienna, ochre, cream
  terracotta: curatedConfig('terracotta', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [15 + v, 55, 52],
      [10 + v, 62, 40],
      [22 + v, 58, 35],
      [40 + v, 50, 55],
      [38, 22, 88],
    ] as [number, number, number][];
  }), 5),

  // Lavender: soft purple, lilac, pale violet, dusty mauve, light periwinkle
  lavender: curatedConfig('lavender', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [270 + v, 35, 68],
      [285 + v, 40, 78],
      [260 + v, 28, 82],
      [320 + v, 22, 62],
      [240 + v, 35, 78],
    ] as [number, number, number][];
  }), 6),

  // Monochrome: single random hue, spread across lightness
  monochrome: {
    tags: ['monochrome'],
    generate(i, rng) {
      const count = Math.floor(rr(rng, 4, 7));
      const nouns = THEME_NOUNS['monochrome']!;
      const noun = nouns[i % nouns.length];
      const hue = rr(rng, 0, 360);
      const sat = rr(rng, 35, 72);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const l = lerp(18, 88, j / (count - 1));
        colors.push(hslToHex(hue + rr(rng, -4, 4), sat + rr(rng, -5, 5), l + rr(rng, -2, 2)));
      }
      return { name: noun, description: `${noun} color palette`, colors };
    },
  },

  // Gradient: smooth hue transition
  gradient: {
    tags: ['gradient'],
    generate(i, rng) {
      const count = Math.floor(rr(rng, 5, 8));
      const nouns = THEME_NOUNS['gradient']!;
      const noun = nouns[i % nouns.length];
      const hStart = rr(rng, 0, 360);
      const hSpan = rr(rng, 40, 120);
      const satBase = rr(rng, 50, 80);
      const colors: string[] = [];
      for (let j = 0; j < count; j++) {
        const t = j / (count - 1);
        colors.push(hslToHex(
          hStart + hSpan * t,
          satBase + rr(rng, -5, 5),
          lerp(38, 72, t) + rr(rng, -3, 3),
        ));
      }
      return { name: noun, description: `${noun} color palette`, colors };
    },
  },

  // Retro: 70s warm tones -- mustard, rust, avocado, brown, cream
  retro: curatedConfig('retro', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [45 + v, 65, 52],
      [15 + v, 60, 42],
      [80 + v, 40, 40],
      [25, 40, 30 + v % 5],
      [38, 18, 88],
    ] as [number, number, number][];
  }), 6),

  // Minimalist: very few colors, neutral + one accent
  minimalist: {
    tags: ['minimalist'],
    generate(i, rng) {
      const nouns = THEME_NOUNS['minimalist']!;
      const noun = nouns[i % nouns.length];
      const accentHue = rr(rng, 0, 360);
      const colors = [
        hslToHex(0, 0, 96),
        hslToHex(0, 0, 88 + rr(rng, -3, 3)),
        hslToHex(0, 0, 42 + rr(rng, -5, 5)),
        hslToHex(accentHue, rr(rng, 40, 70), rr(rng, 42, 58)),
        hslToHex(0, 0, 12 + rr(rng, -3, 3)),
      ];
      return { name: noun, description: `${noun} color palette`, colors };
    },
  },

  // Coffee: espresso, dark roast, cream, caramel, latte foam
  coffee: curatedConfig('coffee', Array.from({ length: 30 }, (_, i) => {
    const v = i * 2;
    return [
      [22, 50, 15 + v % 4],
      [25 + v, 45, 25],
      [35, 25, 85 + v % 4],
      [32 + v, 55, 48],
      [38, 18, 92],
    ] as [number, number, number][];
  }), 4),

  // Aurora: deep teal, vivid green, purple, pink, dark navy
  aurora: curatedConfig('aurora', Array.from({ length: 30 }, (_, i) => {
    const v = i * 4;
    return [
      [175 + v, 60, 35],
      [130 + v, 65, 48],
      [285 + v, 55, 42],
      [335 + v, 50, 58],
      [225, 50, 15 + v % 4],
    ] as [number, number, number][];
  }), 7),

  // Space: deep navy, violet, nebula pink, star white, cosmic teal
  space: curatedConfig('space', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [230 + v, 55, 12],
      [270 + v, 50, 25],
      [330 + v, 45, 45],
      [220, 10, 90 + v % 4],
      [195 + v, 50, 32],
    ] as [number, number, number][];
  }), 5),

  // Wedding: blush, ivory, sage, dusty rose, gold
  wedding: curatedConfig('wedding', Array.from({ length: 30 }, (_, i) => {
    const v = i * 3;
    return [
      [345 + v, 35, 82],
      [40, 12, 94],
      [140 + v, 22, 58],
      [350 + v, 30, 68],
      [45, 50, 58 + v % 5],
    ] as [number, number, number][];
  }), 5),
};

// ── Public API ───────────────────────────────────────────────────────

const PALETTES_PER_THEME = 30;

/**
 * Generate all system palettes for a given theme slug.
 */
export function generatePalettesForTheme(themeSlug: string): SystemPalette[] {
  const config = THEME_CONFIGS[themeSlug];
  if (!config) return [];

  const results: SystemPalette[] = [];
  for (let i = 0; i < PALETTES_PER_THEME; i++) {
    const seed = hashStr(`${themeSlug}-v2-${i}`);
    const rng = seededRng(seed);
    const { name, description, colors } = config.generate(i, rng);
    results.push({ name, description, colors, tagSlugs: config.tags, themeSlug });
  }
  return results;
}

/**
 * Generate all system palettes across all themes.
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
