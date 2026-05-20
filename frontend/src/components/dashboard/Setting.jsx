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

  const [settings, setSettings] = React.useState(null);
  const [preset, setPreset] = React.useState("default");
  const [easyBonus, setEasyBonus] = React.useState(1.3);
  const [intervalModifier, setIntervalModifier] = React.useState(1.0);
  const [maxInterval, setMaxInterval] = React.useState(36500);
  const [minEf, setMinEf] = React.useState(1.3);
  const [settingsBusy, setSettingsBusy] = React.useState(false);
  const [loadingSettings, setLoadingSettings] = React.useState(true);

  const PRESETS = {
    relaxed: {
      easy_bonus: 1.5,
      interval_modifier: 1.2,
      max_interval: 36500,
      min_ef: 1.5,
    },
    default: {
      easy_bonus: 1.3,
      interval_modifier: 1.0,
      max_interval: 36500,
      min_ef: 1.3,
    },
    aggressive: {
      easy_bonus: 1.1,
      interval_modifier: 0.8,
      max_interval: 36500,
      min_ef: 1.1,
    },
  };

  const detectPreset = (eb, im, mi, me) => {
    for (const [key, p] of Object.entries(PRESETS)) {
      if (
        Number(eb) === p.easy_bonus &&
        Number(im) === p.interval_modifier &&
        Number(mi) === p.max_interval &&
        Number(me) === p.min_ef
      ) {
        return key;
      }
    }
    return "custom";
  };

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const { data } = await axios.get("/api/user/settings");
      if (data.success && data.settings) {
        const s = data.settings;
        setSettings(s);
        setEasyBonus(Number(s.easy_bonus));
        setIntervalModifier(Number(s.interval_modifier));
        setMaxInterval(Number(s.max_interval));
        setMinEf(Number(s.min_ef));
        setPreset(detectPreset(s.easy_bonus, s.interval_modifier, s.max_interval, s.min_ef));
      } else {
        toast.error("Failed to load spaced repetition settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred loading settings.");
    } finally {
      setLoadingSettings(false);
    }
  };

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const selectPreset = (key) => {
    setPreset(key);
    if (key !== "custom") {
      const p = PRESETS[key];
      setEasyBonus(p.easy_bonus);
      setIntervalModifier(p.interval_modifier);
      setMaxInterval(p.max_interval);
      setMinEf(p.min_ef);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsBusy(true);
      const { data } = await axios.put("/api/user/settings", {
        easy_bonus: easyBonus,
        interval_modifier: intervalModifier,
        max_interval: maxInterval,
        min_ef: minEf,
      });
      if (data.success) {
        toast.success("Spaced repetition settings saved successfully!");
        setSettings(data.settings);
      } else {
        toast.error(data.message || "Failed to update settings.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "An error occurred saving settings.");
    } finally {
      setSettingsBusy(false);
    }
  };

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
        
        <div className="mb-8 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6">
          <h3 className="text-lg font-medium text-white mb-2">Spaced Repetition (SM2) Presets</h3>
          <p className="text-sm text-indigo-200 mb-5">
            Select a review frequency speed preset or fine-tune individual algorithms to match your memory retention rate.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 mb-5">
            {[
              { id: "relaxed", title: "Relaxed 🧘‍♂️", desc: "Longer intervals, forgiving", color: "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50" },
              { id: "default", title: "Default ⚡", desc: "Standard SM2 algorithm", color: "border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/50" },
              { id: "aggressive", title: "Aggressive 🔥", desc: "Shorter intervals, more reviews", color: "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50" },
              { id: "custom", title: "Custom ⚙️", desc: "Fine-tune settings", color: "border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/50" },
            ].map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p.id)}
                  className={`rounded-xl border p-4 text-left transition-all duration-200 ${p.color} ${
                    active ? "ring-2 ring-indigo-500 border-indigo-400/80 bg-indigo-500/10" : "border-white/10"
                  }`}
                >
                  <p className="text-white font-medium text-sm">{p.title}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{p.desc}</p>
                </button>
              );
            })}
          </div>

          {preset !== "custom" && (
            <div className="rounded-xl border border-white/5 bg-neutral-900/50 p-4 mb-4 text-xs text-gray-300 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-neutral-500 block mb-0.5 font-medium">Easy Bonus</span>
                <span className="font-semibold text-white">{easyBonus}x</span>
              </div>
              <div>
                <span className="text-neutral-500 block mb-0.5 font-medium">Interval Modifier</span>
                <span className="font-semibold text-white">{intervalModifier}x</span>
              </div>
              <div>
                <span className="text-neutral-500 block mb-0.5 font-medium">Ease Factor Floor (min_ef)</span>
                <span className="font-semibold text-white">{minEf}x</span>
              </div>
              <div>
                <span className="text-neutral-500 block mb-0.5 font-medium">Max Interval</span>
                <span className="font-semibold text-white">{maxInterval} days</span>
              </div>
            </div>
          )}

          {preset === "custom" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-4">
              <div className="col-span-1 sm:col-span-4">
                <h4 className="text-sm font-semibold text-cyan-200">Custom SM-2 Tuning Dashboard</h4>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-300">Easy Bonus</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="2.0"
                  value={easyBonus}
                  onChange={(e) => {
                    setEasyBonus(Number(e.target.value));
                    setPreset("custom");
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">Multiplier when rated Easy. Safe: 1.0 - 2.0</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300">Interval Modifier</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="2.0"
                  value={intervalModifier}
                  onChange={(e) => {
                    setIntervalModifier(Number(e.target.value));
                    setPreset("custom");
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">Global scale modifier. Safe: 0.5 - 2.0</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300">Ease Factor Floor (min_ef)</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.1"
                  max="2.5"
                  value={minEf}
                  onChange={(e) => {
                    setMinEf(Number(e.target.value));
                    setPreset("custom");
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">Ease factor floor limit. Safe: 1.1 - 2.5</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300">Max Interval (days)</label>
                <input
                  type="number"
                  min="1"
                  max="36500"
                  value={maxInterval}
                  onChange={(e) => {
                    setMaxInterval(Number(e.target.value));
                    setPreset("custom");
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">Maximum review delay in days. Safe: 1 - 36500</span>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={settingsBusy || loadingSettings}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-all duration-200"
            >
              {settingsBusy ? "Saving Settings..." : "Save SM2 Engine Settings"}
            </button>
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
