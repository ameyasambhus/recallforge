import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { PLAN_LABELS, PLAN_LIMITS } from "../../constants/subscription";

import Heatmap from "./Heatmap";

const PLAN_PRICING_PAISE = {
  pro: 9900,
  max: 19900,
};

const PLAN_FEATURES = [
  { id: "free", title: "Free", note: "Great for trying RecallForge" },
  { id: "pro", title: "Pro", note: "For regular focused study" },
  { id: "max", title: "Max", note: "For heavy AI + media usage" },
];

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const formatInr = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const Setting = () => {
  const { userData, logout, getUserData } = useContext(AppContent);
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [confirmationEmail, setConfirmationEmail] = React.useState("");
  const [billingBusyPlan, setBillingBusyPlan] = React.useState("");
  const [pricingPaise, setPricingPaise] = React.useState(PLAN_PRICING_PAISE);

  const activePlan = userData?.subscription?.plan || "free";
  const planExpiresAt = userData?.subscription?.planExpiresAt || null;
  const nextResetAt = userData?.subscription?.nextResetAt || null;
  const aiUsage = userData?.subscription?.aiUsageThisMonth || 0;
  const aiLimit = userData?.subscription?.aiAnswersLimit || PLAN_LIMITS[activePlan].aiAnswers;

  const deleteAccount = async () => {
    if (
      confirmationEmail.trim().toLowerCase() !==
      userData?.email?.trim().toLowerCase()
    ) {
      toast.error("Email does not match.");
      return;
    }

    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.delete("/api/user/delete");
      if (data.success) {
        toast.success("Account deleted successfully.");
        logout(navigate);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("An error occurred while deleting the account.");
      console.error("Error deleting account:", error);
    }
  };

  const refreshUntilPlanUpdated = async (targetPlan) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const { data } = await axios.get("/api/user/data");
      if (data?.success) {
        const nextPlan = data.userData?.subscription?.plan || "free";
        if (nextPlan === targetPlan) {
          await getUserData();
          return true;
        }
      }
    }
    await getUserData();
    return false;
  };

  const startCheckout = async (plan) => {
    try {
      setBillingBusyPlan(plan);

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.error("Failed to load Razorpay checkout");
        return;
      }

      const { data } = await axios.post("/api/billing/razorpay/order", { plan });
      if (!data?.success || !data?.order?.id || !data?.keyId) {
        toast.error(data?.error || "Unable to start payment");
        return;
      }

      if (data.pricing?.pro && data.pricing?.max) {
        setPricingPaise(data.pricing);
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: "RecallForge",
        description: `${PLAN_LABELS[plan]} monthly plan`,
        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
        },
        notes: {
          plan,
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async (response) => {
          try {
            toast.success("Payment received. Activating your plan...");
            const verifyRes = await axios.post("/api/billing/razorpay/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data?.success) {
              await getUserData();
              toast.success(`${PLAN_LABELS[plan]} plan is active`);
            } else {
              toast.error(verifyRes.data?.error || "Payment verification failed");
            }
          } catch (error) {
            toast.error(error?.response?.data?.error || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled");
          },
        },
      });

      razorpay.open();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to start payment");
    } finally {
      setBillingBusyPlan("");
    }
  };

  return (
    <>
      <div className="w-full rounded-2xl border border-white/10 bg-[#272e36] p-8 shadow-lg">
        <h2 className="mb-4 text-center text-2xl font-semibold text-white">
          Settings
        </h2>

        <div className="mb-8 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <h3 className="text-lg font-medium text-white">Subscription</h3>
          <p className="mt-1 text-sm text-indigo-200">
            Current plan: <span className="font-semibold text-white">{PLAN_LABELS[activePlan]}</span>
          </p>
          <p className="mt-1 text-xs text-indigo-200">
            AI usage this month: {aiUsage}/{aiLimit}
          </p>
          <p className="mt-1 text-xs text-indigo-200">
            Media per card: {PLAN_LIMITS[activePlan].mediaFiles} file(s)
          </p>
          {planExpiresAt && (
            <p className="mt-1 text-xs text-indigo-200">
              Plan expiry: {new Date(planExpiresAt).toLocaleDateString("en-IN")}
            </p>
          )}
          {nextResetAt && (
            <p className="mt-1 text-xs text-indigo-200">
              AI reset: {new Date(nextResetAt).toLocaleDateString("en-IN")}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {PLAN_FEATURES.map((planInfo) => {
              const limits = PLAN_LIMITS[planInfo.id];
              const isCurrent = activePlan === planInfo.id;
              const isPaid = planInfo.id !== "free";
              const planPrice = isPaid ? pricingPaise[planInfo.id] : 0;

              return (
                <div
                  key={planInfo.id}
                  className={`rounded-xl border p-4 ${
                    isCurrent
                      ? "border-indigo-400/70 bg-indigo-600/10"
                      : "border-white/10 bg-[#1e2329]"
                  }`}
                >
                  <p className="text-white font-medium">{planInfo.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{planInfo.note}</p>
                  <p className="text-sm text-gray-300 mt-3">AI: {limits.aiAnswers}/month</p>
                  <p className="text-sm text-gray-300">Media: {limits.mediaFiles}/card</p>
                  <p className="text-sm text-gray-300">
                    Price: {isPaid ? `${formatInr(planPrice)}/month` : "Free"}
                  </p>
                  {isPaid ? (
                    <button
                      onClick={() => startCheckout(planInfo.id)}
                      disabled={billingBusyPlan === planInfo.id}
                      className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {billingBusyPlan === planInfo.id
                        ? "Starting..."
                        : isCurrent
                          ? "Renew Plan"
                          : `Upgrade to ${planInfo.title}`}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-gray-400"
                    >
                      Current default plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {userData?.reviewHistory && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-2 ml-1">Activity</h3>
            <div className="p-4 rounded-xl bg-neutral-900/50 border border-white/5">
              <Heatmap reviewHistory={userData.reviewHistory} />
            </div>
          </div>
        )}
        
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h3 className="mb-2 text-lg font-medium text-red-500">Danger Zone</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full sm:w-auto rounded-xl bg-red-600/10 border border-red-600/50 px-6 py-2.5 font-medium text-red-500 shadow-md hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-md gap-4 rounded-xl border border-white/10 bg-[#272e36] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Delete Account</h3>
            <p className="mt-2 text-neutral-300">
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </p>
            <p className="mt-4 text-sm text-neutral-400">
              Please type <span className="font-mono font-bold text-white dark:text-white select-all">{userData?.email}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={
                  confirmationEmail.trim().toLowerCase() !==
                  userData?.email?.trim().toLowerCase()
                }
                onClick={deleteAccount}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Setting;
