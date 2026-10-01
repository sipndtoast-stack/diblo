import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Briefcase,
  MapPin,
  FileText,
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Lock,
  Loader2,
  Camera,
  Trash2,
  FileCheck
} from 'lucide-react';
import { AssistantApplication } from '../../types';
import { api } from '../../lib/api';
import { SERVICES } from '../../data/mockData';
import { compressAndReadFile } from './AssistantProfileView';

interface AssistantOnboardingProps {
  onSuccess?: () => void;
  onBackToSelection?: () => void;
}

const MUMBAI_ZONES = [
  'Bandra West',
  'Andheri West',
  'Powai',
  'Colaba & South Mumbai',
  'Dadar & Prabhadevi',
  'Juhu',
  'Thane West',
  'Lower Parel',
  'Khar & Santacruz',
  'BKC (Bandra Kurla Complex)',
  'Ghatkopar & Chembur',
  'Borivali & Kandivali'
];

const LANGUAGES = [
  'Hindi',
  'Marathi',
  'English',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Bengali'
];

export const AssistantOnboarding: React.FC<AssistantOnboardingProps> = ({
  onSuccess,
  onBackToSelection
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadedFileNames, setUploadedFileNames] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState<Partial<AssistantApplication>>({
    fullName: '',
    mobileNumber: '',
    alternateMobile: '',
    email: '',
    dateOfBirth: '',
    gender: 'MALE',
    currentAddress: '',
    permanentAddress: '',
    mumbaiArea: 'Bandra West',
    pinCode: '400050',
    aadhaarNumber: '',
    panNumber: '',
    policeClearanceCert: 'Yes - Cleared by Mumbai Police',
    languagesSpoken: ['Hindi', 'English'],
    selectedServices: ['shopping-assistance', 'senior-citizen-assistance'],
    yearsOfExperience: 2,
    specialSkills: 'Patient, punctual, familiar with local train network and hospital OPDs.',
    preferredOperatingZones: ['Bandra West', 'BKC (Bandra Kurla Complex)'],
    availabilityType: 'FULL_TIME',
    preferredTimeSlots: ['Morning (8 AM - 2 PM)', 'Afternoon (2 PM - 8 PM)'],
    hasTwoWheeler: true,
    drivingLicenseNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Spouse/Parent',
    referenceName: '',
    referencePhone: '',
    hasCriminalRecord: false,
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    accountHolderName: '',
    profilePhoto: '',
    termsAccepted: false,
    codeOfConductAccepted: false
  });

  const updateField = (key: keyof AssistantApplication, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleOnboardingFileUpload = async (
    fieldKey: keyof AssistantApplication,
    e: React.ChangeEvent<HTMLInputElement>,
    maxDim = 900
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(String(fieldKey));
    setErrorMessage('');
    try {
      const { dataUrl, fileName } = await compressAndReadFile(file, maxDim);
      updateField(fieldKey, dataUrl);
      setUploadedFileNames((prev) => ({
        ...prev,
        [String(fieldKey)]: fileName
      }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload file. Please try another image or PDF.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const removeUploadedField = (fieldKey: keyof AssistantApplication) => {
    updateField(fieldKey, '');
    setUploadedFileNames((prev) => {
      const copy = { ...prev };
      delete copy[String(fieldKey)];
      return copy;
    });
  };

  const renderProfileAndDocumentsUploader = () => {
    const docUploadItems: {
      key: keyof AssistantApplication;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeStyle: string;
    }[] = [
      {
        key: 'aadhaarFrontDoc',
        title: 'Aadhaar Card (Front Side)',
        subtitle: 'Upload clear photo or PDF of Aadhaar front (under 5MB)',
        badgeText: 'Mandatory KYC Proof',
        badgeStyle: 'bg-emerald-100 text-emerald-800'
      },
      {
        key: 'aadhaarBackDoc',
        title: 'Aadhaar Card (Back Side)',
        subtitle: 'Upload clear photo or PDF of Aadhaar address side (under 5MB)',
        badgeText: 'Mandatory KYC Proof',
        badgeStyle: 'bg-emerald-100 text-emerald-800'
      },
      {
        key: 'panDoc',
        title: 'PAN Card Photo / PDF',
        subtitle: 'Upload front side of your 10-digit PAN Card',
        badgeText: 'Required for Payouts',
        badgeStyle: 'bg-blue-100 text-blue-800'
      },
      {
        key: 'bankPassbookDoc',
        title: 'Bank Passbook / Cancelled Cheque',
        subtitle: 'Showing Account Number & IFSC Code clearly',
        badgeText: 'For Weekly Payouts',
        badgeStyle: 'bg-amber-100 text-amber-800'
      },
      {
        key: 'addressProofDoc',
        title: 'Mumbai Address Proof / Police NOC',
        subtitle: 'Electricity Bill, Rent Agreement, Driving Licence or Police NOC',
        badgeText: 'Safety Verification',
        badgeStyle: 'bg-purple-100 text-purple-800'
      }
    ];

    return (
      <div className="space-y-6">
        {/* 1. Profile Photo Upload Box */}
        <div className="p-5 rounded-3xl border-2 border-[#F42F73]/30 bg-[#FFF0F5]/40 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="relative group shrink-0">
                {formData.profilePhoto ? (
                  <img
                    src={formData.profilePhoto}
                    alt="Profile Preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-md bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-[#F42F73] flex flex-col items-center justify-center text-[#F42F73] shadow-xs">
                    <Camera className="w-7 h-7 mb-0.5" />
                    <span className="text-[9px] font-black uppercase">Photo</span>
                  </div>
                )}

                <label
                  htmlFor="onboarding-profile-photo-camera"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#F42F73] hover:bg-[#D81B60] text-white flex items-center justify-center shadow-md cursor-pointer"
                  title="Upload Profile Photo"
                >
                  <Upload className="w-4 h-4" />
                  <input
                    id="onboarding-profile-photo-camera"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleOnboardingFileUpload('profilePhoto', e, 700)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#F42F73] text-white px-2.5 py-0.5 rounded-full">
                  <span>1. Assistant Profile Photo</span>
                </div>
                <h3 className="text-base font-black text-[#14213D]">
                  Upload Your Profile Photo (Selfie / Passport Size)
                </h3>
                <p className="text-xs text-gray-500">
                  Click the button to upload a photo from your phone gallery or camera for your Diblo EPL ID card.
                </p>
                {uploadedFileNames.profilePhoto && (
                  <div className="text-xs font-bold text-emerald-700 flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Uploaded: {uploadedFileNames.profilePhoto}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto shrink-0">
              <label
                htmlFor="onboarding-profile-photo-btn"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-[#F42F73]/25 cursor-pointer transition-all min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {uploadingField === 'profilePhoto'
                    ? 'Uploading Photo...'
                    : formData.profilePhoto
                    ? 'Change Profile Photo'
                    : 'Upload Profile Photo'}
                </span>
                <input
                  id="onboarding-profile-photo-btn"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleOnboardingFileUpload('profilePhoto', e, 700)}
                  className="hidden"
                />
              </label>

              {formData.profilePhoto && (
                <button
                  type="button"
                  onClick={() => removeUploadedField('profilePhoto')}
                  className="px-3 py-3 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 text-xs font-bold flex items-center gap-1"
                  title="Remove Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Optional Direct Image URL Input */}
          <div className="pt-3 border-t border-[#F42F73]/15">
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Or paste a Profile Photo URL (Optional)
            </label>
            <input
              type="text"
              value={
                formData.profilePhoto?.startsWith('data:')
                  ? ''
                  : formData.profilePhoto || ''
              }
              onChange={(e) => updateField('profilePhoto', e.target.value)}
              placeholder="https://... or use the Upload Profile Photo button above"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-white"
            />
          </div>
        </div>

        {/* 2. KYC & Verification Document Upload Cards */}
        <div>
          <h3 className="text-sm font-black text-[#14213D] uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#F42F73]" />
            <span>Upload Verification & KYC Documents</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {docUploadItems.map((item) => {
              const fieldVal = String(formData[item.key] || '');
              const isUploaded = Boolean(fieldVal);
              const isImage = fieldVal.startsWith('data:image/');
              const fileName =
                uploadedFileNames[String(item.key)] ||
                (isUploaded ? `${item.title} Uploaded` : '');

              return (
                <div
                  key={String(item.key)}
                  className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col justify-between space-y-3 ${
                    isUploaded
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-gray-200 hover:border-[#F42F73] bg-gray-50/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-black text-[#14213D]">{item.title}</div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isUploaded
                            ? 'bg-emerald-600 text-white'
                            : item.badgeStyle
                        }`}
                      >
                        {isUploaded ? 'Uploaded ✓' : item.badgeText}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">{item.subtitle}</div>

                    {/* Preview if uploaded */}
                    {isUploaded && (
                      <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImage ? (
                            <img
                              src={fieldVal}
                              alt={item.title}
                              className="w-11 h-11 rounded-lg object-cover border border-emerald-300 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileCheck className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-emerald-950 truncate">
                              {fileName}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              Ready for submission
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeUploadedField(item.key)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 shrink-0"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <label
                      htmlFor={`onboarding-upload-${String(item.key)}`}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[40px] ${
                        isUploaded
                          ? 'bg-white hover:bg-gray-100 text-[#14213D] border border-emerald-300'
                          : 'bg-[#14213D] hover:bg-[#1E293B] text-white shadow-xs'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5 text-[#F42F73]" />
                      <span>
                        {uploadingField === String(item.key)
                          ? 'Uploading...'
                          : isUploaded
                          ? 'Replace / Re-upload File'
                          : `Upload ${item.title}`}
                      </span>
                      <input
                        id={`onboarding-upload-${String(item.key)}`}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleOnboardingFileUpload(item.key, e, 1000)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const toggleArrayItem = (key: 'languagesSpoken' | 'selectedServices' | 'preferredOperatingZones' | 'preferredTimeSlots', item: string) => {
    const list = (formData[key] as string[]) || [];
    if (list.includes(item)) {
      updateField(key, list.filter((i) => i !== item));
    } else {
      updateField(key, [...list, item]);
    }
  };

  // Step Validations
  const validateStep = (step: number): boolean => {
    setErrorMessage('');
    if (step === 1) {
      if (!formData.fullName?.trim()) {
        setErrorMessage('Full name is required');
        return false;
      }
      const cleanPhone = formData.mobileNumber?.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length !== 10) {
        setErrorMessage('Valid 10-digit mobile number is required');
        return false;
      }
      if (!formData.email?.includes('@')) {
        setErrorMessage('Valid email address is required');
        return false;
      }
      if (!formData.currentAddress?.trim()) {
        setErrorMessage('Current Mumbai address is required');
        return false;
      }
    } else if (step === 2) {
      const cleanAadhaar = formData.aadhaarNumber?.replace(/\D/g, '');
      if (!cleanAadhaar || cleanAadhaar.length !== 12) {
        setErrorMessage('Valid 12-digit Aadhaar number is required');
        return false;
      }
      if (!formData.panNumber || formData.panNumber.length < 10) {
        setErrorMessage('Valid 10-character PAN number is required');
        return false;
      }
    } else if (step === 3) {
      if (!formData.languagesSpoken || formData.languagesSpoken.length === 0) {
        setErrorMessage('Please select at least one language');
        return false;
      }
      if (!formData.selectedServices || formData.selectedServices.length === 0) {
        setErrorMessage('Please select at least one service expertise');
        return false;
      }
    } else if (step === 4) {
      if (!formData.preferredOperatingZones || formData.preferredOperatingZones.length === 0) {
        setErrorMessage('Please select at least one Mumbai operating zone');
        return false;
      }
    } else if (step === 5) {
      if (!formData.emergencyContactName?.trim()) {
        setErrorMessage('Emergency contact name is required');
        return false;
      }
      const cleanEmergPhone = formData.emergencyContactPhone?.replace(/\D/g, '');
      if (!cleanEmergPhone || cleanEmergPhone.length !== 10) {
        setErrorMessage('Valid 10-digit emergency contact phone is required');
        return false;
      }
    } else if (step === 6) {
      if (!formData.accountHolderName?.trim() || !formData.bankAccountNumber?.trim() || !formData.bankIfscCode?.trim()) {
        setErrorMessage('All bank account details (Name, Account Number, IFSC) are required');
        return false;
      }
    } else if (step === 7) {
      // Step 7: Documents / Photo
    } else if (step === 8) {
      if (!formData.termsAccepted || !formData.codeOfConductAccepted) {
        setErrorMessage('You must accept the Diblo Partner Terms and Code of Conduct');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 8));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setErrorMessage('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(8)) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.applyAssistant(formData as any);
      if (res.success) {
        setSubmittedAppId(res.applicationNumber || 'DIBLO-PARTNER');
        setIsSuccess(true);
      } else {
        setErrorMessage(res.error || 'Failed to submit application. Please check details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Personal Info' },
    { num: 2, title: 'KYC & Aadhaar' },
    { num: 3, title: 'Skills & Services' },
    { num: 4, title: 'Zones & Hours' },
    { num: 5, title: 'References' },
    { num: 6, title: 'Bank Account' },
    { num: 7, title: 'Documents' },
    { num: 8, title: 'Agreement' }
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 font-sans text-[#14213D]">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center border border-gray-100 shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#F42F73]">
              Application Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#14213D]">
              Welcome to Diblo Mumbai!
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Your application <strong className="font-mono text-[#14213D]">({submittedAppId})</strong> has been registered with our operations desk. Our Bandra verification officer will review your KYC documents within 24 hours.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-gray-100">
            <div className="font-bold text-[#14213D] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Next Steps in Onboarding:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-gray-500 text-[11px]">
              <li>Identity & Mumbai Police Verification check</li>
              <li>Operational briefing at Bandra Kurla Complex office or via phone</li>
              <li>EPL Assistant ID badge generation & task dispatch access</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (onSuccess) onSuccess();
                else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/assistance-login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#14213D] hover:bg-black text-white font-bold text-xs transition-colors"
            >
              Go to Assistance Login
            </button>
            <button
              onClick={() => {
                if (onBackToSelection) onBackToSelection();
                else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#14213D] flex flex-col justify-between font-sans selection:bg-[#F42F73] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-gray-100 py-3.5 px-4 sm:px-8 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onBackToSelection) onBackToSelection();
                else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-[#14213D] lowercase tracking-tight">diblo<span className="text-[#F42F73]">.</span></span>
                <span className="bg-[#FFF0F5] text-[#F42F73] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Partner Onboarding
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="hidden sm:inline">Earn up to ₹35,000/month in Mumbai</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
              Step {currentStep} of 8
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10">
        {/* Progress Stepper Bar */}
        <div className="mb-8">
          <div className="grid grid-cols-8 gap-1 mb-2">
            {stepsList.map((s) => (
              <div
                key={s.num}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= s.num ? 'bg-[#F42F73]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="text-[#F42F73] font-black">{stepsList[currentStep - 1].title}</span>
            <span>Step {currentStep} of 8</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs font-medium text-rose-800 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Step Container Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xl shadow-black/5">
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 1: Personal Information
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Tell us about yourself so we can create your Assistant profile.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    value={formData.fullName || ''}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="As on Aadhaar / PAN"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Primary Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobileNumber || ''}
                    onChange={(e) => updateField('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Alternate Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.alternateMobile || ''}
                    onChange={(e) => updateField('alternateMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Secondary contact"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth || '1998-05-15'}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender || 'MALE'}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Residential Address in Mumbai *</label>
                  <textarea
                    rows={2}
                    value={formData.currentAddress || ''}
                    onChange={(e) => updateField('currentAddress', e.target.value)}
                    placeholder="House/Room No, Building Name, Street, Landmark"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Area / Neighborhood *</label>
                    <select
                      value={formData.mumbaiArea || 'Bandra West'}
                      onChange={(e) => updateField('mumbaiArea', e.target.value)}
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                    >
                      {MUMBAI_ZONES.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pin Code *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pinCode || ''}
                      onChange={(e) => updateField('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 400050"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: KYC & IDENTITY VERIFICATION */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 2: KYC & Identification Details
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Required for 100% police clearance and verified assistant badge issuance.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Aadhaar Card Number (12 Digits) *</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={formData.aadhaarNumber || ''}
                    onChange={(e) => updateField('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="Enter 12-digit UIDAI number"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium tracking-wider focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Used strictly for identity matching; encrypted and compliant with DPDP guidelines.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">PAN Card Number (10 Characters) *</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.panNumber || ''}
                    onChange={(e) => updateField('panNumber', e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium uppercase tracking-wider focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mumbai Police Clearance Certificate (PCC) Status *</label>
                  <select
                    value={formData.policeClearanceCert || 'Yes - Cleared by Mumbai Police'}
                    onChange={(e) => updateField('policeClearanceCert', e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  >
                    <option value="Yes - Cleared by Mumbai Police">Already cleared by Mumbai Police</option>
                    <option value="Applied / In Process">Applied - Token in hand</option>
                    <option value="Diblo Assistance Requested">Need Diblo Desk help for verification</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF0F5] border border-[#F42F73]/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#F42F73] shrink-0 mt-0.5" />
                <div className="text-xs text-[#14213D] leading-relaxed">
                  <strong>Diblo Safety Standard:</strong> Every active assistant receives a digital verified badge that is checked by customers before tasks begin.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SKILLS & SERVICES */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 3: Skills & Service Expertise
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Select which Diblo assistance tasks you are confident delivering.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Languages Spoken fluently in Mumbai *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LANGUAGES.map((lang) => {
                    const isSelected = formData.languagesSpoken?.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleArrayItem('languagesSpoken', lang)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#14213D] text-white border-[#14213D]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span>{lang}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Select Services you want to perform *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SERVICES.slice(0, 8).map((svc) => {
                    const isSelected = formData.selectedServices?.includes(svc.id);
                    return (
                      <div
                        key={svc.id}
                        onClick={() => toggleArrayItem('selectedServices', svc.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-[#FFF0F5] border-[#F42F73] text-[#14213D]'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 accent-[#F42F73]"
                        />
                        <div className="text-xs">
                          <div className="font-bold">{svc.title}</div>
                          <div className="text-[11px] text-gray-500 line-clamp-1">{svc.tagline}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Years of Urban/Care Experience</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={formData.yearsOfExperience ?? 1}
                    onChange={(e) => updateField('yearsOfExperience', parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Special Strengths / Training</label>
                  <input
                    type="text"
                    value={formData.specialSkills || ''}
                    onChange={(e) => updateField('specialSkills', e.target.value)}
                    placeholder="e.g. First-aid trained, elder patience"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: AVAILABILITY & OPERATING ZONES */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 4: Operating Zones & Timing
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Choose the areas in Mumbai where you are ready to take on-demand bookings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Preferred Mumbai Operating Zones *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MUMBAI_ZONES.map((zone) => {
                    const isSelected = formData.preferredOperatingZones?.includes(zone);
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => toggleArrayItem('preferredOperatingZones', zone)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#F42F73] text-white border-[#F42F73] font-bold'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="truncate">{zone}</span>
                        {isSelected && <span className="ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Availability Type *</label>
                  <select
                    value={formData.availabilityType || 'FULL_TIME'}
                    onChange={(e) => updateField('availabilityType', e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  >
                    <option value="FULL_TIME">Full Time (40+ hours/week)</option>
                    <option value="PART_TIME">Part Time (20-30 hours/week)</option>
                    <option value="WEEKENDS_ONLY">Weekends Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Two-Wheeler (Bike / Scooter)</label>
                  <select
                    value={formData.hasTwoWheeler ? 'YES' : 'NO'}
                    onChange={(e) => updateField('hasTwoWheeler', e.target.value === 'YES')}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  >
                    <option value="YES">Yes, I own a 2-wheeler with valid license</option>
                    <option value="NO">No, I travel by Mumbai Local / Metro / BEST</option>
                  </select>
                </div>
              </div>

              {formData.hasTwoWheeler && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driving License Number</label>
                  <input
                    type="text"
                    value={formData.drivingLicenseNumber || ''}
                    onChange={(e) => updateField('drivingLicenseNumber', e.target.value.toUpperCase())}
                    placeholder="MH-02-2020-XXXXXXX"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 5: BACKGROUND & EMERGENCY REFERENCES */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 5: Background & Emergency Contacts
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Required for emergency SOS protocols while on live tasks in Mumbai.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Contact Name *</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName || ''}
                    onChange={(e) => updateField('emergencyContactName', e.target.value)}
                    placeholder="Family member name"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Relationship *</label>
                  <input
                    type="text"
                    value={formData.emergencyContactRelation || ''}
                    onChange={(e) => updateField('emergencyContactRelation', e.target.value)}
                    placeholder="e.g. Spouse / Brother / Father"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone || ''}
                    onChange={(e) => updateField('emergencyContactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Professional Reference Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.referenceName || ''}
                    onChange={(e) => updateField('referenceName', e.target.value)}
                    placeholder="Past employer or neighbor"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reference Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.referencePhone || ''}
                    onChange={(e) => updateField('referencePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <input
                    id="chk-criminal"
                    type="checkbox"
                    checked={!formData.hasCriminalRecord}
                    onChange={(e) => updateField('hasCriminalRecord', !e.target.checked)}
                    className="accent-[#F42F73] w-4 h-4"
                  />
                  <label htmlFor="chk-criminal" className="text-xs font-bold text-gray-700 cursor-pointer">
                    I declare that I have NO criminal records or pending court cases across India.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: BANK ACCOUNT & PAYOUTS */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 6: Bank Account for Weekly Payouts
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Diblo pays assistants on time every Tuesday directly into your verified bank account.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bank Account Holder Name *</label>
                  <input
                    type="text"
                    value={formData.accountHolderName || ''}
                    onChange={(e) => updateField('accountHolderName', e.target.value)}
                    placeholder="Must match your Aadhaar / PAN"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      value={formData.bankName || ''}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.bankIfscCode || ''}
                      onChange={(e) => updateField('bankIfscCode', e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium uppercase tracking-wider focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bank Account Number *</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber || ''}
                    onChange={(e) => updateField('bankAccountNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter account number"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-medium tracking-wider focus:ring-2 focus:ring-[#F42F73] focus:border-transparent outline-none bg-gray-50/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: DOCUMENTS & PROFILE PHOTO */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 7: Profile Photo & Verification Documents
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Upload a clear selfie or passport-style headshot and your KYC documents for your Diblo EPL ID badge.
                </p>
              </div>

              {renderProfileAndDocumentsUploader()}
            </div>
          )}

          {/* STEP 8: PARTNER AGREEMENT & CODE OF CONDUCT */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                  Step 8: Profile Photo, Documents & Partner Agreement
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Upload or verify your profile photo and documents below, then accept the terms of engagement with Diblo Technologies Pvt. Ltd.
                </p>
              </div>

              {/* Allow uploading Profile Photo & Documents directly on the last page (Step 8) as well */}
              {renderProfileAndDocumentsUploader()}

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-3 max-h-56 overflow-y-auto">
                <div className="font-bold text-[#14213D]">Diblo Assistant Code of Conduct Summary:</div>
                <p>1. <strong>Punctuality & Respect:</strong> Arrive at the client’s designated Mumbai address 5 minutes prior to scheduled booking start time.</p>
                <p>2. <strong>Start OTP Enforcement:</strong> Never request or start billing without the customer explicitly providing their secure 4-digit verification OTP.</p>
                <p>3. <strong>Safety & Dignity:</strong> Treat every client, elder, hospital patient, and child with absolute patience, courtesy, and dignity.</p>
                <p>4. <strong>Zero Tolerance:</strong> Strict zero-tolerance policy against theft, verbal harassment, intoxication, or unauthorized cash demands outside the Diblo hourly rate.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    id="chk-terms"
                    type="checkbox"
                    checked={!!formData.termsAccepted}
                    onChange={(e) => updateField('termsAccepted', e.target.checked)}
                    className="mt-1 accent-[#F42F73] w-4 h-4"
                  />
                  <label htmlFor="chk-terms" className="text-xs font-bold text-gray-700 cursor-pointer">
                    I agree to Diblo Partner Terms & Conditions and understand payouts are processed weekly at ₹149/hour platform metrics.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="chk-conduct"
                    type="checkbox"
                    checked={!!formData.codeOfConductAccepted}
                    onChange={(e) => updateField('codeOfConductAccepted', e.target.checked)}
                    className="mt-1 accent-[#F42F73] w-4 h-4"
                  />
                  <label htmlFor="chk-conduct" className="text-xs font-bold text-gray-700 cursor-pointer">
                    I solemnly agree to adhere to the Mumbai Police clearance and Assistant Code of Conduct.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-8 mt-8 border-t border-gray-100 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-5 py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 8 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold shadow-md shadow-[#F42F73]/25 flex items-center gap-1.5 transition-all"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-[#14213D] hover:bg-black text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#F42F73]" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Assistant Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
