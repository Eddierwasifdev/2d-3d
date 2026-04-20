import puter from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";

// ── Helpers ──────────────────────────────────────────────────────────────────
export class PaymentRequiredError extends Error {
    usage: number;
    limit: number;
    constructor(usage: number, limit: number) {
        super("Free tier limit reached. Please upgrade to continue.");
        this.name = "PaymentRequiredError";
        this.usage = usage;
        this.limit = limit;
    }
}

export const fetchAsDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// ── AI Generation ─────────────────────────────────────────────────────────────
// Now calls the worker backend — which enforces the usage limit
export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
    if (!PUTER_WORKER_URL) throw new Error("Missing VITE_PUTER_WORKER_URL");

    const dataUrl = sourceImage.startsWith("data:")
        ? sourceImage
        : await fetchAsDataUrl(sourceImage);

    const base64Data = dataUrl.split(",")[1];
    const mimeType   = dataUrl.split(";")[0].split(":")[1];

    if (!mimeType || !base64Data) throw new Error("Invalid source image payload");

    const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/ai/generate`, {
        method: "POST",
        body: JSON.stringify({ base64Data, mimeType }),
    });

    // Payment required
    if (response.status === 402) {
        const data = await response.json();
        throw new PaymentRequiredError(data.usage ?? 0, data.limit ?? 1);
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "AI generation failed");
    }

    const data = await response.json();
    return {
        renderedImage: data.renderedImage ?? null,
        renderedPath: undefined as string | undefined,
    };
};
