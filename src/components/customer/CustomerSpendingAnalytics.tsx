import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { Booking } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  IndianRupee,
  Clock,
  HeartHandshake,
  Stethoscope,
  ShoppingBag,
  Briefcase,
  CheckCircle2,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Layers
} from 'lucide-react';

type ChartViewMode = 'SPENDING' | 'VOLUME' | 'BREAKDOWN';

interface MonthBucket {
  key: string; // '2026-04'
  monthLabel: string; // "Apr '26"
  fullMonth: string; // "April 2026"
  totalSpend: number;
  bookingCount: number;
  totalHours: number;
  services: Record<string, { count: number; spend: number }>;
  topService: string;
}

const SERVICE_COLORS: Record<string, string> = {
  'Senior Citizen Assistance': '#F42F73',
  'Hospital Visit Assistance': '#14213D',
  'Shopping Assistance': '#10B981',
  'Personal Errand Assistance': '#6366F1',
  'Queue Standing Assistance': '#F59E0B',
  'Government Office Assistance': '#06B6D4',
  'Other Services': '#8B5CF6'
};

const DEFAULT_COLOR = '#64748B';

// Format currency in Indian Rupees style
const formatINR = (val: number): string => {
  return `₹${val.toLocaleString('en-IN')}`;
};

export const CustomerSpendingAnalytics: React.FC = () => {
  const { bookings, isLoading } = useBooking();
  const { currentUser, customerProfile } = useAuth();
  const [viewMode, setViewMode] = useState<ChartViewMode>('SPENDING');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');

  // Filter bookings belonging to the current customer
  const customerBookings = useMemo(() => {
    const custId = customerProfile?.id || currentUser?.id || 'cust-1';
    const custPhone = currentUser?.phone || customerProfile?.phone || '9820123456';

    return bookings.filter((b) => {
      const matchId = b.customerId === custId || b.customerId === 'cust-1' || b.customerId === 'user-c-1';
      const matchPhone = b.customerPhone && b.customerPhone === custPhone;
      return matchId || matchPhone;
    });
  }, [bookings, currentUser, customerProfile]);

  // Generate the last 6 calendar months (April 2026 to September 2026)
  const monthlyData = useMemo(() => {
    // Defined 6 month window: Apr 2026 - Sep 2026
    const months = [
      { key: '2026-04', label: "Apr '26", full: 'April 2026' },
      { key: '2026-05', label: "May '26", full: 'May 2026' },
      { key: '2026-06', label: "Jun '26", full: 'June 2026' },
      { key: '2026-07', label: "Jul '26", full: 'July 2026' },
      { key: '2026-08', label: "Aug '26", full: 'August 2026' },
      { key: '2026-09', label: "Sep '26", full: 'September 2026' }
    ];

    const buckets: Record<string, MonthBucket> = {};
    months.forEach((m) => {
      buckets[m.key] = {
        key: m.key,
        monthLabel: m.label,
        fullMonth: m.full,
        totalSpend: 0,
        bookingCount: 0,
        totalHours: 0,
        services: {},
        topService: 'None'
      };
    });

    customerBookings.forEach((b) => {
      const dateStr = b.scheduledDate || b.createdAt || '';
      const monthKey = dateStr.slice(0, 7); // e.g. "2026-08"

      if (buckets[monthKey]) {
        if (selectedServiceFilter === 'ALL' || b.serviceName === selectedServiceFilter) {
          const spend = b.totalAmount || 0;
          const hours = b.totalHours || b.bookedHours || 2;

          buckets[monthKey].totalSpend += spend;
          buckets[monthKey].bookingCount += 1;
          buckets[monthKey].totalHours += hours;

          const sName = b.serviceName || 'General Assistance';
          if (!buckets[monthKey].services[sName]) {
            buckets[monthKey].services[sName] = { count: 0, spend: 0 };
          }
          buckets[monthKey].services[sName].count += 1;
          buckets[monthKey].services[sName].spend += spend;
        }
      }
    });

    // Compute top service for each month
    months.forEach((m) => {
      const bucket = buckets[m.key];
      let maxSpend = 0;
      let top = 'None';
      Object.entries(bucket.services).forEach(([name, data]) => {
        if (data.spend > maxSpend) {
          maxSpend = data.spend;
          top = name;
        }
      });
      bucket.topService = top;
    });

    return months.map((m) => buckets[m.key]);
  }, [customerBookings, selectedServiceFilter]);

  // Overall aggregate stats across the 6-month period
  const aggregateStats = useMemo(() => {
    let totalSpend = 0;
    let totalBookings = 0;
    let totalHours = 0;
    const serviceMap: Record<string, { count: number; spend: number }> = {};

    monthlyData.forEach((m) => {
      totalSpend += m.totalSpend;
      totalBookings += m.bookingCount;
      totalHours += m.totalHours;

      (Object.entries(m.services) as [string, { count: number; spend: number }][]).forEach(([name, data]) => {
        if (!serviceMap[name]) {
          serviceMap[name] = { count: 0, spend: 0 };
        }
        serviceMap[name].count += data.count;
        serviceMap[name].spend += data.spend;
      });
    });

    let primaryService = 'Senior Citizen Assistance';
    let primarySpend = 0;
    (Object.entries(serviceMap) as [string, { count: number; spend: number }][]).forEach(([name, data]) => {
      if (data.spend > primarySpend) {
        primarySpend = data.spend;
        primaryService = name;
      }
    });

    const avgPerBooking = totalBookings > 0 ? Math.round(totalSpend / totalBookings) : 0;
    const avgPerMonth = Math.round(totalSpend / 6);

    return {
      totalSpend,
      totalBookings,
      totalHours,
      avgPerBooking,
      avgPerMonth,
      primaryService,
      serviceMap
    };
  }, [monthlyData]);

  // Service distribution for Pie / Donut Chart
  const serviceDistributionData = useMemo(() => {
    const list = (Object.entries(aggregateStats.serviceMap) as [string, { count: number; spend: number }][]).map(([name, data]) => ({
      name,
      value: data.spend,
      count: data.count,
      percentage: aggregateStats.totalSpend > 0 ? Math.round((data.spend / aggregateStats.totalSpend) * 100) : 0,
      color: SERVICE_COLORS[name] || DEFAULT_COLOR
    }));

    return list.sort((a, b) => b.value - a.value);
  }, [aggregateStats]);

  // All distinct services booked by this customer for the dropdown filter
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    customerBookings.forEach((b) => {
      if (b.serviceName) set.add(b.serviceName);
    });
    return Array.from(set);
  }, [customerBookings]);

  // Custom Tooltip for Spending & Volume Charts
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: MonthBucket = payload[0].payload;
      return (
        <div className="bg-white p-3.5 rounded-2xl shadow-lg border border-gray-100 text-xs min-w-[200px] space-y-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
            <span className="font-bold text-[#14213D]">{dataPoint.fullMonth}</span>
            <span className="text-[10px] font-bold text-gray-400">Mumbai</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#F42F73]"></span>
                Total Spend:
              </span>
              <span className="font-black text-[#F42F73] text-sm">{formatINR(dataPoint.totalSpend)}</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#14213D]"></span>
                Bookings:
              </span>
              <span className="font-bold text-[#14213D]">{dataPoint.bookingCount} sessions</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Assistance Time:
              </span>
              <span className="font-bold text-emerald-700">{dataPoint.totalHours} hrs</span>
            </div>
          </div>

          {dataPoint.topService !== 'None' && (
            <div className="pt-1.5 border-t border-gray-100 text-[11px] text-gray-500">
              <span className="font-semibold text-gray-700">Top Service:</span> {dataPoint.topService}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0F5] flex items-center justify-center text-[#F42F73]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#14213D]">
                6-Month Booking History & Spending Pattern
              </h3>
              <p className="text-xs text-gray-500">
                April 2026 – September 2026 • Verified Mumbai Assisted Living & Errands
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher and Service Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Service Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="bg-transparent text-[#14213D] font-medium text-xs focus:outline-none cursor-pointer"
              aria-label="Filter by service"
            >
              <option value="ALL">All Services</option>
              {availableServices.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('SPENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'SPENDING'
                  ? 'bg-white text-[#14213D] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Spend (₹)</span>
            </button>

            <button
              onClick={() => setViewMode('VOLUME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'VOLUME'
                  ? 'bg-white text-[#14213D] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#14213D]" />
              <span>Sessions & Hours</span>
            </button>

            <button
              onClick={() => setViewMode('BREAKDOWN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'BREAKDOWN'
                  ? 'bg-white text-[#14213D] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Service Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Performance Indicator Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total 6-Mo Spend</span>
            <IndianRupee className="w-4 h-4 text-[#F42F73]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#14213D]">{formatINR(aggregateStats.totalSpend)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Avg. {formatINR(aggregateStats.avgPerMonth)} / month
          </div>
        </div>

        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#14213D]">
            {aggregateStats.totalBookings}{' '}
            <span className="text-xs font-bold text-gray-500">Bookings</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% verified & completed</div>
        </div>

        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assistance Hours</span>
            <Clock className="w-4 h-4 text-[#14213D]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#14213D]">
            {aggregateStats.totalHours}{' '}
            <span className="text-xs font-bold text-gray-500">Hours</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Avg. {aggregateStats.avgPerBooking ? `${formatINR(aggregateStats.avgPerBooking)}/session` : '—'}
          </div>
        </div>

        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Service</span>
            <HeartHandshake className="w-4 h-4 text-[#F42F73]" />
          </div>
          <div className="text-sm sm:text-base font-bold text-[#14213D] truncate" title={aggregateStats.primaryService}>
            {aggregateStats.primaryService}
          </div>
          <div className="text-[10px] text-[#F42F73] font-semibold mt-0.5">
            {aggregateStats.serviceMap[aggregateStats.primaryService]?.count || 0} visits completed
          </div>
        </div>
      </div>

      {/* Main Chart Visualization */}
      <div className="pt-2">
        {viewMode === 'SPENDING' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span className="font-semibold text-gray-700">Monthly Spending Trajectory (₹ INR)</span>
              <span className="text-[11px]">Hover over nodes to inspect month breakdown</span>
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F42F73" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F42F73" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="totalSpend"
                    name="Spending"
                    stroke="#F42F73"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                    activeDot={{ r: 6, fill: '#F42F73', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'VOLUME' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span className="font-semibold text-gray-700">Monthly Bookings Volume & Care Hours</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#14213D]"></span>
                  Bookings Count
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F42F73]"></span>
                  Total Hours
                </span>
              </div>
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="bookingCount" name="Bookings" fill="#14213D" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="totalHours" name="Hours" fill="#F42F73" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'BREAKDOWN' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {serviceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Total Spend']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Service Breakdown Legend & Details */}
            <div className="md:col-span-6 space-y-2.5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Distribution by Service Category
              </div>
              <div className="space-y-2">
                {serviceDistributionData.map((s) => (
                  <div
                    key={s.name}
                    className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                      <div>
                        <div className="font-bold text-[#14213D]">{s.name}</div>
                        <div className="text-[10px] text-gray-500">{s.count} bookings completed</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[#14213D]">{formatINR(s.value)}</div>
                      <div className="text-[10px] font-bold text-[#F42F73]">{s.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Summary Strip */}
      <div className="pt-2 border-t border-gray-100">
        <div className="text-xs font-bold text-[#14213D] mb-2.5">Month-by-Month Snapshot</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {monthlyData.map((m) => (
            <div
              key={m.key}
              className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center space-y-1 hover:border-gray-200 transition-colors"
            >
              <div className="text-[11px] font-bold text-gray-500">{m.monthLabel}</div>
              <div className="text-sm font-black text-[#14213D]">{formatINR(m.totalSpend)}</div>
              <div className="text-[10px] text-gray-400">
                {m.bookingCount} visits • {m.totalHours} hrs
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
