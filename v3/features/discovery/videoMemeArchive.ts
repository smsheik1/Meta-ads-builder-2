import type { DiscoveryEntry } from "./types";

type VideoMemeArchiveRow = readonly [
  renderJobId: string,
  brand: string,
  title: string,
  templateId: "bear-sniff" | "pingu-noot-noot",
  durationSeconds: number,
  source: string,
];

const videoMemeArchiveRows: VideoMemeArchiveRow[] = [
  ["jh78d2tc48nn7khhcx3sy85j2n8b85hn", "David's Cookies", "This bear sniffs people who hide the delivery tin before the office birthday party.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/fab62804-e487-4ebf-8a33-76893cb84adc"],
  ["jh71n5483wrjk6240wrwryqkc18b8gj1", "CarEdge", "This bear sniffs people who pretend they have another dealer offer to get a better price.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/ee1b0b30-b4bf-4097-8d5a-a3f8191c5317"],
  ["jh7drksv102wk9emt63332vayd8b82t2", "CarEdge", "This bear sniffs people who spend three hours trying to find the invoice price online.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/7fbd82bf-ff2d-4090-855b-3e7832fbaba9"],
  ["jh7etz6bszh28k4pbh723vhkbx8b872m", "CarEdge", "This bear sniffs people who use fake names on car quote forms to dodge the spam calls.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/9adf386e-b7d8-4ecc-9a3c-d87a43d4297e"],
  ["jh7fg803khxgy6vb5hnzw3m3hn8b8r6m", "David's Cookies", "This bear sniffs parents who buy 54 cookies for the bake sale.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/bf34ee5f-fed8-4d24-a5c7-df7b9dec1162"],
  ["jh7f1akk7rwdsqxedhnmtza76d8b9vbs", "David's Cookies", "This bear sniffs people who send thank-you gifts because they forgot to say it.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/05c96abf-84b2-4d5f-bb01-6592009fbc3b"],
  ["jh7f21509km9tywd3eyt6e5a498b9msf", "David's Cookies", "This bear sniffs people who claim they baked the tin they had delivered.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/91ec3b0c-5b45-47f8-a664-4e88daeea1cb"],
  ["jh7a9cx270t6p93gagrv20raas8b9rrj", "David's Cookies", "This bear sniffs people who forgot to mail a thank-you gift until three weeks later.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/89b68139-4e14-446c-983b-15247cb258d9"],
  ["jh77fryp4em273qgtj84k1rd258b9n6f", "David's Cookies", "This bear sniffs people who claim they baked the dinner party dessert themselves.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/b71f2591-4794-495a-bf4a-bc429e05e55b"],
  ["jh73gzxvze0q1yex7130b8snc98b9ns0", "Official LEGO® Shop US", "This bear sniffs adults who buy complex models just to put them on a high shelf.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/d86a9a7c-f736-4741-bd41-ef3b8dc8af61"],
  ["jh78hfaemavy591y0kftep5z158b8g6d", "David's Cookies", "This bear sniffs people who claim they baked the office birthday cookies from scratch.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/9593a6d7-d550-4c04-91ba-d1abd30adbf9"],
  ["jh78tr304psk86r5njkvmqn8zx8b8w8p", "Official LEGO® Shop US", "This bear sniffs parents who spent three hours scrolling and still did not pick a gift.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/066316e4-13e6-452e-9fc5-7600f05652c6"],
  ["jh79yd5x3c40f43djy5tq1vng58b9ssy", "Official LEGO® Shop US", "This bear sniffs people who waited too long to buy the display set they wanted.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/7396fbee-6096-4153-8de7-e317a4f78b64"],
  ["jh75teyf1nq5rnscd4f0ykz4f18b9t1f", "Official LEGO® Shop US", "This bear sniffs adults buying sports sets for their own office desk", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/6b9be354-7206-4182-9610-037234b2c5ce"],
  ["jh7e2wekqagrf48ms3y23geww98b9xgh", "Official LEGO® Shop US", "This bear sniffs people who only want a set because it is retiring soon", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/cc432f17-37c3-45ca-857c-6f851271ff04"],
  ["jh76qdfv62y7a0z2hwep7dbn998b9jgp", "Official LEGO® Shop US", "This bear sniffs adults hiding the price of their display models", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/b37d0e6b-365b-4815-87f5-290490cf88ca"],
  ["jh70wm12sb8ysgx60a4atavdzs8b88tq", "Official LEGO® Shop US", "This bear sniffs parents buying a toy purely for developmental milestones", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/a0cd6fa2-739e-4172-bc8a-c145596d8f0d"],
  ["jh79fx71jwevqdwh6epmf7kp6h8b8y6a", "Official LEGO® Shop US", "This bear sniffs F1 fans waiting for a specific race car to drop", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/6ef8fbfd-9404-440b-a744-286271d723b8"],
  ["jh7d78cjr6yz1fc4kwa838zza18b9g99", "Official LEGO® Shop US", "This bear sniffs parents terrified of buying the wrong gift", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/f98b6220-d7b4-4e02-a36b-21ff344f7270"],
  ["jh7ct2gw0fy6gant2cg0m7dhe98b98em", "Official LEGO® Shop US", "This bear sniffs people refreshing the retiring soon list instead of working", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/0f210227-64f7-480e-92ef-92b3999b1c00"],
  ["jh769kft6qkw3qjdgam65qpkph8b82nw", "Official LEGO® Shop US", "This bear sniffs adults buying a set for themselves but saying it is for the kids", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/fe13f743-55ec-4ce7-91df-cde8817fab8e"],
  ["jh79h0wgrk7f3g6am1vcwbrn258b9nr8", "David's Cookies", "This bear sniffs parents who claim they spent all night baking for the school event.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/ecff9576-5638-4b81-b989-89a2efb0a603"],
  ["jh751w2w3fsem93g1eeqrve6jh8b9y4z", "David's Cookies", "This bear sniffs people who wait to send a thank you text until the dessert arrives.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/79d46f72-b153-42eb-b022-e3ff4fc19803"],
  ["jh7cbbkcaj81jgrwy2ayxajw6h8b9kma", "OGTool", "This bear sniffs people asking ChatGPT for product recs to check if they are listed.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/903979f2-e7de-4124-b3fd-e37ce465e110"],
  ["jh7acna2jbgfrfw193fg2745998b8s3v", "Official LEGO® Shop US", "the instruction manual is in the wrong language", "pingu-noot-noot", 8.5, "https://wry-viper-639.convex.cloud/api/storage/d90e6e31-0963-486f-a5db-018021e76542"],
  ["jh7dp531p13z60gfz114hf0ec98b9qxc", "OGTool", "This bear sniffs people checking an SEO dashboard for actual sales data.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/b6d312d8-bfb5-436c-919c-bf370f91e0e0"],
  ["jh7bpwnegrm1yq68dn0eta26dh8b89j9", "OGTool", "This bear sniffs people paying seven dollars a click for flat conversion rates.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/4c59e512-e768-4073-84fc-c5c85fb31655"],
  ["jh71v7zfnhq7afyksgrqk5hds98b8dbp", "Official LEGO® Shop US", "the box has a crushed corner", "pingu-noot-noot", 8.5, "https://wry-viper-639.convex.cloud/api/storage/35dfdaa5-3893-4225-b957-ef1e51e38dcb"],
  ["jh7c9e6dp3r5rbzcasqp9jm2118b9gwh", "Official LEGO® Shop US", "he only wants the one piece that is not in this box", "pingu-noot-noot", 8.5, "https://wry-viper-639.convex.cloud/api/storage/fc570120-5371-467e-8d15-ebd7b610e6f8"],
  ["jh7axxznpw4xcj1b6gj29gjffh8b94pk", "Official LEGO® Shop US", "This bear sniffs people who hide their exclusive display sets from houseguests.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/d5897fa7-3e1b-4272-a326-913793a7fef0"],
  ["jh7drgwgkje0jny00zbhev49bh8b8csk", "Official LEGO® Shop US", "This bear sniffs collectors who refresh the page before a favorite set disappears.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/deabd424-fd04-4a7d-84b0-8009e57c4b9e"],
  ["jh76110skgk8c4fgfyje36046h8b807j", "Official LEGO® Shop US", "This bear sniffs parents who stare blankly at a screen full of gift options.", "bear-sniff", 8, "https://wry-viper-639.convex.cloud/api/storage/cf544f06-60e0-4827-a34f-092d667e3f16"],
];

const canonicalVideoMemeEntries: DiscoveryEntry[] = [
  {
    id: "video-meme-bear-secret",
    status: "published",
    order: 16,
    brand: "David's Cookies",
    title: "The bear that catches fake bakers",
    curatorNote: "A guilty buyer behavior becomes funny the instant the bear appears.",
    goal: "entertain",
    media: {
      kind: "video",
      src: "/format-repositories/video-meme-v1/goldens/bear-secret.mp4",
      poster: "/discovery/video-meme-templates/bear-secret.jpg",
      durationLabel: "8 sec",
    },
    format: {
      slug: "video-meme",
      name: "Video Meme",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "video-meme-pingu-reversal",
    status: "published",
    order: 17,
    brand: "LEGO",
    title: "Noot Noot ruins the finished build",
    curatorNote: "A calm setup gets undercut by one exact post-purchase fear.",
    goal: "entertain",
    media: {
      kind: "video",
      src: "/format-repositories/video-meme-v1/goldens/pingu-reversal.mp4",
      poster: "/discovery/video-meme-templates/pingu-reversal.jpg",
      durationLabel: "8 sec",
    },
    format: {
      slug: "video-meme",
      name: "Video Meme",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "video-meme-darwin-pain-stack",
    status: "published",
    order: 18,
    brand: "Agent Enamel",
    title: "The front-desk pain stack",
    curatorNote: "Darwin stays calm while one painfully specific workday keeps getting worse.",
    goal: "entertain",
    media: {
      kind: "video",
      src: "/format-repositories/video-meme-v1/goldens/darwin-pain-stack.mp4",
      poster: "/discovery/video-meme-templates/darwin-pain-stack.jpg",
      durationLabel: "8 sec",
    },
    format: {
      slug: "video-meme",
      name: "Video Meme",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
];

const importedVideoMemeEntries: DiscoveryEntry[] = videoMemeArchiveRows.map((
  [renderJobId, storedBrand, title, templateId, durationSeconds, source],
  index,
) => ({
  id: `video-meme-${renderJobId}`,
  status: "published",
  showInDiscovery: false,
  order: 100.5 + index,
  brand: storedBrand === "Official LEGO® Shop US" ? "LEGO" : storedBrand,
  title,
  curatorNote: templateId === "pingu-noot-noot"
    ? "A calm setup flips into the exact post-purchase fear."
    : "A brand-specific buyer truth lands inside a familiar reaction clip.",
  goal: "entertain",
  media: {
    kind: "video",
    src: source,
    poster: `/discovery/video-memes/${renderJobId}.jpg`,
    durationLabel: `${durationSeconds} sec`,
  },
  format: {
    slug: "video-meme",
    name: "Video Meme",
    version: "1.0.0",
    owner: "Wiggly Studio",
  },
}));

export const videoMemeDiscoveryEntries: DiscoveryEntry[] = [
  ...canonicalVideoMemeEntries,
  ...importedVideoMemeEntries,
];
