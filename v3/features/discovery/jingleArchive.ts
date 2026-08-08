import type { DiscoveryEntry } from "./types";

type JingleArchiveRow = readonly [
  storageId: string,
  brand: string,
  title: string,
  source: string,
];

const jingleArchiveRows: JingleArchiveRow[] = [
  ["kg278k580zevmx8xarhj46zvwn8avjtc", "OGTool", "Stop paying for ads that just fade", "https://wry-viper-639.convex.cloud/api/storage/96bd8f9c-672f-42ef-adb2-49e874adcfaa"],
  ["kg2fn85bh4ramd2zzt8ncs7n1n8aw950", "OGTool", "Stop paying for ads that just die", "https://wry-viper-639.convex.cloud/api/storage/222f1e4e-5098-49c1-8112-e9dd9455afb1"],
  ["kg22w6zdd8rcnkdbjbfgrg44ex89tnyz", "CarEdge", "CarEdge got me, no more showroom stress", "https://wry-viper-639.convex.cloud/api/storage/57494682-8e25-412b-9108-fc4554a361e5"],
  ["kg2dtsnzgeeg5gt6p387xrc56189rk8e", "Apple", "Apple, Apple, feel the power now", "https://wry-viper-639.convex.cloud/api/storage/5ddb7f11-acc6-41ce-b7a0-b0942a9f24ff"],
  ["kg222v2mh7dc4kga0nz9bmx0x589rqpf", "Apple", "Apple magic, all in one place", "/homepage/jingles/apple-all-in-one-place.mp3"],
  ["kg268kjnhetapdt26pg7td6hsx89r77b", "Apple", "Apple cuts the noise", "https://wry-viper-639.convex.cloud/api/storage/6a5209d8-3f23-4af1-a275-163078f48084"],
  ["kg273s21bmvp63tck89g9ek95x89rxw2", "Apple", "Apple moves, never stall", "https://wry-viper-639.convex.cloud/api/storage/44ddc613-71ef-4863-9676-c7b77367952b"],
  ["kg24p87kec4zeyrkcgjw4wx7t589r8d8", "Health-Ade", "Bubbles in my cup, feel the fizz activate", "https://wry-viper-639.convex.cloud/api/storage/52bb11c0-01eb-4f24-9d60-9d7cb26dffda"],
  ["kg29nrfcxrmx5wj1fx78576c4s89sv68", "Health-Ade", "Health-Ade gut glow up", "https://wry-viper-639.convex.cloud/api/storage/704ad392-5655-4022-8bf7-1184b3174cc3"],
  ["kg20d5581aftxzpx8r1y496y7989rst0", "Health-Ade", "Belly feels right with that Health-Ade", "https://wry-viper-639.convex.cloud/api/storage/2ffc2427-6f90-458d-be16-00fe7be8a940"],
  ["kg2fwak6weaa1hkv1yknmxrbnd89sbvd", "Health-Ade", "Health-Ade, belly got paid", "https://wry-viper-639.convex.cloud/api/storage/6014bbd5-739a-4ea8-b882-1163a595dd93"],
  ["kg24zjxwm27z4ch0fdx8fzejkd89set5", "Health-Ade", "Health-Ade gut it up", "https://wry-viper-639.convex.cloud/api/storage/e9e86574-86bc-443a-b070-d3137e05f6f8"],
  ["kg229tq775107rwv52kzyjz1e589st4r", "OGTool", "Oh Gee Tool, we don't pay for views", "https://wry-viper-639.convex.cloud/api/storage/be08a129-11dd-4de4-9755-9eaa0973562a"],
  ["kg22kkwjqstphkd61c8d7cgjv989sc51", "OGTool", "Oh Gee Tool turns the paid to the found", "https://wry-viper-639.convex.cloud/api/storage/4db3bfbb-5a51-4b96-b2f2-3485af9e4eaa"],
  ["kg2cy20aqzfzdkvsedt1s9hm9n89rwyx", "David's Cookies", "David's Cookies, fresh and right", "https://wry-viper-639.convex.cloud/api/storage/91f530d7-21aa-4928-b452-d2877ca0c2ed"],
  ["kg2f0tfjqjnyq17vk672rt5qsd89nrvm", "David's Cookies", "Fresh baked and ready, no oven required", "https://wry-viper-639.convex.cloud/api/storage/a177fa94-5c1b-4a88-908c-93a12d6399d3"],
  ["kg2apfrgqwkrfcssx1ww55cdf589n6xd", "Plato Group AI", "Plato AI, we automate", "https://wry-viper-639.convex.cloud/api/storage/6f721634-667f-49e3-9237-c439c3899312"],
  ["kg27aqwr2z2j1h3nhmapq5gdfs89jp2b", "David's Cookies", "David's Cookies, fresh and right (alt)", "https://wry-viper-639.convex.cloud/api/storage/bb4f00e5-b4f4-4e18-8472-0e7eb2e7a9bd"],
  ["kg210rcbr7byjzmsk3dckyc68n89j70z", "OGTool", "Oh Gee Tool, we don't pay for views (alt)", "https://wry-viper-639.convex.cloud/api/storage/548ac264-ad5a-4bd6-93fe-6f69a3a18130"],
  ["kg2e29aq1r214rdcj8c7qdmc8189kfmc", "OGTool", "Oh Gee Tool, we break the old rules", "/homepage/jingles/ogtool-break-the-rules.mp3"],
  ["kg25y2hcc0zkh8xsay8zppkkkn89k7km", "David's Cookies", "Fresh baked, no fake, that's the move", "https://wry-viper-639.convex.cloud/api/storage/f7f0fbc6-a4c8-4d5a-9fde-3f15fa33f9b2"],
  ["kg24pezp5gnte6max74wvtwn5h89kmjx", "David's Cookies", "Need a gift that hits, no time to bake?", "/homepage/jingles/davids-no-time-to-bake.mp3"],
  ["kg2fjfm8w98ndpd6h1z7kjyqx589ep7k", "David's Cookies", "David's Cookies, fresh from the oven", "https://wry-viper-639.convex.cloud/api/storage/aefe4244-0fea-44c5-a37e-b1bc1dddcd99"],
  ["kg2bszv1f6th1q0y4tmxwqkga589f9zn", "David's Cookies", "Fresh-baked delivery, no stress", "https://wry-viper-639.convex.cloud/api/storage/764b1b4d-9c25-4a25-8e85-bee6a407fc6b"],
  ["kg2ep7vhfs9q9cgw3kfann8kgn89e9ja", "David's Cookies", "Fresh from the oven, straight to your door", "https://wry-viper-639.convex.cloud/api/storage/a608ed68-1e2d-49fc-90cb-afed2e3bef4f"],
  ["kg23dkybfkeg0qm37yn9ra4c5s89fy65", "David's Cookies", "Fresh from the oven, straight to the door", "https://wry-viper-639.convex.cloud/api/storage/ecef6b58-0e15-432a-86d5-9d0d14e876cb"],
  ["kg256yap2qfmqdxp9wckr3881989c5y5", "David's Cookies", "Fresh from the oven, straight to the door (alt)", "https://wry-viper-639.convex.cloud/api/storage/ef553465-6a68-4265-9f07-93a0e8c5b2ae"],
  ["kg2err00maer9ynj81ckzzmknn890ma6", "David's Cookies", "David's Cookies, yeah we end that drought", "https://wry-viper-639.convex.cloud/api/storage/d18d3354-8742-48e0-8ee5-2fd3eb888fbe"],
  ["kg2axzcnqah1shwv61epphpc6x891pvw", "Gymshark", "Gymshark got it", "https://wry-viper-639.convex.cloud/api/storage/a2a74072-cac8-4251-8fed-73076cfa5fdd"],
  ["kg2ewry28zaafdbwybbt7pt44x890e7a", "Gymshark", "Gymshark, we don't do worn out", "https://wry-viper-639.convex.cloud/api/storage/e9fd9fb7-0308-4ff0-89a6-18c987981665"],
  ["kg238zcb62hwq722jnpdd5twhs88v3bt", "Nexrage Studios", "Nexrage, ship it fast, no wait", "https://wry-viper-639.convex.cloud/api/storage/34bf909a-cdc9-446a-a55e-25a69a8e7995"],
  ["kg263p99h70x77jmtgpgxrr2zx88zs25", "Opensteer", "Own your stack, no cloud attack", "https://wry-viper-639.convex.cloud/api/storage/c1f84ad8-bc0c-4e13-998b-aa0986bc49e4"],
  ["kg2fn8hqcsh462p7pgq3zkrn4588wmxj", "David's Cookies", "Not that stale aisle life", "https://wry-viper-639.convex.cloud/api/storage/bb77a635-f509-4d09-a79a-9a5c6fca7a13"],
  ["kg261q8fn8788a5ak7pd5qbg3588v51j", "Agent Enamel", "Agent Enamel, pick up the line", "https://wry-viper-639.convex.cloud/api/storage/cbc6ec7b-a9a2-499e-a544-ad1b9e5b7909"],
  ["kg2f92p41zpmzyhk74rbkgzwr188vp5q", "Agent Enamel", "Agent Enamel, pick it up", "https://wry-viper-639.convex.cloud/api/storage/f5222839-4c7d-4211-9244-15d9fb6618dc"],
  ["kg20vdnn1kxkqyrqztjze78d5n88tepr", "Dynamic EcoHome", "Dynamic Eco Home", "https://wry-viper-639.convex.cloud/api/storage/a2f93749-a3dc-42a7-80dd-1dc6bf0edea3"],
  ["kg27ht53cjk29yqg6fmcdpw71x88vthb", "OGTool", "Oh Gee Tool, we rank and we rule", "https://wry-viper-639.convex.cloud/api/storage/d427ad7b-2825-4c97-a385-00e78f3d0eb1"],
  ["kg20947ddbb3gs8v7301m2qcnx88vbah", "David's Cookies", "David's Cookies, fresh and right (early)", "https://wry-viper-639.convex.cloud/api/storage/d9729c7c-5a89-4a2c-8844-3a8d808b0372"],
  ["kg2a2cxgdp0mamppqyb0wwsvqh88ta91", "OGTool", "Oh Gee Tool, we break the rule", "https://wry-viper-639.convex.cloud/api/storage/6da4fb0d-9264-486b-853e-5ff7ec82c128"],
];

const brandAccents: Record<string, string> = {
  "Agent Enamel": "#6ee7f9",
  Apple: "#2997ff",
  CarEdge: "#ff5a36",
  "David's Cookies": "#d6001c",
  "Dynamic EcoHome": "#34d399",
  Gymshark: "#c4ff32",
  "Health-Ade": "#ff7a59",
  "Nexrage Studios": "#a78bfa",
  OGTool: "#52d6ff",
  Opensteer: "#facc15",
  "Plato Group AI": "#fb7185",
};

const featuredOrders: Record<string, number> = {
  kg222v2mh7dc4kga0nz9bmx0x589rqpf: 5.5,
  kg24pezp5gnte6max74wvtwn5h89kmjx: 8.5,
  kg2e29aq1r214rdcj8c7qdmc8189kfmc: 11.5,
};

const featuredStorageIdByBrand: Record<string, string> = {
  Apple: "kg222v2mh7dc4kga0nz9bmx0x589rqpf",
  "David's Cookies": "kg24pezp5gnte6max74wvtwn5h89kmjx",
  OGTool: "kg2e29aq1r214rdcj8c7qdmc8189kfmc",
};

export const jingleDiscoveryEntries: DiscoveryEntry[] = jingleArchiveRows.map((
  [storageId, brand, title, source],
  index,
) => ({
  id: `jingle-${storageId}`,
  status: "published",
  showInDiscovery: storageId === (
    featuredStorageIdByBrand[brand]
      || jingleArchiveRows.find(([, candidateBrand]) => candidateBrand === brand)?.[0]
  ),
  order: featuredOrders[storageId] || 100 + index,
  brand,
  title,
  curatorNote: "A finished Wiggly jingle that turns one buyer truth into a repeatable hook.",
  goal: "entertain",
  media: {
    kind: "audio",
    src: source,
    durationLabel: "20 sec",
    accentColor: brandAccents[brand] || "#7c5cff",
  },
  format: {
    slug: "jingle",
    name: "Brand Jingle",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));
