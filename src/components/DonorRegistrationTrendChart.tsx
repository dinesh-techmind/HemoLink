import React, { useState, useMemo } from "react";
import { Donor, BloodGroup } from "../types";
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
  Legend,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Users,
  Award,
  Activity,
  Filter,
  BarChart3,
  Layers,
  ChevronDown,
  Droplet
} from "lucide-react";

interface DonorRegistrationTrendChartProps {
  donors: Donor[];
}

type ChartViewType = "combined" | "daily" | "cumulative";
type TimeRangeType = 7 | 14 | 30;

interface DayDataPoint {
  date: string;
  displayDate: string;
  fullDate: string;
  registrations: number;
  cumulative: number;
  trend: number;
  bloodGroups: { [key in BloodGroup]?: number };
  donorNames: string[];
}

export default function DonorRegistrationTrendChart({ donors }: DonorRegistrationTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeType>(30);
  const [viewType, setViewType] = useState<ChartViewType>("combined");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | "ALL">("ALL");

  // Filter donors by blood group if requested
  const filteredDonors = useMemo(() => {
    if (selectedBloodGroup === "ALL") return donors;
    return donors.filter((d) => d.bloodGroup === selectedBloodGroup);
  }, [donors, selectedBloodGroup]);

  // Aggregate daily registration volume over the chosen period (e.g. 30 days)
  const chartData = useMemo(() => {
    const points: DayDataPoint[] = [];
    const now = new Date(); // current time anchor
    now.setHours(23, 59, 59, 999);

    // Build timeline buckets from (now - timeRange + 1) to now
    let runningCumulative = 0;

    // First, count all registrations prior to the window to seed cumulative count accurately
    const windowStartTime = new Date(now);
    windowStartTime.setDate(windowStartTime.getDate() - (timeRange - 1));
    windowStartTime.setHours(0, 0, 0, 0);

    const priorCount = filteredDonors.filter((d) => {
      if (!d.createdAt) return false;
      const dDate = new Date(d.createdAt);
      return !isNaN(dDate.getTime()) && dDate < windowStartTime;
    }).length;

    runningCumulative = priorCount;

    for (let i = timeRange - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const displayDate = `${monthNames[targetDate.getMonth()]} ${targetDate.getDate().toString().padStart(2, "0")}`;
      const fullDate = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      // Find all donors created on this specific day
      const daysDonors = filteredDonors.filter((d) => {
        if (!d.createdAt) return false;
        const dDate = new Date(d.createdAt);
        if (isNaN(dDate.getTime())) return false;
        const donorDateStr = dDate.toISOString().split("T")[0];
        return donorDateStr === dateStr;
      });

      const dayCount = daysDonors.length;
      runningCumulative += dayCount;

      // Breakdown by blood group
      const bgMap: { [key in BloodGroup]?: number } = {};
      daysDonors.forEach((d) => {
        bgMap[d.bloodGroup] = (bgMap[d.bloodGroup] || 0) + 1;
      });

      points.push({
        date: dateStr,
        displayDate,
        fullDate,
        registrations: dayCount,
        cumulative: runningCumulative,
        trend: 0, // calculated below via moving average
        bloodGroups: bgMap,
        donorNames: daysDonors.map((d) => `${d.fullName} (${d.bloodGroup})`),
      });
    }

    // Calculate 3-day simple moving average for smooth trend line
    for (let j = 0; j < points.length; j++) {
      const windowSlice = points.slice(Math.max(0, j - 2), j + 1);
      const avg = windowSlice.reduce((sum, p) => sum + p.registrations, 0) / windowSlice.length;
      points[j].trend = parseFloat(avg.toFixed(1));
    }

    return points;
  }, [filteredDonors, timeRange]);

  // Derived aggregate metrics for the analytical banner
  const metrics = useMemo(() => {
    const totalInWindow = chartData.reduce((acc, curr) => acc + curr.registrations, 0);
    const avgPerDay = (totalInWindow / timeRange).toFixed(1);
    
    let peakDay = chartData[0] || { displayDate: "-", registrations: 0 };
    chartData.forEach((pt) => {
      if (pt.registrations > peakDay.registrations) {
        peakDay = pt;
      }
    });

    const oMinusCount = filteredDonors.filter((d) => {
      if (d.bloodGroup !== "O-") return false;
      if (!d.createdAt) return false;
      const dDate = new Date(d.createdAt);
      const daysDiff = (Date.now() - dDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= timeRange;
    }).length;

    return {
      totalInWindow,
      avgPerDay,
      peakDay,
      oMinusCount,
    };
  }, [chartData, filteredDonors, timeRange]);

  // Custom tooltips with clinical and dark theme styling
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataPoint = payload[0]?.payload as DayDataPoint;
    if (!dataPoint) return null;

    return (
      <div className="bg-[#121212]/95 border border-border-dark p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="border-b border-border-dark pb-1.5 flex items-center justify-between gap-2">
          <span className="font-bold text-text-bright flex items-center gap-1.5 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            {dataPoint.fullDate}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-[11px]">New Registrations:</span>
            <span className="font-extrabold text-brand-red font-mono text-xs">
              {dataPoint.registrations} {dataPoint.registrations === 1 ? "Donor" : "Donors"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted text-[11px]">Cumulative Active:</span>
            <span className="font-extrabold text-emerald-400 font-mono text-xs">
              {dataPoint.cumulative}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted text-[11px]">3-Day Rolling Avg:</span>
            <span className="font-semibold text-amber-400 font-mono text-xs">
              {dataPoint.trend} / day
            </span>
          </div>
        </div>

        {dataPoint.donorNames.length > 0 && (
          <div className="pt-2 border-t border-border-dark/60 space-y-1">
            <span className="text-[9px] uppercase font-mono text-text-subtle block font-bold">
              Registered Donors ({dataPoint.donorNames.length})
            </span>
            <div className="max-h-24 overflow-y-auto space-y-0.5 no-scrollbar">
              {dataPoint.donorNames.map((name, idx) => (
                <div key={idx} className="text-[10px] text-text-bright font-mono truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card-dark border border-border-dark rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-red/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section with Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 border-b border-border-dark/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-display text-text-bright flex items-center gap-2">
                <span>Donor Registration Trend Analytics</span>
                <span className="text-[10px] bg-brand-red/20 text-brand-red border border-brand-red/40 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  Live Past {timeRange} Days
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Visualizing incoming volunteer blood donor enrollments and clinical network expansion velocity.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Timeframe, Blood Group, Chart View */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Blood Group Filter */}
          <div className="flex items-center gap-1.5 bg-surface-dark border border-border-dark px-2 py-1 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value as BloodGroup | "ALL")}
              className="bg-transparent text-text-bright font-mono text-[11px] font-bold outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-[#1C1C1C] text-text-bright">All Blood Groups</option>
              <option value="O+" className="bg-[#1C1C1C] text-text-bright">O+ (Common)</option>
              <option value="O-" className="bg-[#1C1C1C] text-text-bright">O- (Universal)</option>
              <option value="A+" className="bg-[#1C1C1C] text-text-bright">A+</option>
              <option value="A-" className="bg-[#1C1C1C] text-text-bright">A-</option>
              <option value="B+" className="bg-[#1C1C1C] text-text-bright">B+</option>
              <option value="B-" className="bg-[#1C1C1C] text-text-bright">B-</option>
              <option value="AB+" className="bg-[#1C1C1C] text-text-bright">AB+</option>
              <option value="AB-" className="bg-[#1C1C1C] text-text-bright">AB-</option>
            </select>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-surface-dark border border-border-dark p-0.5 rounded-xl text-xs font-mono">
            {([7, 14, 30] as TimeRangeType[]).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                  timeRange === days
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-text-muted hover:text-text-bright"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Chart View Toggle */}
          <div className="flex items-center bg-surface-dark border border-border-dark p-0.5 rounded-xl text-xs font-mono">
            <button
              onClick={() => setViewType("combined")}
              title="Combined Bar & Trend"
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] flex items-center gap-1 ${
                viewType === "combined"
                  ? "bg-brand-red text-white shadow-sm"
                  : "text-text-muted hover:text-text-bright"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Combined</span>
            </button>
            <button
              onClick={() => setViewType("daily")}
              title="Daily Bar Chart"
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] flex items-center gap-1 ${
                viewType === "daily"
                  ? "bg-brand-red text-white shadow-sm"
                  : "text-text-muted hover:text-text-bright"
              }`}
            >
              <Droplet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daily</span>
            </button>
            <button
              onClick={() => setViewType("cumulative")}
              title="Cumulative Growth Area"
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] flex items-center gap-1 ${
                viewType === "cumulative"
                  ? "bg-brand-red text-white shadow-sm"
                  : "text-text-muted hover:text-text-bright"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Growth</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        <div className="bg-surface-dark/90 border border-border-dark p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-text-subtle font-mono uppercase font-semibold block">
            Window Registrations
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-text-bright font-mono">{metrics.totalInWindow}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Past {timeRange}d</span>
          </div>
        </div>

        <div className="bg-surface-dark/90 border border-border-dark p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-text-subtle font-mono uppercase font-semibold block">
            Registration Velocity
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-amber-400 font-mono">{metrics.avgPerDay}</span>
            <span className="text-[10px] text-text-muted font-mono">donors / day</span>
          </div>
        </div>

        <div className="bg-surface-dark/90 border border-border-dark p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-text-subtle font-mono uppercase font-semibold block">
            Peak Day Surge
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-brand-red font-mono">{metrics.peakDay.registrations}</span>
            <span className="text-[10px] text-text-muted font-mono truncate">{metrics.peakDay.displayDate}</span>
          </div>
        </div>

        <div className="bg-surface-dark/90 border border-border-dark p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] text-text-subtle font-mono uppercase font-semibold block">
            Universal (O-) Donors
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-rose-400 font-mono">{metrics.oMinusCount}</span>
            <span className="text-[10px] text-rose-400/80 font-mono font-semibold">Priority Type</span>
          </div>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="relative z-10 w-full h-[300px] sm:h-[340px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === "cumulative" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333" }}
                interval={timeRange === 30 ? 4 : timeRange === 14 ? 2 : 0}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltipContent />} />
              <Legend
                wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "monospace" }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative Network Size"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#cumulAreaGrad)"
                dot={{ r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#ffffff" }}
                activeDot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
              />
            </AreaChart>
          ) : viewType === "daily" ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333" }}
                interval={timeRange === 30 ? 4 : timeRange === 14 ? 2 : 0}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltipContent />} />
              <Legend
                wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "monospace" }}
              />
              <Bar
                dataKey="registrations"
                name="Daily Registrations"
                fill="#ba1111"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333" }}
                interval={timeRange === 30 ? 4 : timeRange === 14 ? 2 : 0}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltipContent />} />
              <Legend
                wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "monospace" }}
              />
              <Bar
                dataKey="registrations"
                name="Daily Registrations"
                fill="#ba1111"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Area
                type="monotone"
                dataKey="trend"
                name="3-Day Moving Average"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#trendGradient)"
                dot={{ r: 2.5, fill: "#f59e0b" }}
                activeDot={{ r: 4.5, fill: "#f59e0b", stroke: "#ffffff" }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Insight Note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border-dark/60 text-[10px] font-mono text-text-subtle">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>Real-time dynamic feed: updates immediately upon new donor onboardings or clinical registrations.</span>
        </div>
        <span className="text-amber-500/80 font-bold">Hemolink Protocol Analytics Engine</span>
      </div>
    </div>
  );
}
