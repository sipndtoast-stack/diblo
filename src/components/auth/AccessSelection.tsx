import React from 'react';
import { User, ShieldCheck, ArrowRight, Sparkles, Phone, CheckCircle2, Shield } from 'lucide-react';

interface AccessSelectionProps {
  onSelectCustomer: () => void;
  onSelectStaff: () => void;
}

export const AccessSelection: React.FC<AccessSelectionProps> = ({
  onSelectCustomer,
  onSelectStaff
}) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#14213D] flex flex-col justify-between selection:bg-[#F42F73] selection:text-white font-sans antialiased">
      {/* Top Brand Bar */}
      <header className="w-full bg-white border-b border-gray-100 py-3.5 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F42F73] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-[#F42F73]/30">
              d
            </div>
            <span className="text-2xl font-black lowercase tracking-tight text-[#14213D]">
              diblo<span className="text-[#F42F73]">.</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Mumbai's On-Demand Assistance</span>
            <span className="sm:hidden">Mumbai</span>
          </div>
        </div>
      </header>

      {/* Main Access Selection Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl text-center space-y-3 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 bg-[#FFF0F5] text-[#F42F73] text-xs font-extrabold px-3 py-1 rounded-full border border-[#F42F73]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Diblo</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#14213D] tracking-tight leading-tight">
            How would you like to continue?
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            Choose your portal below to access Diblo services or log into the staff operational workspace.
          </p>
        </div>

        {/* Two Options / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-3xl">
          {/* Card 1: CUSTOMER */}
          <div
            onClick={onSelectCustomer}
            className="group relative bg-white border-2 border-gray-100 hover:border-[#F42F73] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.99] text-left"
            id="btn-access-customer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectCustomer();
              }
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-2xl bg-[#FFF0F5] text-[#F42F73] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <User className="w-7 h-7" />
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>No Login Required</span>
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                  Customer
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
                  Book verified on-demand hourly assistants for companionship, medical accompaniment, Mumbai errands, and event queues.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 font-medium">
                <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">Senior Companionship</span>
                <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">Hospital Visits</span>
                <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">₹149 / Hour</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCustomer();
                }}
                className="w-full bg-[#F42F73] hover:bg-[#D81B60] text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-md shadow-[#F42F73]/25 group-hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Continue as Customer</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: STAFF */}
          <div
            onClick={onSelectStaff}
            className="group relative bg-white border-2 border-gray-100 hover:border-[#14213D] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.99] text-left"
            id="btn-access-staff"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectStaff();
              }
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-2xl bg-[#14213D]/10 text-[#14213D] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-gray-600" />
                  <span>Company Employees</span>
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] transition-colors">
                  Staff
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
                  For Diblo Field Assistants, City Navigators, and Operations Team Admins. Sign in using your registered mobile number and password.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 font-medium">
                <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">Assistant Tasks</span>
                <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">Admin Console</span>
                <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">EPL Directory</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStaff();
                }}
                className="w-full bg-[#14213D] hover:bg-black text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Staff Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-100 py-4 px-4 sm:px-8 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} Diblo Technologies Pvt. Ltd. • Bandra, Mumbai
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>24x7 Mumbai Support: <strong>+91 8291919829</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
