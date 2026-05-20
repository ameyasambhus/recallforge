import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { PLAN_LABELS, PLAN_LIMITS } from "../../constants/subscription";
import { 
  CreditCard, 
  BrainCircuit, 
  User, 
  KeyRound, 
  Sparkles, 
  Check, 
  X, 
  ShieldAlert, 
  Cpu, 
  FileText, 
  Calendar,
  Zap,
  ChevronRight,
  Info
} from "lucide-react";

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
  const [activeTab, setActiveTab] = React.useState("billing");
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
  const mediaFilesLimit = userData?.subscription?.mediaFilesLimit ?? PLAN_LIMITS[activePlan].mediaFiles;

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

  const tabs = [
    { id: "billing", label: "Billing & Plans", icon: CreditCard, desc: "Subscription status & usage limits" },
    { id: "memory", label: "Memory Engine", icon: BrainCircuit, desc: "SM2 intervals & review stats" },
    { id: "account", label: "Account Settings", icon: User, desc: "Profile details & credentials" },
  ];

  const aiPercent = Math.min(100, Math.round((aiUsage / aiLimit) * 100));

  return (
    <>
      <div className="w-full flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-72 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-white/5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-left shrink-0 lg:shrink lg:w-full border ${
                  active
                    ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-md shadow-indigo-500/5 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-indigo-400" : "text-neutral-500"}`} />
                <div className="text-left">
                  <p className="text-sm font-medium leading-none">{tab.label}</p>
                  <p className="hidden lg:block text-[11px] text-neutral-500 mt-1 leading-tight font-normal">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 min-w-0 bg-[#272e36] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          
          {/* TAB 1: BILLING & PLANS */}
          {activeTab === "billing" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-indigo-400" />
                  Billing & Quota Usage
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Track your monthly AI generation allowances and media file attachment quotas.
                </p>
              </div>

              {/* Usage Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* AI Answers Usage card */}
                <div className="bg-[#1e2329] border border-white/5 rounded-xl p-5 shadow-inner">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Usage Quota</span>
                      <h4 className="text-lg font-bold text-white mt-0.5">AI Learning Answers</h4>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                      aiPercent >= 90
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : aiPercent >= 70
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}>
                      {aiPercent}% Used
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3.5 bg-neutral-950 rounded-full overflow-hidden border border-white/5 relative mb-4">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-500 transition-all duration-500" 
                      style={{ width: `${aiPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-neutral-400 font-mono">
                    <span>{aiUsage} queries used</span>
                    <span>{aiLimit} monthly limit</span>
                  </div>

                  {nextResetAt && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs text-neutral-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Quota resets automatically on {new Date(nextResetAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                </div>

                {/* Media attachments quota card */}
                <div className="bg-[#1e2329] border border-white/5 rounded-xl p-5 shadow-inner flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Attachment Quota</span>
                        <h4 className="text-lg font-bold text-white mt-0.5">Media Files Per Card</h4>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        mediaFilesLimit > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-neutral-800 text-neutral-400 border border-white/5"
                      }`}>
                        {mediaFilesLimit > 0 ? `${mediaFilesLimit} Attached Allowed` : "No Media Support"}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                      {mediaFilesLimit > 0 
                        ? `Your plan lets you attach images, diagrams, or other visual documents directly into your review cards (up to ${mediaFilesLimit} per card).`
                        : "Your active plan doesn't support card media files. Upgrade to include visual diagrams, equations, or screenshots for better memory association."
                      }
                    </p>
                  </div>

                  {/* Visual mockup representation */}
                  <div className="bg-neutral-950/60 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500 font-medium">Card Layout Preview</span>
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
                            idx < mediaFilesLimit 
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 scale-100" 
                              : "bg-neutral-900 border-dashed border-white/10 text-neutral-600 scale-95"
                          }`}
                          title={idx < mediaFilesLimit ? "Media slot active" : "Upgrade to unlock slot"}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Plans Section Grid */}
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white">Available Plans</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Select a plan that aligns with your studying frequency and media resources.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PLAN_FEATURES.map((planInfo) => {
                    const limits = PLAN_LIMITS[planInfo.id];
                    const isCurrent = activePlan === planInfo.id;
                    const isPaid = planInfo.id !== "free";
                    const planPrice = isPaid ? pricingPaise[planInfo.id] : 0;

                    return (
                      <div
                        key={planInfo.id}
                        className={`rounded-2xl border flex flex-col justify-between p-6 transition-all duration-300 relative ${
                          isCurrent
                            ? "border-indigo-500 bg-indigo-600/5 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5"
                            : "border-white/10 bg-[#1e2329] hover:border-white/20"
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider border border-indigo-400">
                            Current Active Plan
                          </span>
                        )}

                        <div>
                          <div className="mb-4">
                            <h4 className="text-lg font-bold text-white">{planInfo.title}</h4>
                            <p className="text-xs text-neutral-400 mt-1 min-h-[32px] leading-relaxed">{planInfo.note}</p>
                          </div>

                          <div className="mb-6 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">
                              {isPaid ? formatInr(planPrice) : "₹0"}
                            </span>
                            <span className="text-xs text-neutral-400 font-medium">/ month</span>
                          </div>

                          <div className="space-y-3.5 mb-6 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span><strong>{limits.aiAnswers}</strong> AI Generation Queries</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span>
                                <strong>{limits.mediaFiles}</strong> {limits.mediaFiles === 1 ? "attachment" : "attachments"} per card
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                              <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span>Full SM2 Custom Presets</span>
                            </div>
                          </div>
                        </div>

                        {isPaid ? (
                          <button
                            onClick={() => startCheckout(planInfo.id)}
                            disabled={billingBusyPlan === planInfo.id}
                            className={`w-full rounded-xl py-3 text-xs font-semibold text-white transition-all ${
                              isCurrent
                                ? "bg-white/10 hover:bg-white/15 border border-white/10"
                                : "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
                            } disabled:opacity-60`}
                          >
                            {billingBusyPlan === planInfo.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                Processing Order...
                              </span>
                            ) : isCurrent ? (
                              "Renew Subscription"
                            ) : (
                              `Upgrade to ${planInfo.title}`
                            )}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full rounded-xl border border-white/5 py-3 text-xs font-semibold text-neutral-500 bg-neutral-900/50 cursor-not-allowed"
                          >
                            Default Workspace Plan
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMORY ENGINE */}
          {activeTab === "memory" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-400" />
                  Memory & SM-2 Engine
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Adjust the decay speeds and ease factors of the study algorithm to match your learning habits.
                </p>
              </div>

              {/* SM2 Presets */}
              <div className="bg-[#1e2329] border border-white/5 rounded-xl p-5 mb-8">
                <h3 className="text-sm font-semibold text-white mb-1.5">Study Modality Presets</h3>
                <p className="text-xs text-neutral-400 mb-5">
                  Select a decay standard. Relaxed stretches intervals to review less often, while Aggressive keeps reviews close.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { id: "relaxed", title: "Relaxed 🧘‍♂️", desc: "Longer intervals, relaxed curve", color: "border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/30" },
                    { id: "default", title: "Default ⚡", desc: "Standard supermemo intervals", color: "border-indigo-500/10 bg-indigo-500/5 hover:border-indigo-500/30" },
                    { id: "aggressive", title: "Aggressive 🔥", desc: "Closer repetitions, strict curve", color: "border-rose-500/10 bg-rose-500/5 hover:border-rose-500/30" },
                    { id: "custom", title: "Custom ⚙️", desc: "Fine-tune individual parameters", color: "border-cyan-500/10 bg-cyan-500/5 hover:border-cyan-500/30" },
                  ].map((p) => {
                    const active = preset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPreset(p.id)}
                        className={`rounded-xl border p-3.5 text-left transition-all duration-200 ${p.color} ${
                          active ? "ring-2 ring-indigo-500 border-indigo-400/80 bg-indigo-500/10" : "border-white/5"
                        }`}
                      >
                        <p className="text-white font-semibold text-xs sm:text-sm">{p.title}</p>
                        <p className="text-[10px] text-neutral-400 mt-1 leading-tight">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* SM2 Values Dashboard */}
                {preset !== "custom" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-950/40 p-4 border border-white/5 rounded-xl">
                    <div className="p-2">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Easy Bonus</span>
                      <span className="text-base font-bold text-white mt-0.5 block">{easyBonus}x</span>
                      <p className="text-[9px] text-neutral-500 mt-1 leading-normal">Adds interval boost when rated Easy.</p>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Interval Modifier</span>
                      <span className="text-base font-bold text-white mt-0.5 block">{intervalModifier}x</span>
                      <p className="text-[9px] text-neutral-500 mt-1 leading-normal">Global multiplier on cards review gap.</p>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Ease Factor Floor</span>
                      <span className="text-base font-bold text-white mt-0.5 block">{minEf}x</span>
                      <p className="text-[9px] text-neutral-500 mt-1 leading-normal">Absolute floor coefficient limit.</p>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Max Interval</span>
                      <span className="text-base font-bold text-white mt-0.5 block">{maxInterval} days</span>
                      <p className="text-[9px] text-neutral-500 mt-1 leading-normal">Longest allowed cards delay.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-cyan-500/[0.02] border border-cyan-500/10 p-5 rounded-xl">
                    <h4 className="text-xs font-bold text-cyan-400 mb-4 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" />
                      Interactive Parameter Customization
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Easy Bonus Input & Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-neutral-300">Easy Bonus</label>
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/10">{easyBonus}x</span>
                        </div>
                        <input
                          type="range"
                          step="0.05"
                          min="1.0"
                          max="2.0"
                          value={easyBonus}
                          onChange={(e) => {
                            setEasyBonus(Number(e.target.value));
                            setPreset("custom");
                          }}
                          className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="text-[9px] text-neutral-500 block mt-1 leading-relaxed">
                          Multiplier applied to interval when rating a card "Easy". Range: 1.0 - 2.0.
                        </span>
                      </div>

                      {/* Interval Modifier Input & Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-neutral-300">Interval Modifier</label>
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/10">{intervalModifier}x</span>
                        </div>
                        <input
                          type="range"
                          step="0.05"
                          min="0.5"
                          max="2.0"
                          value={intervalModifier}
                          onChange={(e) => {
                            setIntervalModifier(Number(e.target.value));
                            setPreset("custom");
                          }}
                          className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="text-[9px] text-neutral-500 block mt-1 leading-relaxed">
                          Global factor scaling all study intervals. Lower values make reviews more frequent. Range: 0.5 - 2.0.
                        </span>
                      </div>

                      {/* Ease Factor Floor Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-neutral-300">Ease Factor Floor (Min EF)</label>
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/10">{minEf}x</span>
                        </div>
                        <input
                          type="range"
                          step="0.05"
                          min="1.1"
                          max="2.5"
                          value={minEf}
                          onChange={(e) => {
                            setMinEf(Number(e.target.value));
                            setPreset("custom");
                          }}
                          className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="text-[9px] text-neutral-500 block mt-1 leading-relaxed">
                          Minimum limit cards factor decay. Low EF subjects you to permanent repetitions ("ease hell"). Range: 1.1 - 2.5.
                        </span>
                      </div>

                      {/* Max Interval input */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">Max Interval (Days)</label>
                        <input
                          type="number"
                          min="1"
                          max="36500"
                          value={maxInterval}
                          onChange={(e) => {
                            setMaxInterval(Number(e.target.value));
                            setPreset("custom");
                          }}
                          className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-[9px] text-neutral-500 block mt-1 leading-relaxed">
                          Sets an absolute ceiling on the interval length in days. Default is 36500 days (100 years).
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={settingsBusy || loadingSettings}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60 transition-all duration-200 shadow-md shadow-indigo-600/10"
                  >
                    {settingsBusy ? "Applying variables..." : "Save Memory Configuration"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT SETTINGS */}
          {activeTab === "account" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <User className="w-6 h-6 text-indigo-400" />
                  Account Profile Settings
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Manage personal security details, review active account stats, or download workspaces.
                </p>
              </div>

              {/* Profile Card */}
              <div className="bg-[#1e2329] border border-white/5 rounded-xl p-6 mb-8 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-white font-bold text-lg">
                    {userData?.name ? userData.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{userData?.name || "RecallForge User"}</h3>
                    <p className="text-xs text-neutral-400">{userData?.email}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    to="/reset-pass"
                    className="flex items-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-neutral-900/50 hover:bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    Change Account Password
                  </Link>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-red-500/20 bg-red-500/[0.02] rounded-xl p-5 sm:p-6">
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-red-500">Danger Zone</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Delete your account and wipe all database references permanently. Once done, this is irreversible and active subscriptions will be cancelled.
                    </p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="rounded-xl bg-red-600/10 border border-red-600/40 hover:border-red-500/60 px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-all duration-200"
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Account Modal (keeps original logic intact) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-md gap-4 rounded-2xl border border-white/10 bg-[#272e36] p-6 shadow-2xl animate-fadeIn">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Confirm Permanent Account Deletion
            </h3>
            <p className="mt-2.5 text-xs text-neutral-300 leading-relaxed">
              This action cannot be undone. RecallForge will permanently delete your workspaces, decks, streak records, SM-2 history, and custom intervals immediately.
            </p>
            <p className="mt-4 text-xs text-neutral-400">
              Please enter your exact email <span className="font-mono font-bold text-white select-all">{userData?.email}</span> below to authorize:
            </p>
            <input
              type="text"
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              placeholder="Confirm email address"
              className="mt-2.5 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={
                  confirmationEmail.trim().toLowerCase() !==
                  userData?.email?.trim().toLowerCase()
                }
                onClick={deleteAccount}
                className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-semibold text-white hover:shadow-lg hover:shadow-red-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
