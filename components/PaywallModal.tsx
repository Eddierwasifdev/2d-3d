import { useState } from "react";
import { Sparkles, X, Check, Loader } from "lucide-react";
import { createCheckoutSession } from "../lib/puter.action";

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MONTHLY_PRICE = 10;
const YEARLY_PRICE  = 100;
const YEARLY_SAVINGS = (MONTHLY_PRICE * 12) - YEARLY_PRICE;

const FEATURES = [
    "Unlimited 3D visualizations",
    "High-resolution renders",
    "Project history & gallery",
    "Priority AI processing",
    "Export & sharing tools",
];

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
    const [isLoading, setIsLoading]       = useState(false);
    const [error, setError]               = useState<string | null>(null);

    if (!isOpen) return null;

    const handleUpgrade = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const url = await createCheckoutSession(selectedPlan);
            if (url) {
                window.open(url, "_blank");
            } else {
                setError("Could not create checkout session. Please try again.");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="paywall-overlay" onClick={onClose}>
            <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close */}
                <button className="paywall-close" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="paywall-header">
                    <div className="paywall-icon">
                        <Sparkles size={24} />
                    </div>
                    <h2>You've used your free render</h2>
                    <p>Upgrade to Pro to continue visualizing your spaces with AI — unlimited renders, anytime.</p>
                </div>

                {/* Plan Toggle */}
                <div className="plan-toggle">
                    <button
                        className={`plan-tab ${selectedPlan === "monthly" ? "active" : ""}`}
                        onClick={() => setSelectedPlan("monthly")}
                    >
                        Monthly
                    </button>
                    <button
                        className={`plan-tab ${selectedPlan === "yearly" ? "active" : ""}`}
                        onClick={() => setSelectedPlan("yearly")}
                    >
                        Yearly
                        <span className="plan-badge">Save ${YEARLY_SAVINGS}</span>
                    </button>
                </div>

                {/* Pricing */}
                <div className="plan-pricing">
                    {selectedPlan === "monthly" ? (
                        <>
                            <span className="plan-price">${MONTHLY_PRICE}</span>
                            <span className="plan-period">/ month</span>
                        </>
                    ) : (
                        <>
                            <span className="plan-price">${(YEARLY_PRICE / 12).toFixed(2)}</span>
                            <span className="plan-period">/ month</span>
                            <span className="plan-billed">Billed ${YEARLY_PRICE}/year</span>
                        </>
                    )}
                </div>

                {/* Features */}
                <ul className="plan-features">
                    {FEATURES.map((feat) => (
                        <li key={feat}>
                            <Check size={16} className="plan-check" />
                            {feat}
                        </li>
                    ))}
                </ul>

                {/* Error */}
                {error && <p className="paywall-error">{error}</p>}

                {/* CTA */}
                <button
                    className="paywall-cta"
                    onClick={handleUpgrade}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <><Loader size={18} className="spin" /> Redirecting to checkout…</>
                    ) : (
                        `Upgrade to Pro — ${selectedPlan === "monthly" ? `$${MONTHLY_PRICE}/mo` : `$${YEARLY_PRICE}/yr`}`
                    )}
                </button>

                <p className="paywall-note">
                    Secure payment via Dodo Payments. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
