import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Activity,
  Droplet,
  UserPlus,
  UserX,
  Trash2,
  CheckCircle2,
  Clock,
  Shield,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Award,
  Radio,
  Sparkles,
  Calendar,
  Layers,
  Check
} from "lucide-react";
import { AdminAuditLog, Donor, BloodGroup } from "../types";
import { store } from "../lib/store";

interface RecentDonorActivityWidgetProps {
  logs: AdminAuditLog[];
  donors: Donor[];
  onOpenPassModal?: (donor: Donor) => void;
  onLaunchQrScanner?: () => void;
}

type ActivityCategory = "all" | "checkin" | "registration" | "removal";
type ChartViewMode = "bars" | "area";
type TimeRangeOption = 7 | 14 | 30;

interface DayActivityPoint {
  date: string;
  displayDate: string;
  fullDate: string;
  checkins: number;
  registrations: number;
  removals: number;
  total: number;
  cumulativeCheckins: number;
  cumulativeRegistrations: number;
  activities: {
    type: "checkin" | "registration" | "removal" | "other";
    title: string;
    details: string;
    timestamp: string;
  }[];
}

export const RecentDonorActivityWidget: React.FC<RecentDonorActivityWidgetProps> = ({
  logs,
  donors,
  onOpenPassModal,
  onLaunchQrScanner
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(7);
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("bars");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  // Helper to categorize log action
  const categorizeLog = (log: AdminAuditLog): "checkin" | "registration" | "removal" | "other" => {
    const act = (log.action || "").toLowerCase();
    const det = (log.details || "").toLowerCase();

    if (
      act.includes("donation") ||
      act.includes("check-in") ||
      act.includes("checkin") ||
      act.includes("clinical") ||
      det.includes("clinical blood donation") ||
      det.includes("check-in") ||
      det.includes("donation logged")
    ) {
      return "checkin";
    }

    if (
      act.includes("donor registered") ||
      act.includes("user registered") ||
      act.includes("registration") ||
      det.includes("registered as active donor") ||
      det.includes("new donor registered") ||
      det.includes("new registered user")
    ) {
      return "registration";
    }

    if (
      act.includes("donor removed") ||
      act.includes("user removed") ||
      act.includes("deregistered") ||
      act.includes("profile removed") ||
      act.includes("deleted") ||
      act.includes("ban") ||
      det.includes("permanently removed") ||
      det.includes("deregistered")
    ) {
      return "removal";
    }

    return "other";
  };

  // Helper to format friendly relative time
  const formatTimeAgo = (timestamp: string): string => {
    try {
      const now = new Date();
      const past = new Date(timestamp);
      const diffMs = now.getTime() - past.getTime();

      if (isNaN(diffMs)) return "Recent";

      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return "Just now";

      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;

      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Extract blood group from text if present
  const extractBloodGroup = (text: string): string | null => {
    const match = text.match(/\b(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)\b/);
    return match ? match[1] : null;
  };

  // Calculate live statistics across activity logs
  const stats = useMemo(() => {
    let checkins = 0;
    let registrations = 0;
    let removals = 0;

    logs.forEach((log) => {
      const cat = categorizeLog(log);
      if (cat === "checkin") checkins++;
      else if (cat === "registration") registrations++;
      else if (cat === "removal") removals++;
    });

    return {
      total: logs.length,
      checkins,
      registrations,
      removals
    };
  }, [logs]);

  // Build Recharts timeline dataset over chosen timeRange (7, 14, 30 days)
  const chartData = useMemo(() => {
    const points: DayActivityPoint[] = [];
    const now = new Date(); // anchor time
    now.setHours(23, 59, 59, 999);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Pre-calculate baseline cumulative prior to the window
    const windowStartTime = new Date(now);
    windowStartTime.setDate(windowStartTime.getDate() - (timeRange - 1));
    windowStartTime.setHours(0, 0, 0, 0);

    let runningCheckins = 0;
    let runningRegistrations = 0;

    logs.forEach((log) => {
      const logDate = new Date(log.timestamp);
      if (!isNaN(logDate.getTime()) && logDate < windowStartTime) {
        const cat = categorizeLog(log);
        if (cat === "checkin") runningCheckins++;
        if (cat === "registration") runningRegistrations++;
      }
    });

    for (let i = timeRange - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

      const displayDate = `${monthNames[targetDate.getMonth()]} ${targetDate.getDate().toString().padStart(2, "0")}`;
      const fullDate = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      let dayCheckins = 0;
      let dayRegistrations = 0;
      let dayRemovals = 0;
      const dayActivities: DayActivityPoint["activities"] = [];

      logs.forEach((log) => {
        if (!log.timestamp) return;
        const logDateStr = log.timestamp.split("T")[0];
        if (logDateStr === dateStr) {
          const cat = categorizeLog(log);
          if (cat === "checkin") {
            dayCheckins++;
            dayActivities.push({
              type: "checkin",
              title: log.action,
              details: log.details,
              timestamp: log.timestamp
            });
          } else if (cat === "registration") {
            dayRegistrations++;
            dayActivities.push({
              type: "registration",
              title: log.action,
              details: log.details,
              timestamp: log.timestamp
            });
          } else if (cat === "removal") {
            dayRemovals++;
            dayActivities.push({
              type: "removal",
              title: log.action,
              details: log.details,
              timestamp: log.timestamp
            });
          }
        }
      });

      runningCheckins += dayCheckins;
      runningRegistrations += dayRegistrations;

      points.push({
        date: dateStr,
        displayDate,
        fullDate,
        checkins: dayCheckins,
        registrations: dayRegistrations,
        removals: dayRemovals,
        total: dayCheckins + dayRegistrations,
        cumulativeCheckins: runningCheckins,
        cumulativeRegistrations: runningRegistrations,
        activities: dayActivities
      });
    }

    return points;
  }, [logs, timeRange]);

  // Calculate high-velocity day in current window
  const peakDay = useMemo(() => {
    if (chartData.length === 0) return null;
    let max = chartData[0];
    chartData.forEach((pt) => {
      if (pt.total > max.total) max = pt;
    });
    return max;
  }, [chartData]);

  // Filter and sort items strictly by most recent timestamp
  const filteredLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      })
      .filter((log) => {
        const cat = categorizeLog(log);

        // Category filter
        if (selectedCategory !== "all") {
          if (selectedCategory === "checkin" && cat !== "checkin") return false;
          if (selectedCategory === "registration" && cat !== "registration") return false;
          if (selectedCategory === "removal" && cat !== "removal") return false;
        }

        // Text search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesAction = (log.action || "").toLowerCase().includes(q);
          const matchesDetails = (log.details || "").toLowerCase().includes(q);
          const matchesEmail = (log.adminEmail || "").toLowerCase().includes(q);
          const matchesTarget = (log.targetId || "").toLowerCase().includes(q);
          return matchesAction || matchesDetails || matchesEmail || matchesTarget;
        }

        return true;
      });
  }, [logs, selectedCategory, searchQuery]);

  // Handler for simulating an instant real-time donation check-in
  const handleSimulateLiveCheckIn = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const availableDonors = donors.length > 0 ? donors : store.getDonors();
    const randomDonor = availableDonors[Math.floor(Math.random() * availableDonors.length)];
    const centerNames = [
      "Rajiv Gandhi Government General Hospital Blood Bank, Chennai",
      "Apollo Hospitals Blood Center, Greams Road",
      "Stanley Medical College Blood Bank",
      "Coimbatore Medical College Hospital Blood Centre",
      "Madurai Rajaji Govt Hospital Blood Bank"
    ];
    const randomCenter = centerNames[Math.floor(Math.random() * centerNames.length)];

    try {
      if (randomDonor) {
        await store.logAdminAction(
          "Donation Check-In Logged",
          `Live clinical check-in & Whole Blood donation confirmed for '${randomDonor.fullName}' (${randomDonor.bloodGroup}) at ${randomCenter}. Verified WHO 56-day cooldown and credited +10 saved units.`,
          randomDonor.uid
        );
        setSimulationNotice(`Simulated live check-in recorded for ${randomDonor.fullName} (${randomDonor.bloodGroup})`);
      } else {
        await store.logAdminAction(
          "Donation Check-In Logged",
          `On-site clinical check-in confirmed at ${randomCenter} for donor pass verification. Verified WHO 56-day cooldown reset.`,
          "donor_live_sim"
        );
        setSimulationNotice("Simulated live check-in recorded.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationNotice(null), 4000);
    }
  };

  // Handler for simulating a new donor registration
  const handleSimulateRegistration = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const sampleNames = ["Vikramaditya Raman", "Subhashini Natarajan", "Karthik Subramanian", "Deepa Meenakshi", "Siddharth Verma"];
    const sampleBloodGroups: BloodGroup[] = ["O+", "A+", "B+", "AB+", "O-", "A-"];
    const sampleCities = ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"];

    const chosenName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const chosenBg = sampleBloodGroups[Math.floor(Math.random() * sampleBloodGroups.length)];
    const chosenCity = sampleCities[Math.floor(Math.random() * sampleCities.length)];

    try {
      await store.logAdminAction(
        "Donor Registered",
        `New volunteer donor registered: '${chosenName}' (${chosenBg}) in ${chosenCity}, Tamil Nadu. Verified via mobile OTP authorization.`,
        `donor_sim_${Date.now()}`
      );
      setSimulationNotice(`New donor registration recorded for ${chosenName} (${chosenBg})`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationNotice(null), 4000);
    }
  };

  // Custom Recharts Dark Tooltip
  const renderCustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DayActivityPoint }> }) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0]?.payload;
    if (!pt) return null;

    return (
      <div className="bg-[#12131A] border border-border-dark p-3.5 rounded-xl shadow-2xl font-sans text-xs space-y-2.5 min-w-[240px] z-50">
        <div className="border-b border-border-dark/80 pb-2">
          <p className="font-extrabold text-text-bright font-display text-sm">{pt.fullDate}</p>
          <span className="text-[10px] text-text-subtle font-mono">{pt.total} Combined Activity Events</span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Donation Check-Ins:</span>
            </span>
            <span className="font-extrabold text-emerald-300">{pt.checkins}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>New Registrations:</span>
            </span>
            <span className="font-extrabold text-sky-300">{pt.registrations}</span>
          </div>

          {pt.removals > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Account Removals:</span>
              </span>
              <span className="font-extrabold text-rose-300">{pt.removals}</span>
            </div>
          )}

          {chartViewMode === "area" && (
            <div className="pt-1.5 border-t border-border-dark/60 flex items-center justify-between text-text-muted text-[10px]">
              <span>Cumulative Check-Ins:</span>
              <span className="font-bold text-white">{pt.cumulativeCheckins}</span>
            </div>
          )}
        </div>

        {pt.activities && pt.activities.length > 0 && (
          <div className="pt-2 border-t border-border-dark/60 space-y-1">
            <span className="text-[9.5px] uppercase font-mono text-text-subtle block font-bold">
              Recorded Events ({pt.activities.length})
            </span>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 no-scrollbar">
              {pt.activities.map((act, idx) => (
                <div key={idx} className="text-[10px] text-text-muted leading-tight truncate flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      act.type === "checkin"
                        ? "bg-emerald-400"
                        : act.type === "registration"
                        ? "bg-sky-400"
                        : "bg-rose-400"
                    }`}
                  />
                  <span className="truncate text-text-bright">{act.details}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="recent-donor-activity-widget"
      className="bg-card-dark border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* WIDGET TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 border-b border-amber-500/20 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-amber-400" />
              <span>Real-Time Audit Stream & Recharts Analytics</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Feed Active</span>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold font-display text-text-bright flex items-center gap-2">
            <span>Recent Donor Activity</span>
          </h3>
          <p className="text-xs text-text-muted">
            Continuous audit feed tracking on-site clinical donation check-ins, new donor registrations, and account removals in chronological order.
          </p>
        </div>

        {/* Quick Toolbar Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          {onLaunchQrScanner && (
            <button
              id="activity-widget-scan-qr-btn"
              onClick={onLaunchQrScanner}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Launch QR scanner to record a donor check-in"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan Check-In</span>
            </button>
          )}

          <button
            id="activity-widget-simulate-checkin-btn"
            onClick={handleSimulateLiveCheckIn}
            disabled={isSimulating}
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Inject a simulated clinical check-in event to test live stream and Recharts graph"
          >
            <Droplet className={`w-3.5 h-3.5 text-emerald-400 ${isSimulating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">+ Sim Check-In</span>
          </button>

          <button
            id="activity-widget-simulate-reg-btn"
            onClick={handleSimulateRegistration}
            disabled={isSimulating}
            className="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Inject a simulated donor registration event"
          >
            <UserPlus className={`w-3.5 h-3.5 text-sky-400 ${isSimulating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">+ Sim Register</span>
          </button>
        </div>
      </div>

      {/* SIMULATION FEEDBACK BANNER */}
      {simulationNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{simulationNotice}</span>
        </div>
      )}

      {/* RECHARTS VISUALIZATION CONTAINER */}
      <div
        id="recent-donor-activity-recharts-panel"
        className="bg-surface-dark/90 border border-border-dark rounded-xl p-4 sm:p-5 space-y-4 shadow-inner"
      >
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-dark/60 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold font-display text-text-bright">
                Activity Velocity & Volume (Check-Ins vs Registrations)
              </h4>
            </div>
            <p className="text-[11px] text-text-subtle font-mono">
              Live trend over the past {timeRange} days • Green = Donation Check-Ins • Blue = New Registrations
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
            {/* View Mode Toggle: Bars vs Cumulative Area */}
            <div className="flex items-center bg-card-dark p-0.5 rounded-lg border border-border-dark text-[10.5px]">
              <button
                type="button"
                id="chart-mode-bars-btn"
                onClick={() => setChartViewMode("bars")}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                  chartViewMode === "bars"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-text-muted hover:text-white"
                }`}
                title="Daily grouped volume bars"
              >
                <BarChart3 className="w-3 h-3" />
                <span>Daily</span>
              </button>
              <button
                type="button"
                id="chart-mode-area-btn"
                onClick={() => setChartViewMode("area")}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                  chartViewMode === "area"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-text-muted hover:text-white"
                }`}
                title="Cumulative activity curves"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Cumulative</span>
              </button>
            </div>

            {/* Time Range Selector: 7D / 14D / 30D */}
            <div className="flex items-center bg-card-dark p-0.5 rounded-lg border border-border-dark text-[10.5px]">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  id={`chart-range-${days}d-btn`}
                  onClick={() => setTimeRange(days as TimeRangeOption)}
                  className={`px-2 py-1 rounded font-mono font-bold transition cursor-pointer ${
                    timeRange === days
                      ? "bg-brand-red text-white shadow-sm"
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Chart Component */}
        <div className="h-56 sm:h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === "bars" ? (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="checkinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#3F3F46" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#3F3F46" }}
                  tickLine={false}
                />
                <Tooltip content={renderCustomTooltip} />
                <Legend
                  wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "monospace" }}
                  iconType="circle"
                />
                <Bar
                  dataKey="checkins"
                  name="Donation Check-Ins"
                  fill="url(#checkinGrad)"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="registrations"
                  name="Registrations"
                  fill="url(#regGrad)"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Activity"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#F59E0B" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumCheckinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="cumRegGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#3F3F46" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#3F3F46" }}
                  tickLine={false}
                />
                <Tooltip content={renderCustomTooltip} />
                <Legend
                  wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "monospace" }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeCheckins"
                  name="Cumulative Check-Ins"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cumCheckinGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeRegistrations"
                  name="Cumulative Registrations"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cumRegGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Recharts KPI summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border-dark/60 text-xs font-mono">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card-dark border border-border-dark/80">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-text-subtle uppercase">Window Check-Ins</div>
              <div className="font-extrabold text-emerald-300">
                {chartData.reduce((acc, p) => acc + p.checkins, 0)} sessions
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-card-dark border border-border-dark/80">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-text-subtle uppercase">Window Registrations</div>
              <div className="font-extrabold text-sky-300">
                {chartData.reduce((acc, p) => acc + p.registrations, 0)} donors
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-card-dark border border-border-dark/80">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-text-subtle uppercase">Peak Day</div>
              <div className="font-extrabold text-amber-300">
                {peakDay ? `${peakDay.displayDate} (${peakDay.total})` : "N/A"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-card-dark border border-border-dark/80">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-text-subtle uppercase">Active Velocity</div>
              <div className="font-extrabold text-text-bright">
                {(chartData.reduce((acc, p) => acc + p.total, 0) / timeRange).toFixed(1)} / day
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS CARDS FOR ACTION CATEGORIES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          id="activity-stat-total"
          onClick={() => setSelectedCategory("all")}
          className={`p-3 rounded-xl border transition cursor-pointer select-none ${
            selectedCategory === "all"
              ? "bg-amber-500/15 border-amber-500/50 shadow-sm"
              : "bg-surface-dark/80 border-border-dark/70 hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Total Events</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-text-bright font-mono">{stats.total}</div>
          <span className="text-[10px] text-text-subtle">Audit logs recorded</span>
        </div>

        <div
          id="activity-stat-checkins"
          onClick={() => setSelectedCategory("checkin")}
          className={`p-3 rounded-xl border transition cursor-pointer select-none ${
            selectedCategory === "checkin"
              ? "bg-emerald-500/15 border-emerald-500/50 shadow-sm"
              : "bg-surface-dark/80 border-border-dark/70 hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Check-Ins</span>
            <Droplet className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-emerald-300 font-mono">{stats.checkins}</div>
          <span className="text-[10px] text-emerald-400/80">Donations logged</span>
        </div>

        <div
          id="activity-stat-registrations"
          onClick={() => setSelectedCategory("registration")}
          className={`p-3 rounded-xl border transition cursor-pointer select-none ${
            selectedCategory === "registration"
              ? "bg-sky-500/15 border-sky-500/50 shadow-sm"
              : "bg-surface-dark/80 border-border-dark/70 hover:border-sky-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400">Registrations</span>
            <UserPlus className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-sky-300 font-mono">{stats.registrations}</div>
          <span className="text-[10px] text-sky-400/80">New donors & users</span>
        </div>

        <div
          id="activity-stat-removals"
          onClick={() => setSelectedCategory("removal")}
          className={`p-3 rounded-xl border transition cursor-pointer select-none ${
            selectedCategory === "removal"
              ? "bg-rose-500/15 border-rose-500/50 shadow-sm"
              : "bg-surface-dark/80 border-border-dark/70 hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400">Removals</span>
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-rose-300 font-mono">{stats.removals}</div>
          <span className="text-[10px] text-rose-400/80">Accounts & profiles</span>
        </div>
      </div>

      {/* FILTER BUTTONS & LIVE SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Category filter pills */}
        <div className="flex items-center bg-surface-dark/90 p-1 rounded-xl border border-border-dark text-[11px] overflow-x-auto no-scrollbar">
          <button
            id="activity-filter-all"
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === "all"
                ? "bg-amber-500 text-black shadow"
                : "text-text-muted hover:text-white"
            }`}
          >
            <span>All Actions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">{stats.total}</span>
          </button>

          <button
            id="activity-filter-checkins"
            type="button"
            onClick={() => setSelectedCategory("checkin")}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === "checkin"
                ? "bg-emerald-500 text-black shadow"
                : "text-text-muted hover:text-emerald-300"
            }`}
          >
            <Droplet className="w-3 h-3 text-emerald-400" />
            <span>Donation Check-Ins</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">{stats.checkins}</span>
          </button>

          <button
            id="activity-filter-registrations"
            type="button"
            onClick={() => setSelectedCategory("registration")}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === "registration"
                ? "bg-sky-500 text-black shadow"
                : "text-text-muted hover:text-sky-300"
            }`}
          >
            <UserPlus className="w-3 h-3 text-sky-400" />
            <span>Registrations</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">{stats.registrations}</span>
          </button>

          <button
            id="activity-filter-removals"
            type="button"
            onClick={() => setSelectedCategory("removal")}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === "removal"
                ? "bg-rose-500 text-black shadow"
                : "text-text-muted hover:text-rose-300"
            }`}
          >
            <UserX className="w-3 h-3 text-rose-400" />
            <span>Account Removals</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">{stats.removals}</span>
          </button>
        </div>

        {/* Live Search bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="activity-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, hospital, blood group..."
            className="w-full bg-surface-dark/90 border border-border-dark focus:border-amber-500/50 rounded-xl pl-9 pr-8 py-1.5 text-xs text-text-bright placeholder-text-subtle focus:outline-none transition font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-subtle hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* LIVE FEED LIST CONTAINER (SORTED BY MOST RECENT TIMESTAMP) */}
      <div className="relative space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-subtle px-1">
          <span>Live Chronological Stream (Newest First)</span>
          <span>Showing {filteredLogs.length} matching events</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-surface-dark/50 border border-border-dark rounded-xl p-8 text-center space-y-2">
            <Activity className="w-8 h-8 text-amber-500/40 mx-auto" />
            <p className="text-xs font-bold text-text-bright">No activity records match your current filters</p>
            <p className="text-[11px] text-text-subtle">
              {searchQuery
                ? `No logs found matching "${searchQuery}". Try clearing search keywords.`
                : "No activities logged for this category yet."}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="mt-2 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Reset Filter Settings
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => {
                const category = categorizeLog(log);
                const bloodGroup = extractBloodGroup(log.details);
                const timeAgo = formatTimeAgo(log.timestamp);

                // Check if target matches any known donor
                const matchedDonor = log.targetId
                  ? donors.find((d) => d.uid === log.targetId)
                  : null;

                // Distinct category styles
                const isCheckin = category === "checkin";
                const isRegistration = category === "registration";
                const isRemoval = category === "removal";

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={log.id}
                    id={`activity-log-item-${log.id}`}
                    className={`p-3.5 rounded-xl border transition-all duration-150 relative overflow-hidden ${
                      isCheckin
                        ? "bg-[#111A16]/80 border-emerald-500/30 hover:border-emerald-500/60"
                        : isRegistration
                        ? "bg-[#111722]/80 border-sky-500/30 hover:border-sky-500/60"
                        : isRemoval
                        ? "bg-[#1C1214]/80 border-rose-500/30 hover:border-rose-500/60"
                        : "bg-surface-dark/90 border-border-dark hover:border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left icon and category identifier */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                            isCheckin
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : isRegistration
                              ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                              : isRemoval
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          }`}
                        >
                          {isCheckin && <Droplet className="w-4 h-4 fill-current" />}
                          {isRegistration && <UserPlus className="w-4 h-4" />}
                          {isRemoval && <Trash2 className="w-4 h-4" />}
                          {!isCheckin && !isRegistration && !isRemoval && <Shield className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 space-y-1">
                          {/* Badges row */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[9.5px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isCheckin
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : isRegistration
                                  ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                                  : isRemoval
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {isCheckin
                                ? "Donation Check-In"
                                : isRegistration
                                ? "Registration"
                                : isRemoval
                                ? "Account Removal"
                                : log.action}
                            </span>

                            {bloodGroup && (
                              <span className="text-[9.5px] font-display font-extrabold bg-brand-red/20 text-rose-300 border border-brand-red/40 px-2 py-0.5 rounded-md">
                                {bloodGroup}
                              </span>
                            )}

                            <span className="text-[10px] text-text-subtle font-mono">
                              • {log.action}
                            </span>
                          </div>

                          {/* Event details text */}
                          <p className="text-xs text-text-bright leading-relaxed pr-2 font-normal">
                            {log.details}
                          </p>

                          {/* Metadata row: admin email & exact timestamp */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-text-muted font-mono">
                            <span className="flex items-center gap-1 text-text-subtle">
                              <Shield className="w-3 h-3 text-amber-400" />
                              <span>By: <strong className="text-text-muted">{log.adminEmail || "Super Admin"}</strong></span>
                            </span>

                            <span>•</span>

                            <span title={log.timestamp}>
                              {new Date(log.timestamp).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })} ({new Date(log.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: time ago and actionable buttons */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold bg-surface-dark border border-border-dark px-2 py-0.5 rounded-full text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{timeAgo}</span>
                        </span>

                        {matchedDonor && onOpenPassModal && (
                          <button
                            type="button"
                            onClick={() => onOpenPassModal(matchedDonor)}
                            className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition"
                            title="Open digital identity pass for this donor"
                          >
                            <Award className="w-3 h-3" />
                            <span>View Pass</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FOOTER AUDIT NOTE */}
      <div className="border-t border-border-dark/60 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10.5px] text-text-subtle font-mono">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time persistence active across Firestore & Local Storage audit tables</span>
        </div>
        <span>Recharts graph dynamically recalculates on live check-in & registration dispatches</span>
      </div>
    </div>
  );
};
