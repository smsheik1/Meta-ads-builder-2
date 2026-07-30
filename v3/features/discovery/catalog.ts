import type { DiscoveryEntry, DiscoveryGoal } from "./types";
import { databaseFormatDiscoveryEntries } from "./databaseFormatArchive";
import { jingleDiscoveryEntries } from "./jingleArchive";
import { videoMemeDiscoveryEntries } from "./videoMemeArchive";

const selfieNineDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "petal-umbrella",
    brand: "Surreal portrait series",
    title: "One selfie, nine impossible scenes",
    curatorNote: "A single recognizable subject carries the same quiet editorial language across nine surreal compositions.",
  },
  {
    id: "cloud",
    brand: "Cloud",
    title: "A nap in mid-air",
    curatorNote: "Dense cloud texture and generous negative space turn the same selfie into a quiet dream.",
  },
  {
    id: "chair",
    brand: "Chair",
    title: "Sitting above the pavement",
    curatorNote: "An ordinary worn chair becomes strange through one clean, visible air gap.",
  },
  {
    id: "mirror",
    brand: "Mirror",
    title: "Standing on a reflection",
    curatorNote: "The reflected boots make an impossible floating mirror feel physically present.",
  },
  {
    id: "staircase",
    brand: "Staircase",
    title: "Climbing toward nothing",
    curatorNote: "A calm walking pose holds together while the final steps dissolve into dust.",
  },
  {
    id: "bed",
    brand: "Bed",
    title: "Resting above concrete",
    curatorNote: "Heavy white bedding and a relaxed pose make the floating bed feel unexpectedly believable.",
  },
  {
    id: "phone-booth",
    brand: "Phone booth",
    title: "A call suspended in time",
    curatorNote: "Clear glass, a loose receiver cord, and frozen pigeons keep every layer readable.",
  },
  {
    id: "grocery-cart",
    brand: "Grocery cart",
    title: "Shopping without gravity",
    curatorNote: "The same subject stays relaxed inside detailed wire mesh while bags float around the cart.",
  },
  {
    id: "door",
    brand: "Door",
    title: "Walking out of nowhere",
    curatorNote: "A detached door, readable mid-step pose, and large empty air gap complete the impossible transition.",
  },
].map((proof, index) => ({
  ...proof,
  id: `selfie-nine-images-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 18 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/selfie-nine-images-v1/assets/source/${proof.id}.jpg`,
    referenceSrc: "/format-repositories/selfie-nine-images-v1/assets/source/original-selfie.jpg",
    durationLabel: "Static",
  },
  format: {
    slug: "selfie-nine-images",
    name: "1 Selfie, 9 Images",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const ragDollDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "red-door",
    brand: "Identity preservation",
    title: "Every accessory becomes felt",
    curatorNote: "The seated pose, expression, jewelry, handbag, and red doorway survive as tactile handcrafted details.",
    image: "02",
  },
  {
    id: "cover",
    brand: "Felt transformation",
    title: "Turn any portrait into handmade felt",
    curatorNote: "The branded source cover establishes the complete wool-and-stitching transformation.",
    image: "01",
  },
  {
    id: "phone-booth",
    brand: "Environment transformation",
    title: "A whole London street in wool",
    curatorNote: "The person remains recognizable while glass, brick, pavement, and the phone booth become one coherent felt world.",
    image: "03",
  },
  {
    id: "cafe-couple",
    brand: "Two-person portrait",
    title: "Two people, one felt world",
    curatorNote: "Two distinct faces and a shared pose remain legible inside a detailed handmade café scene.",
    image: "04",
  },
  {
    id: "juice",
    brand: "Material detail",
    title: "Tiny fibers hold the likeness",
    curatorNote: "Hair, skin, clothing, the drink, and the background all carry visible wool fibers without losing the subject.",
    image: "05",
  },
  {
    id: "car-bouquet",
    brand: "Lifestyle portrait",
    title: "Soft materials, same moment",
    curatorNote: "The bouquet, car interior, outfit, and relaxed pose become plush while preserving the original composition.",
    image: "06",
  },
  {
    id: "doorway",
    brand: "Fashion portrait",
    title: "Fashion becomes handcrafted",
    curatorNote: "Layered fabric, stitching, and soft stuffing carry the outfit and doorway into a polished stop-motion world.",
    image: "07",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `rag-doll-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 27 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/rag-doll-v1/assets/source/carousel-${image}.jpg`,
    durationLabel: "Static",
  },
  format: {
    slug: "rag-doll",
    name: "Rag Doll",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const productPhotoshootDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "gift",
    title: "Gift-ready without the studio",
    curatorNote: "A warm gift scene keeps the real tin and cookies recognizable while adding occasion and polish.",
  },
  {
    id: "hero",
    title: "A clean product hero",
    curatorNote: "The exact product becomes a crisp ecommerce hero with controlled color, spacing, and light.",
  },
  {
    id: "lifestyle",
    title: "The product in use",
    curatorNote: "Hands, crumbs, and serving details create a believable lifestyle moment around the same product.",
  },
  {
    id: "seasonal",
    title: "Ready for the holiday campaign",
    curatorNote: "Seasonal props change the campaign mood without changing the product customers will receive.",
  },
  {
    id: "social",
    title: "Built for the feed",
    curatorNote: "A bold branded composition turns the packshot into a graphic social ad.",
  },
  {
    id: "surface",
    title: "A polished tabletop shot",
    curatorNote: "A simple kitchen surface gives the product a natural commercial setting with room to breathe.",
  },
].map((proof, index) => ({
  ...proof,
  id: `product-photoshoot-davids-meltaways-${proof.id}`,
  status: "published",
  order: 5.1 + index / 10,
  brand: "David's Cookies",
  goal: "sell",
  media: {
    kind: "image",
    src: `/discovery/product-photoshoot/davids-meltaways-${proof.id}.jpg`,
    durationLabel: "Static",
  },
  format: {
    slug: "product-photoshoot",
    name: "Product Photoshoot",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const moodNotesDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "poolside",
    brand: "Personal visual journal",
    title: "Turn a real moment into Mood Notes",
    curatorNote: "Scene-specific handwriting, restrained doodles, and a glass music player turn one lifestyle photo into a personal journal page.",
    image: "example-output",
  },
  {
    id: "matcha",
    brand: "Everyday details",
    title: "Small objects carry the mood",
    curatorNote: "The matcha, sunglasses, and bag each receive one short observation while the original scene stays intact.",
    image: "example-02",
  },
  {
    id: "garden",
    brand: "Lifestyle portrait",
    title: "A relaxed portrait gets its soundtrack",
    curatorNote: "Notes describe the jacket, shades, greenery, and calm energy without crowding the seated subject.",
    image: "example-03",
  },
  {
    id: "mirror",
    brand: "Mirror selfie",
    title: "An outfit becomes a memory page",
    curatorNote: "Readable arrows connect quick thoughts to the phone, bag, outfit, and room light.",
    image: "example-04",
  },
  {
    id: "beach",
    brand: "Golden hour",
    title: "Beach light sets the whole interface",
    curatorNote: "The warm music card and white notes echo the hat, drink, jewelry, and sunlit atmosphere.",
    image: "example-05",
  },
  {
    id: "street",
    brand: "Travel journal",
    title: "A city walk gets annotated",
    curatorNote: "Architecture, clothing, and the pace of the walk become personal cues while the street portrait keeps its negative space.",
    image: "example-06",
  },
  {
    id: "market",
    brand: "Colorful moment",
    title: "Food, texture, and color become notes",
    curatorNote: "The annotations and music interface follow the market scene's playful details and palette.",
    image: "example-07",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `mood-notes-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 34 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/mood-notes-v1/assets/source/${image}.jpg`,
    ...(index === 0
      ? {
          referenceSrc:
            "/format-repositories/mood-notes-v1/assets/source/reference-input.jpg",
        }
      : {}),
    durationLabel: "Static",
  },
  format: {
    slug: "mood-notes",
    name: "Mood Notes",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const redDeadRedemptionDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "frontier-portrait",
    brand: "Character transformation",
    title: "Turn a portrait into a frontier cutscene",
    curatorNote: "The original face and centered framing survive a richly textured 1899 Western video-game transformation.",
    image: "example-output",
  },
  {
    id: "main-street",
    brand: "Frontier character",
    title: "A modern headshot becomes a gunslinger",
    curatorNote: "Hat, coat, vest, gun belt, dust, and golden light relocate the same person to a frontier main street.",
    image: "example-02",
  },
  {
    id: "ranch-porch",
    brand: "Ranch scene",
    title: "The portrait moves onto a ranch porch",
    curatorNote: "The face stays recognizable while the cabin, mountains, leather, and period weapons form one coherent scene.",
    image: "example-03",
  },
  {
    id: "winter-saloon",
    brand: "Seasonal Western",
    title: "Holiday warmth survives the Western rewrite",
    curatorNote: "Firelight and Christmas details support the character instead of breaking the dusty game-world atmosphere.",
    image: "example-04",
  },
  {
    id: "cabin",
    brand: "Rugged portrait",
    title: "A clean selfie becomes a cabin character",
    curatorNote: "Weathered fabric, revolvers, a stove, and volumetric sunbeams deliver the AAA Western finish.",
    image: "example-05",
  },
  {
    id: "saloon",
    brand: "In-game cutscene",
    title: "A studio portrait becomes a saloon scene",
    curatorNote: "Restrained period styling preserves identity while the bar and practical lighting establish an in-game cutscene.",
    image: "example-06",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `red-dead-redemption-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 41 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/red-dead-redemption-v1/assets/source/${image}.jpg`,
    ...(index === 0
      ? {
          referenceSrc:
            "/format-repositories/red-dead-redemption-v1/assets/source/reference-input.jpg",
        }
      : {}),
    durationLabel: "Static",
  },
  format: {
    slug: "red-dead-redemption",
    name: "Red Dead Redemption",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const oldMoneyShotDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "roadster-portrait",
    brand: "Old-money editorial",
    title: "Turn a portrait into a timeless film still",
    curatorNote: "A low camera, classic roadster, open collar, deep contrast, and tactile grain turn one modern portrait into a confident monochrome editorial.",
    image: "example-output",
  },
  {
    id: "windblown",
    brand: "Candid portrait",
    title: "Wind and posture carry the mood",
    curatorNote: "The off-camera gaze and windblown hair keep the polished scene from feeling staged.",
    image: "example-02",
  },
  {
    id: "roadster-stance",
    brand: "Tailored portrait",
    title: "A full stance keeps every detail readable",
    curatorNote: "High-waisted trousers, relaxed hands, chrome, grassland, and cloudy sky all survive the monochrome grade.",
    image: "example-03",
  },
  {
    id: "roadside-seat",
    brand: "Roadside editorial",
    title: "A seated portrait still feels cinematic",
    curatorNote: "Deep blacks in the trousers and car balance the bright shirt, open sky, and self-possessed gaze.",
    image: "example-04",
  },
  {
    id: "field-roadster",
    brand: "Minimal styling",
    title: "Simple styling lets the subject lead",
    curatorNote: "The quiet field and vintage car provide depth without pulling attention away from the person.",
    image: "example-05",
  },
  {
    id: "glasses",
    brand: "Accessory detail",
    title: "Accessories survive the film recipe",
    curatorNote: "Glasses, tousled hair, shirt texture, and polished bodywork remain legible through soft daylight and grain.",
    image: "example-06",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `old-money-shot-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 48 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/old-money-shot-v1/assets/source/${image}.jpg`,
    ...(index === 0
      ? {
          referenceSrc:
            "/format-repositories/old-money-shot-v1/assets/source/reference-input.jpg",
        }
      : {}),
    durationLabel: "Static",
  },
  format: {
    slug: "old-money-shot",
    name: "Old Money Shot",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const chromeVoidDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "red-jacket-street",
    brand: "Surreal streetwear",
    title: "Turn a fashion portrait into living chrome",
    curatorNote: "The person, red jacket, denim, pose, and street camera remain intact while reflective liquid-metal sculpture grows through the scene.",
    image: "example-output",
  },
  {
    id: "boutique-mirror",
    brand: "Mirror selfie",
    title: "Keep the casual pose. Rebuild the environment.",
    curatorNote: "The phone, shopping bag, layered outfit, and proportions survive while chrome branches create believable boutique depth.",
    image: "example-02",
  },
  {
    id: "green-knit",
    brand: "Texture proof",
    title: "Soft knit stays readable beside hard chrome",
    curatorNote: "Dress texture, boots, bag, crossed arms, and face remain clear while metallic forms curve around the subject.",
    image: "example-03",
  },
  {
    id: "layered-mini",
    brand: "Fashion editorial",
    title: "Preserve every layer inside a surreal set",
    curatorNote: "Hair, shoulder pose, dress, bag, and tall boots keep their color and shape across foreground and background chrome.",
    image: "example-04",
  },
  {
    id: "city-layers",
    brand: "City portrait",
    title: "Make the effect feel planted on the sidewalk",
    curatorNote: "Reflections and occlusion place the chrome convincingly without replacing the cap, jewelry, jacket, jeans, or gaze.",
    image: "example-05",
  },
  {
    id: "graphic-knit",
    brand: "Accessory detail",
    title: "Keep the graphics, glasses, cup, and full pose",
    curatorNote: "The metallic sculpture adds spectacle while the original streetwear portrait stays recognizable down to the accessories.",
    image: "example-06",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `chrome-void-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 55 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/chrome-void-v1/assets/source/${image}.jpg`,
    ...(index === 0
      ? {
          referenceSrc:
            "/format-repositories/chrome-void-v1/assets/source/reference-input.jpg",
        }
      : {}),
    durationLabel: "Static",
  },
  format: {
    slug: "chrome-void",
    name: "Chrome Void",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const ccdJpegFilterDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "lakeside-speedboat",
    brand: "Archived lake night",
    title: "Turn a clean snapshot into a believable CCD JPEG",
    curatorNote: "The composition stays intact while dense electronic noise, soft optics, imperfect exposure, and compression make the file feel genuinely old.",
    image: "example-output",
  },
  {
    id: "red-car-night",
    brand: "Direct-flash nightlife",
    title: "Keep the pose. Break the modern polish.",
    curatorNote: "Hard flash, crushed shadows, chroma noise, and texture smearing degrade the file without replacing the subject or red car.",
    image: "example-02",
  },
  {
    id: "phone-booth",
    brand: "Phone-booth portrait",
    title: "Make compression part of the memory",
    curatorNote: "The phone, suit, booth, and graffiti remain recognizable while early-social JPEG damage softens every surface.",
    image: "example-03",
  },
  {
    id: "parking-lot-lighter",
    brand: "Parking-lot flash",
    title: "Underexpose it like a cheap automatic camera",
    curatorNote: "The lighter, jewelry, jacket, and empty lot survive beneath noisy shadows, weak sharpening, and imperfect white balance.",
    image: "example-04",
  },
  {
    id: "airport-flowers",
    brand: "Airport snapshot",
    title: "Daylight can still feel downloaded and reshared",
    curatorNote: "Flowers, clothing, airplane, and tarmac stay fixed while low dynamic range and compression create an archived-internet finish.",
    image: "example-05",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `ccd-jpeg-filter-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 61 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/ccd-jpeg-filter-v1/assets/source/${image}.jpg`,
    ...(index === 0
      ? {
          referenceSrc:
            "/format-repositories/ccd-jpeg-filter-v1/assets/source/reference-input.jpg",
        }
      : {}),
    durationLabel: "Static",
  },
  format: {
    slug: "ccd-jpeg-filter",
    name: "CCD JPEG Filter",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const passportClickDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "dominican-passport",
    brand: "Viral document portrait",
    title: "The passport photo becomes the whole story",
    curatorNote: "A recognizable selfie becomes a neutral but unexpectedly photogenic government portrait inside a tightly cropped, worn passport.",
    image: "example-output",
  },
  {
    id: "brazilian-passport",
    brand: "Identity preservation",
    title: "Keep the face. Change the context.",
    curatorNote: "The same recipe preserves another identity while lamination, print texture, creases, and security detail make the document feel issued.",
    image: "example-02",
  },
  {
    id: "european-passport",
    brand: "Low-fi realism",
    title: "Let print damage sell the illusion",
    curatorNote: "Washed color, scanner softness, halftone texture, and paper wear prevent the attractive portrait from feeling like a studio photo.",
    image: "example-03",
  },
  {
    id: "georgia-passport",
    brand: "Repeatable portrait",
    title: "A new face still fits the same recipe",
    curatorNote: "Straight-on posture, tight document framing, and machine-readable detail repeat without turning the subject into somebody else.",
    image: "example-04",
  },
  {
    id: "jamaican-passport",
    brand: "Printed portrait",
    title: "Make the beauty feel government-issued",
    curatorNote: "A neutral expression stays photogenic beneath holograms, print dots, glare, slight warping, and convincing document wear.",
    image: "example-05",
  },
  {
    id: "united-states-passport",
    brand: "Social-media crop",
    title: "Crop aggressively enough to stop the scroll",
    curatorNote: "The passport extends beyond the frame while compression and handheld softness make the close-up feel casually screenshotted and reposted.",
    image: "example-06",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `passport-click-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 67 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/passport-click-v1/assets/source/${image}.jpg`,
    ...(index === 0
      ? {
          referenceSrc:
            "/format-repositories/passport-click-v1/assets/source/reference-input.jpg",
        }
      : {}),
    durationLabel: "Static",
  },
  format: {
    slug: "passport-click",
    name: "Passport Click",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const fakeItTillYouMakeItDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "yellow-pirelli-cap",
    brand: "Lifestyle transformation",
    title: "Make the mirror selfie look casually expensive",
    curatorNote: "Bright linen, embroidered headwear, jewelry, and flat daylight keep the hero polished without losing its phone-photo energy.",
    image: "yellow-pirelli-cap",
  },
  {
    id: "luxury-bathroom",
    brand: "Streetwear mirror selfie",
    title: "Layer the fit without losing the candid",
    curatorNote: "A raised drink, hooded color blocking, reflective tiles, and warm hotel light create a believable high-end night out.",
    image: "luxury-bathroom",
  },
  {
    id: "shooting-range",
    brand: "Action candid",
    title: "Freeze the moment downrange",
    curatorNote: "The stance, safety gear, target, lane number, and hard fluorescent light make the generated action feel observed rather than staged.",
    image: "shooting-range",
  },
  {
    id: "sheet-mask-mirror",
    brand: "Private mirror selfie",
    title: "Make the unbothered moment the post",
    curatorNote: "Wet hair, a crinkled hydrogel mask, dim stone, and a loose pose make the bathroom frame feel raw and personal.",
    image: "sheet-mask-mirror",
  },
  {
    id: "tropical-hat",
    brand: "Vacation selfie",
    title: "Point the camera straight into summer",
    curatorNote: "An extreme low angle, clean sky, mirrored lenses, and palm fronds deliver an unmistakable vacation flex.",
    image: "tropical-hat",
  },
  {
    id: "nyc-bench",
    brand: "Street-style duo",
    title: "Two iced coffees, zero effort",
    curatorNote: "Distinct outfits, deadpan expressions, dappled light, and a full-body street crop make the pairing feel editorial and spontaneous.",
    image: "nyc-bench",
  },
  {
    id: "concrete-cafe",
    brand: "Quiet café candid",
    title: "Let the morning light do the flexing",
    curatorNote: "Golden window light, worn leather, satin, and a reclined posture turn a raw concrete room into a calm lifestyle frame.",
    image: "concrete-cafe",
  },
  {
    id: "bed-mask",
    brand: "Raw close-up",
    title: "Post the morning exactly as it feels",
    curatorNote: "The overhead crop, creased mask, wired earbuds, tattoos, and warm side light keep the scene intimate and deliberately unpolished.",
    image: "bed-mask",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `fake-it-till-you-make-it-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 73 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/fake-it-till-you-make-it-v1/assets/source/${image}.jpg`,
    referenceSrc:
      "/format-repositories/fake-it-till-you-make-it-v1/assets/source/reference-input.jpg",
    durationLabel: "Static",
  },
  format: {
    slug: "fake-it-till-you-make-it",
    name: "Fake It Till You Make It",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const darkStudioPortraitDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "afro-glasses",
    brand: "Monochrome portrait",
    title: "Let the rim light draw the whole face",
    curatorNote: "A clean halo, deep facial shadow, crisp glasses, and heavy grain turn formal tailoring into a raw analog portrait.",
    image: "afro-glasses",
  },
  {
    id: "cover",
    brand: "Editorial cover",
    title: "Put the calm stare inside the darkness",
    curatorNote: "The off-center crop, formal black suit, and controlled falloff make a simple portrait feel immediately cinematic.",
    image: "cover",
  },
  {
    id: "soft-glasses",
    brand: "Soft-focus portrait",
    title: "Keep the edges imperfect",
    curatorNote: "A slight head tilt, faint bloom, and gentle softness keep the high-contrast studio treatment human.",
    image: "soft-glasses",
  },
  {
    id: "braided-rim",
    brand: "Hair-light study",
    title: "Trace every braid with light",
    curatorNote: "The overhead halo separates the braided silhouette while pores, grain, and deep eye shadows preserve realism.",
    image: "braided-rim",
  },
  {
    id: "wet-curls-glasses",
    brand: "Textured close-up",
    title: "Make every curl catch the backlight",
    curatorNote: "Wet curls, facial hair, and glasses retain their geometry even as the face recedes into crushed blacks.",
    image: "wet-curls-glasses",
  },
  {
    id: "shadow-fringe",
    brand: "Low-key silhouette",
    title: "Let the face almost disappear",
    curatorNote: "A bright fringe halo and barely visible expression show how little fill light the recipe needs.",
    image: "shadow-fringe",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `dark-studio-portrait-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 81 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/dark-studio-portrait-v1/assets/source/${image}.jpg`,
    referenceSrc:
      "/format-repositories/dark-studio-portrait-v1/assets/source/reference-input.jpg",
    durationLabel: "Static",
  },
  format: {
    slug: "dark-studio-portrait",
    name: "Dark Studio Portrait",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const bluePhosphorDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "car-headlights",
    brand: "Analog night portrait",
    title: "Make the headlights glow like the portrait",
    curatorNote: "The source face, jacket, car, and city remain intact while cyan bloom, scanlines, and interference rings reshape the mood.",
    image: "car-headlights",
  },
  {
    id: "terrace",
    brand: "City portrait",
    title: "Turn the whole skyline cyan",
    curatorNote: "A bright face, white shirt, dark jacket, and distant city keep their depth inside a luminous monochrome treatment.",
    image: "terrace",
  },
  {
    id: "neon-stage",
    brand: "Neon portrait",
    title: "Let red disappear into phosphor blue",
    curatorNote: "The stage architecture, tattoos, jewelry, and relaxed pose survive as face-centered rings travel through the scene.",
    image: "neon-stage",
  },
  {
    id: "night-car",
    brand: "Nightlife portrait",
    title: "Keep the original pose under the filter",
    curatorNote: "Vehicle lights bloom into cyan without changing the subject's stance, crop, clothing, or airport-night background.",
    image: "night-car",
  },
  {
    id: "cowboy-market",
    brand: "Street-style portrait",
    title: "Run scanlines through every detail",
    curatorNote: "The cowboy hat, jacket, store, and direct gaze stay legible under fine horizontal texture and soft phosphor halation.",
    image: "cowboy-market",
  },
  {
    id: "garage",
    brand: "Garage portrait",
    title: "Keep rich texture in the blue shadows",
    curatorNote: "Cap, clothing, stance, and industrial background stay recognizable while the grade pushes deep without crushing detail.",
    image: "garage",
  },
  {
    id: "lounge",
    brand: "Lounge portrait",
    title: "Make a busy room feel hypnotic",
    curatorNote: "The seated pose, drink, jewelry, and bar remain photographic as subtle optical rings organize the whole frame.",
    image: "lounge",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `blue-phosphor-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 88 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/blue-phosphor-v1/assets/source/${image}.jpg`,
    durationLabel: "Static",
  },
  format: {
    slug: "blue-phosphor",
    name: "Blue Phosphor Filter",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

const fortniteFilterDiscoveryEntries: DiscoveryEntry[] = [
  {
    id: "rio-overlook",
    brand: "Portrait transformation",
    title: "From real portrait to game character",
    curatorNote: "The face, folded-arm pose, Brazil shirt, and Rio overlook survive the cinematic 3D transformation.",
    image: "skai-example-output",
  },
  {
    id: "banana-grove",
    brand: "Environment transformation",
    title: "Carry the whole setting into the game world",
    curatorNote: "The subject, goose, banana leaves, warm light, and playful gesture stay readable in one stylized scene.",
    image: "example-02",
  },
  {
    id: "pizza-street",
    brand: "Everyday action",
    title: "Keep the action, outfit, and location",
    curatorNote: "A pizza box, layered streetwear, tattoos, and the city backdrop all survive without losing the subject.",
    image: "example-03",
  },
  {
    id: "stadium",
    brand: "Full-body transformation",
    title: "Turn fan energy into a game-character frame",
    curatorNote: "The raised arms, Brazil outfit, stadium crowd, and long silhouette stay intact from head to toe.",
    image: "example-04",
  },
  {
    id: "cafe-duo",
    brand: "Two-person transformation",
    title: "Keep two people inside one coherent scene",
    curatorNote: "Both faces, the table pose, drinks, clothing, and cafe setting carry through the same polished 3D language.",
    image: "example-05",
  },
  {
    id: "puppy",
    brand: "Quiet character moment",
    title: "Small details still make it through",
    curatorNote: "The puppy, tracksuit, seated posture, expression, and soft home setting all remain recognizable.",
    image: "example-06",
  },
  {
    id: "safari",
    brand: "Travel transformation",
    title: "Make a travel portrait feel playable",
    curatorNote: "The subject, open-arm pose, elephants, foliage, and bright daylight become one believable game-world scene.",
    image: "example-07",
  },
  {
    id: "city-bench",
    brand: "Fashion transformation",
    title: "Hold onto the full fashion silhouette",
    curatorNote: "The seated pose, layered outfit, sneakers, cap, and city bench retain their shape through the stylization.",
    image: "example-08",
  },
].map(({ image, ...proof }, index) => ({
  ...proof,
  id: `fortnite-filter-${proof.id}`,
  status: "published",
  showInDiscovery: index === 0,
  order: 14 + index,
  goal: "entertain",
  media: {
    kind: "image",
    src: `/format-repositories/fortnite-filter-v1/assets/source/${image}.jpg`,
    durationLabel: "Static",
  },
  format: {
    slug: "fortnite-filter",
    name: "Fortnite Filter",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

export const discoveryCatalog: DiscoveryEntry[] = [
  {
    id: "final-straw-pocket-problem",
    status: "published",
    order: 1,
    brand: "FinalStraw",
    title: "The straw that fits in your pocket",
    curatorNote: "A familiar object becomes surprising when the mechanism is made visible.",
    goal: "sell",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/finalstraw.mp4",
      poster: "/discovery/final-straw.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "gruns-daily-stack",
    status: "published",
    order: 2,
    brand: "Grüns",
    title: "The daily stack, compressed",
    curatorNote: "The ad turns an invisible product promise into a physical journey.",
    goal: "explain",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/gruns.mp4",
      poster: "/discovery/gruns.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "theragun-heat-and-motion",
    status: "published",
    order: 3,
    brand: "Therabody",
    title: "Why heat changes the massage",
    curatorNote: "Two product benefits become one visual mechanism instead of a feature list.",
    goal: "explain",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/theragun.mp4",
      poster: "/discovery/theragun.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "kiala-supplement-journey",
    status: "published",
    order: 4,
    brand: "Kiala Nutrition",
    title: "The supplement journey",
    curatorNote: "The hidden delivery problem gives the product claim a visible reason.",
    goal: "explain",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/kiala.mp4",
      poster: "/discovery/kiala.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "lego-origin-story",
    status: "published",
    order: 5,
    brand: "LEGO",
    title: "How a wooden toy became a world",
    curatorNote: "A brand origin becomes a physical transformation instead of a timeline lecture.",
    goal: "story",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/agent-runs/lego-origin-world-arc-proof/final.mp4",
      poster: "/discovery/lego-origin.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "naruto-compilers",
    status: "published",
    order: 6,
    brand: "Developer Education",
    title: "Compilers, explained by Naruto",
    curatorNote: "Familiar characters carry a technical idea before the jargon arrives.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/naruto-compilers.mp4",
      poster: "/discovery/naruto-compilers.jpg",
      durationLabel: "75 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "naruto-mcp",
    status: "published",
    order: 7,
    brand: "Developer Tools",
    title: "MCP, explained by Naruto",
    curatorNote: "The visible roles make an unfamiliar agent protocol easier to remember.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/naruto-mcp.mp4",
      poster: "/discovery/naruto-mcp.jpg",
      durationLabel: "63 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "yugioh-compilers",
    status: "published",
    order: 8,
    brand: "Developer Education",
    title: "Compilers, explained by Yu-Gi-Oh!",
    curatorNote: "A second story world proves the lesson structure travels without changing the Format.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/yugioh-compilers.mp4",
      poster: "/discovery/yugioh-compilers.jpg",
      durationLabel: "64 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "danny-phantom-apis",
    status: "published",
    order: 9,
    brand: "Developer Education",
    title: "APIs, explained by Danny Phantom",
    curatorNote: "A ghost portal turns an invisible software handoff into a story people can follow.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/danny-apis.mp4",
      poster: "/discovery/danny-apis.jpg",
      durationLabel: "70 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "naruto-apis",
    status: "published",
    order: 10,
    brand: "Developer Education",
    title: "APIs, explained by Naruto",
    curatorNote: "A familiar mission makes software requests and responses easy to remember.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/naruto-apis.mp4",
      poster: "/discovery/naruto-apis.jpg",
      durationLabel: "68 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "spongebob-evs",
    status: "published",
    order: 11,
    brand: "Consumer Education",
    title: "Electric vehicles, explained by SpongeBob",
    curatorNote: "A playful world carries the comparison without turning it into a lecture.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/spongebob-evs.mp4",
      poster: "/discovery/spongebob-evs.jpg",
      durationLabel: "62 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "davids-cookies-this-is-fine",
    status: "published",
    order: 12,
    brand: "David's Cookies",
    title: "The birthday is tomorrow",
    curatorNote: "A familiar panic becomes a simple reason to send cookies now.",
    goal: "entertain",
    media: {
      kind: "image",
      src: "/discovery/meme/davids-cookies-this-is-fine.png",
      durationLabel: "Static",
    },
    format: {
      slug: "meme",
      name: "Meme",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "hybrid-news-founder-moment",
    status: "published",
    order: 13,
    brand: "Founder-led",
    title: "Turn the announcement into the ad",
    curatorNote: "One real event becomes a clear story with a strong visual hierarchy.",
    goal: "story",
    media: {
      kind: "image",
      src: "/maker-fixtures/hybrid-news/reference.png",
      durationLabel: "Static",
    },
    format: {
      slug: "hybrid-news",
      name: "Hybrid News",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "newsletter-writer-holden-history",
    status: "published",
    order: 13.5,
    brand: "Holden Brand",
    title: "What nearly five decades should buy you",
    curatorNote:
      "A parking-garage origin becomes a grounded reason to choose the experienced, hands-on partner.",
    goal: "story",
    media: {
      kind: "image",
      src: "/discovery/newsletter-writer/holden-brand-history.png",
      durationLabel: "Email",
    },
    format: {
      slug: "newsletter-writer",
      name: "Newsletter Writer",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  ...fortniteFilterDiscoveryEntries,
  {
    id: "cinematic-photographer-source",
    status: "published",
    order: 16,
    brand: "Editorial portrait",
    title: "The camera becomes part of the character",
    curatorNote: "Low-key lighting, tactile grain, and crisp camera anatomy turn a simple portrait concept into an editorial frame.",
    goal: "entertain",
    media: {
      kind: "image",
      src: "/format-repositories/cinematic-photographer-v1/assets/source/example-output.png",
      referenceSrc: "/format-repositories/cinematic-photographer-v1/assets/source/style-reference.jpg",
      durationLabel: "Static",
    },
    format: {
      slug: "cinematic-photographer",
      name: "Cinematic Photographer",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "gta-vi-source",
    status: "published",
    order: 17,
    brand: "Portrait transformation",
    title: "Vice City at street level",
    curatorNote: "A recognizable subject sits inside a warm, neon, rain-slicked open-world frame without falling into cartoon styling.",
    goal: "entertain",
    media: {
      kind: "image",
      src: "/format-repositories/gta-vi-v1/assets/source/example-output.png",
      referenceSrc: "/format-repositories/gta-vi-v1/assets/source/reference-input.jpg",
      durationLabel: "Static",
    },
    format: {
      slug: "gta-vi",
      name: "GTA VI",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  ...productPhotoshootDiscoveryEntries,
  ...selfieNineDiscoveryEntries,
  ...ragDollDiscoveryEntries,
  ...moodNotesDiscoveryEntries,
  ...redDeadRedemptionDiscoveryEntries,
  ...oldMoneyShotDiscoveryEntries,
  ...chromeVoidDiscoveryEntries,
  ...ccdJpegFilterDiscoveryEntries,
  ...passportClickDiscoveryEntries,
  ...fakeItTillYouMakeItDiscoveryEntries,
  ...darkStudioPortraitDiscoveryEntries,
  ...bluePhosphorDiscoveryEntries,
  ...databaseFormatDiscoveryEntries.filter((entry) => entry.format.slug !== "motion-story"),
  ...jingleDiscoveryEntries,
  ...videoMemeDiscoveryEntries,
];

export type DiscoveryShelf = {
  id: string;
  title: string;
  description: string;
  entries: DiscoveryEntry[];
};

const discoveryShelfDefinitions = [
  {
    id: "product-stories",
    title: "Product Stories in Motion",
    description: "3D product stories and compact performance ads.",
    formats: ["three-d-breakdown"],
  },
  {
    id: "product-photoshoots",
    title: "Product Photoshoots",
    description: "One real product turned into a complete campaign-ready image set.",
    formats: ["product-photoshoot"],
  },
  {
    id: "brand-jingles",
    title: "Songs People Remember",
    description: "Brand jingles built around one sharp buyer truth.",
    formats: ["jingle"],
  },
  {
    id: "video-memes",
    title: "Video Memes",
    description: "Familiar clips carrying brand-specific buyer truths.",
    formats: ["video-meme"],
  },
  {
    id: "brainrot",
    title: "Brainrot Ads",
    description: "Fast dialogue and chaos built to hold attention.",
    formats: ["brainrot"],
  },
  {
    id: "character-explainers",
    title: "Explain It With Characters",
    description: "Familiar characters make hard ideas easy to follow.",
    formats: ["otaku-explainer"],
  },
  {
    id: "customer-proof",
    title: "Customer Proof",
    description: "Reviews and proof-led formats that build trust.",
    formats: ["reviews", "were-sorry"],
  },
  {
    id: "conversations",
    title: "Conversations That Sell",
    description: "Messages and voice-led pitches that feel native.",
    formats: ["text-message", "visualizer"],
  },
  {
    id: "written-content",
    title: "Words People Want to Read",
    description: "Brand-voice writing grounded in real company proof.",
    formats: ["newsletter-writer"],
  },
  {
    id: "skai-generated",
    title: "SKAI Image Transformations",
    description: "Image prompts gathered from @skaigenerated and packaged as runnable Wiggly Formats.",
    formats: [
      "fortnite-filter",
      "cinematic-photographer",
      "gta-vi",
      "selfie-nine-images",
      "rag-doll",
      "mood-notes",
      "red-dead-redemption",
      "old-money-shot",
      "chrome-void",
      "ccd-jpeg-filter",
      "passport-click",
      "fake-it-till-you-make-it",
      "dark-studio-portrait",
      "blue-phosphor",
    ],
  },
  {
    id: "static-hooks",
    title: "Static Ideas That Land",
    description: "Memes and announcements built to stop the scroll.",
    formats: ["meme", "hybrid-news"],
  },
  {
    id: "more",
    title: "More From Wiggly",
    description: "New experiments that do not have a shelf yet.",
    formats: [],
  },
] as const;

const shelfIdByFormat = new Map<string, string>(
  discoveryShelfDefinitions.flatMap((shelf) => (
    shelf.formats.map((format) => [format, shelf.id] as const)
  )),
);

export function groupDiscoveryEntriesByShelf(entries: DiscoveryEntry[]): DiscoveryShelf[] {
  const buckets = new Map<string, DiscoveryEntry[]>();
  for (const entry of entries) {
    const shelfId = shelfIdByFormat.get(entry.format.slug) || "more";
    const bucket = buckets.get(shelfId) || [];
    bucket.push(entry);
    buckets.set(shelfId, bucket);
  }

  return discoveryShelfDefinitions.flatMap((shelf) => {
    const shelfEntries = buckets.get(shelf.id);
    return shelfEntries?.length
      ? [{
          id: shelf.id,
          title: shelf.title,
          description: shelf.description,
          entries: shelfEntries,
        }]
      : [];
  });
}

export function getPublishedDiscoveryEntries(
  entries: DiscoveryEntry[] = discoveryCatalog,
): DiscoveryEntry[] {
  return entries
    .filter((entry) => entry.status === "published" && entry.showInDiscovery !== false)
    .sort((left, right) => left.order - right.order);
}

export function getPublishedDiscoveryProofEntries(
  entries: DiscoveryEntry[] = discoveryCatalog,
): DiscoveryEntry[] {
  return entries
    .filter((entry) => entry.status === "published")
    .sort((left, right) => left.order - right.order);
}

export function filterDiscoveryEntries(
  entries: DiscoveryEntry[],
  query: string,
  goal: DiscoveryGoal,
): DiscoveryEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return entries.filter((entry) => {
    const matchesGoal = goal === "all" || entry.goal === goal;
    if (!matchesGoal) return false;
    if (!normalizedQuery) return true;

    return [
      entry.brand,
      entry.title,
      entry.format.name,
      entry.format.owner,
      entry.curatorNote,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function getDiscoveryEntryById(id: string): DiscoveryEntry | undefined {
  return getPublishedDiscoveryProofEntries().find((entry) => entry.id === id);
}

export function getDiscoveryEntriesByFormat(formatSlug: string): DiscoveryEntry[] {
  return getPublishedDiscoveryProofEntries().filter((entry) => entry.format.slug === formatSlug);
}

export function getRelatedDiscoveryEntries(entry: DiscoveryEntry, limit = 3): DiscoveryEntry[] {
  return getDiscoveryEntriesByFormat(entry.format.slug)
    .filter((candidate) => candidate.id !== entry.id)
    .slice(0, limit);
}
