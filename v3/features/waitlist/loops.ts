export type WaitlistLoopsFields = {
  email: string;
  source?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  ref?: string;
};

type LoopsFetch = (url: string, init: RequestInit) => Promise<Response>;

const loopsBaseUrl = "https://app.loops.so/api/v1";

function loopsHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function sendLoopsJson(fetcher: LoopsFetch, apiKey: string, path: string, method: "POST" | "PUT", body: unknown) {
  const response = await fetcher(`${loopsBaseUrl}${path}`, {
    method,
    headers: loopsHeaders(apiKey),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok || payload.success === false) {
    const message = payload.message || payload.error || text || "Unknown Loops error";
    throw new Error(`Loops sync failed (${response.status}): ${message}`);
  }
}

export async function syncWaitlistSignupToLoops(fields: WaitlistLoopsFields, {
  apiKey,
  fetcher = fetch,
}: {
  apiKey?: string;
  fetcher?: LoopsFetch;
}) {
  if (!apiKey) throw new Error("Loops is not configured. Add LOOPS_API_KEY, then try again.");

  await sendLoopsJson(fetcher, apiKey, "/contacts/update", "PUT", {
    email: fields.email,
    userGroup: "early-access",
    source: fields.source,
    referrer: fields.referrer,
    utmSource: fields.utmSource,
    utmMedium: fields.utmMedium,
    utmCampaign: fields.utmCampaign,
    utmContent: fields.utmContent,
    ref: fields.ref,
  });

  await sendLoopsJson(fetcher, apiKey, "/events/send", "POST", {
    email: fields.email,
    eventName: "waitlist_signup",
  });
}
