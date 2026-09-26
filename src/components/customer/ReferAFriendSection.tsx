import React, { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  CheckCheck,
  Share2,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Tag,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  UserPlus,
  Award,
  AlertCircle,
  RefreshCw,
  Percent,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Referral, Coupon } from '../../types';
import { api } from '../../lib/api';

interface ReferAFriendSectionProps {
  onOpenBookingWithCoupon?: (couponCode: string) => void;
}

export const ReferAFriendSection: React.FC<ReferAFriendSectionProps> = ({
  onOpenBookingWithCoupon
}) => {
  const { customerProfile, currentUser } = useAuth();

  // State
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnedCoupons, setEarnedCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');

  // Copy States & Visual Feedback
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Invite Form State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteFriendName, setInviteFriendName] = useState('');
  const [inviteFriendPhone, setInviteFriendPhone] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  // Simulation loading state
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // Calculate unique referral code & share link
  const cleanName = (customerProfile?.name || currentUser?.name || 'MEMBER')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6) || 'MEMBER';
  const referralCode = customerProfile?.referralCode || `DIBLO-${cleanName}100`;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://diblo.in';
  const referralLink = `${baseUrl}/?ref=${referralCode}`;

  // Fetch referrals and earned coupons
  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      const customerId = customerProfile?.id || currentUser?.id || '';
      const [refList, allCoupons] = await Promise.all([
        customerId ? api.getReferrals(customerId) : Promise.resolve([]),
        api.getCoupons()
      ]);

      setReferrals(refList);

      // Filter earned coupons: coupons whose code starts with REF- or description mentions referral
      const refCoupons = allCoupons.filter(
        (c) => c.code.startsWith('REF-') || c.description?.toLowerCase().includes('referral')
      );
      setEarnedCoupons(refCoupons);
    } catch (err) {
      console.error('Error loading referral data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReferralData();
  }, [customerProfile?.id]);

  // Copy Handlers with fallback and visual feedback
  const handleCopyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralCode);
      } else {
        throw new Error('Fallback required');
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = referralCode;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopyCodeSuccess(true);
    setCopyToastMessage(`Referral code "${referralCode}" copied to clipboard!`);
    setTimeout(() => setCopyCodeSuccess(false), 3000);
    setTimeout(() => setCopyToastMessage(null), 3500);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        throw new Error('Fallback required');
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopyLinkSuccess(true);
    setCopyToastMessage('Referral link copied to clipboard! Ready to share with friends.');
    setTimeout(() => setCopyLinkSuccess(false), 3000);
    setTimeout(() => setCopyToastMessage(null), 3500);
  };

  const handleCopyCouponCode = async (code: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error('Fallback required');
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopiedCouponId(code);
    setCopyToastMessage(`Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCouponId(null), 2500);
    setTimeout(() => setCopyToastMessage(null), 3500);
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const text = `Hey! I use Diblo Urban Assist in Mumbai for trusted home & elderly care assistance. Use my referral link to get ₹100 OFF on your first booking: ${referralLink} or apply my referral code: ${referralCode}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Native share
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Diblo Urban Assist Referral',
          text: `Join Diblo Urban Assist and get ₹100 OFF on your first personal assistant booking in Mumbai! Referral code: ${referralCode}`,
          url: referralLink
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Create new referral invite
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccessMsg('');

    if (!inviteFriendName.trim()) {
      setInviteError('Please enter your friend’s name');
      return;
    }

    const cleanPhone = inviteFriendPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setInviteError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const res = await api.createReferral({
        friendName: inviteFriendName.trim(),
        friendPhone: cleanPhone.slice(-10),
        customerId: customerProfile?.id || currentUser?.id || 'customer',
        referrerName: customerProfile?.name || currentUser?.name || 'Customer'
      });

      if (res.success && res.referral) {
        setReferrals((prev) => [res.referral!, ...prev]);
        setInviteSuccessMsg(`Invite recorded for ${inviteFriendName}! You can now share your link directly with them.`);
        setInviteFriendName('');
        setInviteFriendPhone('');
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteSuccessMsg('');
        }, 2200);
      } else {
        setInviteError(res.error || 'Failed to record invite');
      }
    } catch {
      setInviteError('An unexpected error occurred');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Simulate friend booking completion (to showcase the reward workflow)
  const handleSimulateCompletion = async (referralId: string) => {
    setSimulatingId(referralId);
    try {
      const res = await api.completeReferral(
        referralId,
        'Hospital Visit OPD Queue Assistance & Doctor Escort'
      );

      if (res.success && res.rewardCoupon) {
        setCelebrationMessage(
          `🎉 Congratulations! Your referral was marked completed. ₹100 reward coupon "${res.rewardCoupon.code}" has been unlocked and added to your account!`
        );

        // Refresh lists
        await loadReferralData();

        setTimeout(() => {
          setCelebrationMessage(null);
        }, 6000);
      }
    } catch (err) {
      console.error('Failed to complete referral simulation', err);
    } finally {
      setSimulatingId(null);
    }
  };

  // Metrics
  const totalInvited = referrals.length;
  const completedReferrals = referrals.filter((r) => r.status === 'COMPLETED');
  const pendingReferrals = referrals.filter((r) => r.status !== 'COMPLETED');
  const totalRewardsEarned = completedReferrals.length * 100;

  // Filtered referrals
  const displayedReferrals = referrals.filter((r) => {
    if (activeFilter === 'COMPLETED') return r.status === 'COMPLETED';
    if (activeFilter === 'PENDING') return r.status !== 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Card: Refer & Earn Unique Link */}
      <div className="bg-gradient-to-br from-[#14213D] via-[#1F2E52] to-[#0F172A] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-[#F42F73]/20">
        {/* Decorative background glow */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#F42F73]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Title & Tagline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 bg-[#F42F73]/20 border border-[#F42F73]/40 text-[#F42F73] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                <Gift className="w-3.5 h-3.5" />
                <span>Referral Program • Mumbai Exclusive</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Invite Friends, Earn ₹100 Discount Coupons
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
                Share your personal referral link. When your friend completes their first assistant booking in Mumbai, you will immediately receive an exclusive <strong className="text-white">₹100 OFF discount coupon</strong> on your next booking!
              </p>
            </div>

            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#F42F73] hover:bg-[#D81B60] text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all shrink-0 min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Friend Directly</span>
            </button>
          </div>

          {/* Referral Code & Unique Link Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-2">
            {/* Referral Link Box */}
            <div className="lg:col-span-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[#F42F73]" />
                  <span>Your Unique Referral Link</span>
                </div>
                {copyLinkSuccess && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </span>
                )}
              </div>

              {/* Link Box & Copy to Clipboard Button Row */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div
                  onClick={handleCopyLink}
                  className="flex-1 bg-black/25 hover:bg-black/35 border border-white/15 hover:border-white/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2 cursor-pointer transition-colors group select-all"
                  title="Click to copy link"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-white shrink-0 transition-colors" />
                  <span className="text-xs sm:text-sm font-mono text-white truncate flex-1">
                    {referralLink}
                  </span>
                </div>

                {/* Primary 'Copy to Clipboard' Button */}
                <button
                  id="btn-copy-referral-link"
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 min-h-[44px] shrink-0 cursor-pointer ${
                    copyLinkSuccess
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300 scale-[1.02]'
                      : 'bg-white hover:bg-gray-100 text-[#14213D] shadow-sm'
                  }`}
                  title="Copy referral link to clipboard"
                >
                  {copyLinkSuccess ? (
                    <>
                      <CheckCheck className="w-4 h-4 text-white animate-in zoom-in-75 duration-200" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#F42F73]" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
              </div>

              {/* Additional Share Options */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-[11px] text-gray-300">
                  {copyLinkSuccess ? (
                    <span className="text-emerald-300 font-medium">✓ Link ready in clipboard. Paste anywhere to share!</span>
                  ) : (
                    'Share directly with family and friends in Mumbai:'
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleWhatsAppShare}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[36px]"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={handleNativeShare}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="More share options"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Referral Code Box */}
            <div className="lg:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                  Referral Code
                </div>
                {copyCodeSuccess && (
                  <span className="text-[11px] font-bold text-emerald-300 animate-in fade-in duration-200">
                    Copied!
                  </span>
                )}
              </div>

              <div className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-wider">
                {referralCode}
              </div>

              <button
                id="btn-copy-referral-code"
                onClick={handleCopyCode}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 min-h-[44px] cursor-pointer ${
                  copyCodeSuccess
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-300'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Copy referral code"
              >
                {copyCodeSuccess ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-white" />
                    <span>Code Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Step Explainer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                1
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Share Your Link</div>
                <div className="text-[11px] text-gray-300">Send via WhatsApp or copy your unique link.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                2
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Friend Books an Assistant</div>
                <div className="text-[11px] text-gray-300">They get ₹100 off on their first Mumbai booking.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#F42F73] text-white flex items-center justify-center text-xs font-black shrink-0">
                3
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Earn ₹100 Discount Coupon</div>
                <div className="text-[11px] text-gray-300">Unlocked instantly once their first booking completes!</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy to Clipboard Visual Feedback Notification */}
      {copyToastMessage && (
        <div className="bg-emerald-600 text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">{copyToastMessage}</div>
              <div className="text-[11px] text-emerald-100">You can paste and send this directly on WhatsApp, SMS, or email.</div>
            </div>
          </div>
          <button
            onClick={() => setCopyToastMessage(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Celebration Notification Banner */}
      {celebrationMessage && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-emerald-900 font-medium leading-relaxed">
            {celebrationMessage}
          </div>
          <button
            onClick={() => setCelebrationMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Referral Stats Summary Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Friends Invited</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-[#14213D]">{totalInvited}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Across WhatsApp & direct links</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Referrals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completedReferrals.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Booked & finished 1st service</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Coupons Earned</span>
            <Tag className="w-4 h-4 text-[#F42F73]" />
          </div>
          <div className="text-2xl font-black text-[#F42F73]">{earnedCoupons.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Valid on your upcoming bookings</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Value Saved</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">₹{totalRewardsEarned}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">₹100 per successful referral</div>
        </div>
      </div>

      {/* Earned Referral Coupons Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#14213D] flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#F42F73]" />
              <span>My Earned Referral Discount Coupons</span>
            </h3>
            <p className="text-xs text-gray-500">
              Exclusive discount coupons unlocked from your friends' completed bookings. Apply them at checkout!
            </p>
          </div>

          <div className="text-xs font-bold text-[#F42F73] bg-[#FFF0F5] px-3 py-1 rounded-full w-fit">
            {earnedCoupons.length} Active {earnedCoupons.length === 1 ? 'Reward' : 'Rewards'}
          </div>
        </div>

        {earnedCoupons.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Gift className="w-8 h-8 text-gray-300 mx-auto" />
            <div className="text-xs font-bold text-gray-600">No referral reward coupons earned yet</div>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Once an invited friend books and completes their first assistance booking, your ₹100 discount coupon will automatically appear right here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {earnedCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-gradient-to-br from-[#FFF0F5] to-white p-4 rounded-2xl border border-[#F42F73]/25 shadow-xs relative overflow-hidden flex flex-col justify-between gap-3"
              >
                {/* Top header of coupon */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 bg-[#F42F73] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      <Percent className="w-3 h-3" />
                      <span>₹{coupon.flatDiscount || coupon.maxDiscount} OFF</span>
                    </span>
                    <div className="text-sm font-mono font-black text-[#14213D] mt-1.5 tracking-wide">
                      {coupon.code}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyCouponCode(coupon.code)}
                    className="p-1.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#F42F73] text-xs transition-colors flex items-center gap-1 shrink-0"
                    title="Copy coupon code"
                  >
                    {copiedCouponId === coupon.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="text-xs text-gray-600 font-medium leading-relaxed">
                  {coupon.description}
                </div>

                {/* Bottom actions & expiry */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F42F73]/15 text-[11px]">
                  <span className="text-gray-400 font-medium">
                    Valid till {new Date(coupon.expiryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  <button
                    onClick={() => {
                      if (onOpenBookingWithCoupon) {
                        onOpenBookingWithCoupon(coupon.code);
                      } else {
                        handleCopyCouponCode(coupon.code);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#F42F73] hover:text-[#D81B60] transition-colors"
                  >
                    <span>Use on Next Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral Activity & Friends Status Tracker */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#14213D] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#14213D]" />
              <span>Friends Invited & Referral Status</span>
            </h3>
            <p className="text-xs text-gray-500">
              Track the progress of every friend you've invited to Diblo Urban Assist.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0">
            {(['ALL', 'COMPLETED', 'PENDING'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === filter
                    ? 'bg-white text-[#14213D] shadow-xs'
                    : 'text-gray-500 hover:text-[#14213D]'
                }`}
              >
                {filter === 'ALL' ? `All (${referrals.length})` : filter === 'COMPLETED' ? `Completed (${completedReferrals.length})` : `Pending (${pendingReferrals.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Referrals List */}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#F42F73]" />
            <span>Loading referral activity...</span>
          </div>
        ) : displayedReferrals.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
            <Users className="w-8 h-8 text-gray-300 mx-auto" />
            <div className="text-xs font-bold text-gray-700">No invitations matching this filter</div>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Invite your Mumbai friends and neighbors to get started. You'll earn ₹100 for each friend who completes a booking!
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-[#F42F73] text-white text-xs font-bold hover:bg-[#D81B60] transition-colors inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Friend Now</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayedReferrals.map((item) => {
              const isCompleted = item.status === 'COMPLETED';
              const isRegistered = item.status === 'REGISTERED';
              const isInvited = item.status === 'INVITED';

              return (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/75 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isRegistered
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.friendName.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#14213D]">
                          {item.friendName}
                        </span>

                        {/* Status Badge */}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Booking Completed • ₹100 Coupon Awarded</span>
                          </span>
                        )}
                        {isRegistered && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Signed Up • Booking In Progress</span>
                          </span>
                        )}
                        {isInvited && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Send className="w-3 h-3" />
                            <span>Invite Sent • Awaiting Sign Up</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-2 flex-wrap">
                        <span>+91 {item.friendPhone.slice(0, 3)}****{item.friendPhone.slice(-3)}</span>
                        <span>•</span>
                        <span>
                          Invited on {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {item.serviceBooked && (
                          <>
                            <span>•</span>
                            <span className="text-gray-700 font-medium truncate max-w-[240px]">
                              Booked: {item.serviceBooked}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status details */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isCompleted && item.rewardCouponCode && (
                      <div className="flex items-center gap-2 bg-[#FFF0F5] px-3 py-1.5 rounded-xl border border-[#F42F73]/20">
                        <Tag className="w-3.5 h-3.5 text-[#F42F73]" />
                        <span className="text-xs font-mono font-bold text-[#F42F73]">
                          {item.rewardCouponCode}
                        </span>
                        <button
                          onClick={() => handleCopyCouponCode(item.rewardCouponCode!)}
                          className="text-gray-500 hover:text-[#F42F73] text-[10px] font-bold underline ml-1"
                        >
                          {copiedCouponId === item.rewardCouponCode ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {!isCompleted && (
                      <button
                        onClick={() => handleSimulateCompletion(item.id)}
                        disabled={simulatingId === item.id}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-gray-200 text-[11px] font-bold text-gray-700 transition-all flex items-center gap-1.5"
                        title="Simulate friend booking completion to test reward issuance"
                      >
                        {simulatingId === item.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Simulate 1st Booking</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Friend Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[#F42F73] text-xs font-black uppercase">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Refer a Friend in Mumbai</span>
                </div>
                <h3 className="text-lg font-bold text-[#14213D]">Send Personal Invite</h3>
                <p className="text-xs text-gray-500">
                  Your friend will receive ₹100 off on their first booking, and you'll get a ₹100 coupon once they finish!
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {inviteSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-emerald-800">{inviteSuccessMsg}</div>
                <p className="text-[11px] text-emerald-700">Closing popup...</p>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#14213D] mb-1">
                    Friend's Full Name *
                  </label>
                  <input
                    type="text"
                    value={inviteFriendName}
                    onChange={(e) => setInviteFriendName(e.target.value)}
                    placeholder="e.g. Karan Patel"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14213D] mb-1">
                    Friend's Mobile / WhatsApp Number *
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 flex items-center min-h-[44px]">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={inviteFriendPhone}
                      onChange={(e) => setInviteFriendPhone(e.target.value)}
                      placeholder="9820123456"
                      maxLength={10}
                      className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-[11px] text-gray-500">
                  <span className="font-bold text-gray-700">Referral Code Attached: </span>
                  <span className="font-mono font-bold text-[#F42F73]">{referralCode}</span>
                </div>

                {inviteError && (
                  <div className="text-xs text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvite}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {isSubmittingInvite ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Invite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
