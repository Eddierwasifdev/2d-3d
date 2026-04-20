// ──────────────────────────────────────────────────────────────────────────────
// Roomify Puter Worker — Backend API
// ──────────────────────────────────────────────────────────────────────────────
import DodoPayments from "dodopayments";
import { Webhook } from "standardwebhooks";

// ── Config ───────────────────────────────────────────────────────────────────
const PROJECT_PREFIX    = "roomify_project_";
const USAGE_PREFIX      = "roomify_usage_";
const SUB_PREFIX        = "roomify_sub_";
const FREE_TIER_LIMIT   = 1;

const DODO_API_KEY       = env.DODO_API_KEY       || "";
const DODO_WEBHOOK_SECRET = env.DODO_WEBHOOK_SECRET || "";

// Plans (fill in real product IDs from Dodo dashboard later)
const PLANS = {
    monthly: { productId: "prod_monthly_placeholder", price: 1000, currency: "usd", label: "Pro Monthly" },
    yearly:  { productId: "prod_yearly_placeholder",  price: 10000, currency: "usd", label: "Pro Yearly"  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const jsonOk = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

const jsonError = (status, message, extra = {}) =>
    new Response(JSON.stringify({ error: message, ...extra }), {
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();
        return user?.uuid || null;
    } catch {
        return null;
    }
};

const getUsage = async (userPuter, userId) => {
    const key = `${USAGE_PREFIX}${userId}`;
    const raw = await userPuter.kv.get(key);
    return typeof raw === "number" ? raw : 0;
};

const incrementUsage = async (userPuter, userId) => {
    const current = await getUsage(userPuter, userId);
    await userPuter.kv.set(`${USAGE_PREFIX}${userId}`, current + 1);
    return current + 1;
};

const getSubscription = async (userPuter, userId) => {
    const key = `${SUB_PREFIX}${userId}`;
    return await userPuter.kv.get(key);
};

const isSubscribed = async (userPuter, userId) => {
    const sub = await getSubscription(userPuter, userId);
    if (!sub || !sub.status || sub.status !== "active") return false;
    if (sub.currentPeriodEnd && Date.now() > sub.currentPeriodEnd) return false;
    return true;
};

// ── 1. Project: Save ─────────────────────────────────────────────────────────
router.post("/api/projects/save", async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, "Authentication failed");

        const body    = await request.json();
        const project = body?.project;

        if (!project?.id || !project?.sourceImage)
            return jsonError(400, "Project ID and source image are required");

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, "Authentication failed");

        const payload = { ...project, updatedAt: new Date().toISOString() };
        await userPuter.kv.set(`${PROJECT_PREFIX}${project.id}`, payload);

        return jsonOk({ saved: true, id: project.id, project: payload });
    } catch (e) {
        return jsonError(500, "Failed to save project", { message: e.message || "Unknown error" });
    }
});

// ── 2. Project: List ─────────────────────────────────────────────────────────
router.get("/api/projects/list", async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, "Authentication failed");

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, "Authentication failed");

        const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
            .map(({ value }) => ({ ...value, isPublic: true }));

        return jsonOk({ projects });
    } catch (e) {
        return jsonError(500, "Failed to list projects", { message: e.message || "Unknown error" });
    }
});

// ── 3. Project: Get by ID ────────────────────────────────────────────────────
router.get("/api/projects/get", async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, "Authentication failed");

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, "Authentication failed");

        const url = new URL(request.url);
        const id  = url.searchParams.get("id");
        if (!id) return jsonError(400, "Project ID is required");

        const project = await userPuter.kv.get(`${PROJECT_PREFIX}${id}`);
        if (!project) return jsonError(404, "Project not found");

        return jsonOk({ project });
    } catch (e) {
        return jsonError(500, "Failed to get project", { message: e.message || "Unknown error" });
    }
});

// ── 4. AI: Generate (Gated by usage/subscription) ────────────────────────────
router.post("/api/ai/generate", async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, "Authentication failed");

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, "Authentication failed");

        // Check if allowed
        const subscribed = await isSubscribed(userPuter, userId);
        if (!subscribed) {
            const usage = await getUsage(userPuter, userId);
            if (usage >= FREE_TIER_LIMIT) {
                return jsonError(402, "Free tier limit reached. Please upgrade to continue.", {
                    code: "PAYMENT_REQUIRED",
                    usage,
                    limit: FREE_TIER_LIMIT,
                });
            }
        }

        // Parse body
        const body = await request.json();
        const { base64Data, mimeType } = body;
        if (!base64Data || !mimeType) return jsonError(400, "base64Data and mimeType are required");

        // Generate using developer's Puter quota
        const prompt = `TASK: Convert the input 2D floor plan into a photorealistic, top-down 3D architectural render. Remove all text labels. Preserve room geometry. Output crisp, realistic materials with natural daylight. No perspective tilt.`;

        const response = await userPuter.ai.txt2img(prompt, {
            provider: "gemini",
            model: "gemini-2.5-flash-image-preview",
            input_image: base64Data,
            input_image_mime_type: mimeType,
            ratio: { w: 1024, h: 1024 },
        });

        const rawImageUrl = response?.src ?? null;
        if (!rawImageUrl) return jsonError(500, "AI generation returned no image");

        // Increment usage only if not subscribed
        if (!subscribed) await incrementUsage(userPuter, userId);

        return jsonOk({ renderedImage: rawImageUrl });
    } catch (e) {
        return jsonError(500, "AI generation failed", { message: e.message || "Unknown error" });
    }
});

// ── 5. Payments: Create Checkout Session ─────────────────────────────────────
router.post("/api/payments/checkout", async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, "Authentication failed");

        const userObj = await userPuter.auth.getUser();
        if (!userObj) return jsonError(401, "Authentication failed");

        const body = await request.json();
        const plan = body?.plan; // "monthly" | "yearly"

        if (!PLANS[plan]) return jsonError(400, "Invalid plan. Choose 'monthly' or 'yearly'.");
        if (!DODO_API_KEY) return jsonError(500, "Dodo Payments not configured.");

        const dodo = new DodoPayments({ bearerToken: DODO_API_KEY });

        const session = await dodo.payments.create({
            billing: {
                city: "",
                country: "US",
                state: "",
                street: "",
                zipcode: "",
            },
            customer: {
                email: userObj.email || `${userObj.uuid}@roomify.app`,
                name: userObj.username || "Roomify User",
            },
            product_cart: [
                {
                    product_id: PLANS[plan].productId,
                    quantity: 1,
                },
            ],
            payment_link: true,
            return_url: `${request.headers.get("origin") || "https://roomify.app"}/billing/success`,
            metadata: {
                userId: userObj.uuid,
                plan,
            },
        });

        return jsonOk({ checkoutUrl: session.payment_link });
    } catch (e) {
        return jsonError(500, "Failed to create checkout session", { message: e.message || "Unknown error" });
    }
});

// ── 6. Webhook: Dodo Payments ────────────────────────────────────────────────
router.post("/api/webhooks/dodo", async ({ request, user }) => {
    try {
        if (!DODO_WEBHOOK_SECRET) return jsonError(500, "Webhook secret not configured.");

        const webhookId        = request.headers.get("webhook-id");
        const webhookSignature = request.headers.get("webhook-signature");
        const webhookTimestamp = request.headers.get("webhook-timestamp");

        const rawBody = await request.text();

        // Verify signature
        const wh = new Webhook(DODO_WEBHOOK_SECRET);
        try {
            wh.verify(rawBody, {
                "webhook-id":        webhookId,
                "webhook-signature": webhookSignature,
                "webhook-timestamp": webhookTimestamp,
            });
        } catch {
            return jsonError(400, "Invalid webhook signature");
        }

        const event = JSON.parse(rawBody);
        const eventType = event?.type;

        if (eventType === "payment.succeeded" || eventType === "subscription.active") {
            const userId = event?.data?.metadata?.userId;
            const plan   = event?.data?.metadata?.plan;

            if (userId) {
                // Store subscription in KV under the developer's context
                // Note: in Puter workers, 'user.puter' is the calling user's context.
                // For global subscription storage, we use the worker's own KV (no user context needed).
                const periodEnd = plan === "yearly"
                    ? Date.now() + 365 * 24 * 60 * 60 * 1000
                    : Date.now() + 30  * 24 * 60 * 60 * 1000;

                // We store subscription data globally keyed by userId.
                // Since the webhook has no user context, we use a global KV write.
                // Puter workers support `kv` without a user context for global writes.
                await kv.set(`${SUB_PREFIX}${userId}`, {
                    status: "active",
                    plan,
                    currentPeriodEnd: periodEnd,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        if (eventType === "subscription.cancelled" || eventType === "subscription.expired") {
            const userId = event?.data?.metadata?.userId;
            if (userId) {
                await kv.set(`${SUB_PREFIX}${userId}`, {
                    status: "cancelled",
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        return jsonOk({ received: true });
    } catch (e) {
        return jsonError(500, "Webhook processing failed", { message: e.message || "Unknown error" });
    }
});

// ── 7. Usage: Get user usage stats ───────────────────────────────────────────
router.get("/api/usage", async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, "Authentication failed");

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, "Authentication failed");

        const usage      = await getUsage(userPuter, userId);
        const subscribed = await isSubscribed(userPuter, userId);
        const sub        = await getSubscription(userPuter, userId);

        return jsonOk({
            usage,
            limit: FREE_TIER_LIMIT,
            isSubscribed: subscribed,
            plan: sub?.plan || null,
            currentPeriodEnd: sub?.currentPeriodEnd || null,
        });
    } catch (e) {
        return jsonError(500, "Failed to get usage", { message: e.message || "Unknown error" });
    }
});
