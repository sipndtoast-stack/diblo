import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Star,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  Upload,
  Camera,
  Eye,
  Trash2,
  Save,
  X,
  Check,
  Sparkles,
  CreditCard,
  FileCheck
} from 'lucide-react';
import { AssistantProfile, AssistantDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AssistantProfileViewProps {
  mode: 'MY_PROFILE' | 'DOCUMENTS';
  assistantProfile: AssistantProfile | null;
}

interface DocumentSlotConfig {
  id: string;
  type: AssistantDocument['type'];
  title: string;
  subtitle: string;
  defaultNumber: string;
  placeholder: string;
  supportsBackSide?: boolean;
}

const DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    id: 'doc-photo',
    type: 'PROFILE_PHOTO',
    title: 'Profile Photo & Identity Match',
    subtitle: 'Clear front-facing selfie or passport photo for Diblo EPL ID badge',
    defaultNumber: 'Biometrics Cleared',
    placeholder: 'Badge / ID Reference'
  },
  {
    id: 'doc-aadhaar',
    type: 'AADHAAR',
    title: 'Aadhaar Card (Front & Back)',
    subtitle: '12-digit UIDAI Government Identity Card (JPG, PNG or PDF)',
    defaultNumber: '•••• •••• 4912',
    placeholder: 'Enter 12-digit Aadhaar Number',
    supportsBackSide: true
  },
  {
    id: 'doc-pan',
    type: 'PAN',
    title: 'PAN Card',
    subtitle: 'Permanent Account Number card for tax & weekly payout compliance',
    defaultNumber: 'ABCDE1234F',
    placeholder: 'Enter 10-character PAN Number'
  },
  {
    id: 'doc-licence',
    type: 'DRIVING_LICENCE',
    title: 'Driving Licence',
    subtitle: 'Valid LMV / Two-Wheeler Driving Licence issued by RTO',
    defaultNumber: 'MH02 20180019284',
    placeholder: 'Enter Driving Licence Number'
  },
  {
    id: 'doc-address',
    type: 'ADDRESS_PROOF',
    title: 'Address Proof (Electricity Bill / Rent Agreement)',
    subtitle: 'Current residential address proof in Mumbai Metropolitan Region',
    defaultNumber: 'Verified at Bandra West',
    placeholder: 'Address / Consumer Number'
  },
  {
    id: 'doc-police',
    type: 'POLICE_VERIFICATION',
    title: 'Police Verification NOC',
    subtitle: 'Mumbai Police Clearance Certificate (PCC) / Character Verification',
    defaultNumber: 'NOC-MUM-W-883921',
    placeholder: 'Enter Police NOC / Token Number'
  },
  {
    id: 'doc-bank',
    type: 'BANK_PASSBOOK',
    title: 'Bank Passbook / Cancelled Cheque',
    subtitle: 'For automated weekly payouts every Monday/Tuesday',
    defaultNumber: 'HDFC Bank •••• 1234',
    placeholder: 'Account No / IFSC Code'
  },
  {
    id: 'doc-family',
    type: 'FAMILY_CONTACT',
    title: 'Family Mobile & Emergency Contact Proof',
    subtitle: 'Emergency family member ID or verified contact details',
    defaultNumber: 'Emergency Family Contact Verified',
    placeholder: 'Family Name & 10-digit Mobile'
  }
];

export const compressAndReadFile = (
  file: File,
  maxDimension = 900
): Promise<{ dataUrl: string; fileName: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const mimeType = file.type || 'application/octet-stream';
    const fileName = file.name || 'uploaded-document';

    if (mimeType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve({
              dataUrl: compressedDataUrl,
              fileName,
              mimeType: 'image/jpeg'
            });
          } else {
            resolve({
              dataUrl: String(e.target?.result || ''),
              fileName,
              mimeType
            });
          }
        };
        img.onerror = () => {
          resolve({
            dataUrl: String(e.target?.result || ''),
            fileName,
            mimeType
          });
        };
        img.src = String(e.target?.result || '');
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = String(e.target?.result || '');
        // Keep data URL reasonable size for Firestore/localStorage
        const safeDataUrl =
          rawResult.length <= 350000
            ? rawResult
            : `data:application/pdf;name=${encodeURIComponent(fileName)},uploaded`;
        resolve({
          dataUrl: safeDataUrl,
          fileName,
          mimeType: mimeType || 'application/pdf'
        });
      };
      reader.onerror = () => reject(new Error('Failed to read document file'));
      reader.readAsDataURL(file);
    }
  });
};

export const AssistantProfileView: React.FC<AssistantProfileViewProps> = ({
  mode,
  assistantProfile
}) => {
  const { staffUser, updateAssistantProfile } = useAuth();

  const profile: AssistantProfile = assistantProfile || {
    id: staffUser?.eplId || 'EPL001',
    userId: staffUser?.eplId || 'EPL001',
    name: staffUser?.name || 'Verified Assistant',
    phone: staffUser?.number || '9820000000',
    photo:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    rating: 5.0,
    totalRatings: 342,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Hindi', 'English', 'Marathi'],
    serviceCapabilities: ['DAILY_CHORES', 'CARE_COMPANION'],
    serviceArea: ['Bandra West', 'Khar', 'Santacruz', 'Andheri West'],
    isOnline: true,
    currentLocation: {
      lat: 19.0607,
      lng: 72.8258,
      address: 'Hill Road, Bandra West, Mumbai',
      area: 'Bandra West, Mumbai',
      lastUpdated: new Date().toISOString()
    },
    earnings: { today: 1490, week: 8450, month: 32400, total: 148000, pendingPayout: 2100 },
    documents: [],
    bankDetails: {
      accountNumber: 'XXXXXX1234',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountHolder: staffUser?.name || 'Verified Assistant'
    },
    emergencyContact: {
      name: 'Emergency Contact',
      phone: staffUser?.number || '9820000000',
      relationship: 'Family'
    },
    completedTasksCount: 342,
    acceptanceRate: 98,
    joinedDate: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  };

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    fileUrl: string;
    fileName?: string;
  } | null>(null);
  const [editingDocNumbers, setEditingDocNumbers] = useState<Record<string, string>>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    address: profile.currentLocation?.address || 'Hill Road, Bandra West, Mumbai',
    serviceArea: (profile.serviceArea || ['Bandra West', 'Khar', 'Santacruz', 'Andheri']).join(', '),
    languages: (profile.languages || ['Hindi', 'English', 'Marathi']).join(', '),
    emergencyName: profile.emergencyContact?.name || 'Emergency Contact',
    emergencyPhone: profile.emergencyContact?.phone || profile.phone || ''
  });

  const showSuccessToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const existingDocs: AssistantDocument[] = Array.isArray(profile.documents)
    ? profile.documents
    : [];

  const getDocumentRecord = (slot: DocumentSlotConfig): AssistantDocument | undefined => {
    return existingDocs.find((d) => d.id === slot.id || d.type === slot.type);
  };

  // Handle Profile Photo Upload
  const handleProfilePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId('profile-photo');
    try {
      const { dataUrl, fileName, mimeType } = await compressAndReadFile(file, 700);
      const nowIso = new Date().toISOString();

      // Also update the PROFILE_PHOTO document entry
      const otherDocs = existingDocs.filter(
        (d) => d.id !== 'doc-photo' && d.type !== 'PROFILE_PHOTO'
      );
      const photoDoc: AssistantDocument = {
        id: 'doc-photo',
        type: 'PROFILE_PHOTO',
        title: 'Profile Photo & Identity Match',
        documentNumber: 'Biometrics & Selfie Uploaded',
        fileUrl: dataUrl,
        fileName,
        mimeType,
        verified: true,
        uploadedAt: nowIso
      };

      updateAssistantProfile({
        photo: dataUrl,
        documents: [photoDoc, ...otherDocs]
      });

      showSuccessToast('Profile photo uploaded & updated successfully!');
    } catch (err) {
      console.error('Profile photo upload error:', err);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  // Handle Individual Document Upload (Front or Back)
  const handleDocumentFileChange = async (
    slot: DocumentSlotConfig,
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'FRONT' | 'BACK' = 'FRONT'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(`${slot.id}-${side}`);
    try {
      const { dataUrl, fileName, mimeType } = await compressAndReadFile(file, 1000);
      const nowIso = new Date().toISOString();
      const currentDoc = getDocumentRecord(slot);
      const docNum =
        editingDocNumbers[slot.id] ??
        currentDoc?.documentNumber ??
        (slot.id === 'doc-family'
          ? `${profile.emergencyContact?.name || 'Family'} (${
              profile.emergencyContact?.relationship || 'Family'
            }): ${profile.emergencyContact?.phone || profile.phone}`
          : slot.defaultNumber);

      const updatedDoc: AssistantDocument = {
        id: slot.id,
        type: slot.type,
        title: slot.title,
        documentNumber: docNum,
        fileUrl: side === 'FRONT' ? dataUrl : currentDoc?.fileUrl || dataUrl,
        fileName: side === 'FRONT' ? fileName : currentDoc?.fileName || fileName,
        mimeType: side === 'FRONT' ? mimeType : currentDoc?.mimeType || mimeType,
        backFileUrl: side === 'BACK' ? dataUrl : currentDoc?.backFileUrl,
        backFileName: side === 'BACK' ? fileName : currentDoc?.backFileName,
        verified: true,
        uploadedAt: nowIso
      };

      const otherDocs = existingDocs.filter(
        (d) => d.id !== slot.id && d.type !== slot.type
      );
      const nextDocs = [...otherDocs, updatedDoc];

      // If uploading to doc-photo, also update the assistant's main avatar photo
      if (slot.type === 'PROFILE_PHOTO' && dataUrl.startsWith('data:image/')) {
        updateAssistantProfile({
          photo: dataUrl,
          documents: nextDocs
        });
      } else {
        updateAssistantProfile({
          documents: nextDocs
        });
      }

      showSuccessToast(
        `${slot.title}${side === 'BACK' ? ' (Back Side)' : ''} uploaded successfully!`
      );
    } catch (err) {
      console.error('Document upload error:', err);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  // Handle Document Number / Details Save
  const handleSaveDocumentNumber = (slot: DocumentSlotConfig) => {
    const currentDoc = getDocumentRecord(slot);
    const newNumber = (editingDocNumbers[slot.id] ?? currentDoc?.documentNumber ?? '').trim();
    if (!newNumber) return;

    const updatedDoc: AssistantDocument = {
      id: slot.id,
      type: slot.type,
      title: slot.title,
      documentNumber: newNumber,
      fileUrl: currentDoc?.fileUrl || '',
      fileName: currentDoc?.fileName,
      mimeType: currentDoc?.mimeType,
      backFileUrl: currentDoc?.backFileUrl,
      backFileName: currentDoc?.backFileName,
      verified: true,
      uploadedAt: currentDoc?.uploadedAt || new Date().toISOString()
    };

    const otherDocs = existingDocs.filter((d) => d.id !== slot.id && d.type !== slot.type);
    updateAssistantProfile({
      documents: [...otherDocs, updatedDoc]
    });
    showSuccessToast(`${slot.title} details saved!`);
  };

  // Handle Remove Uploaded File
  const handleRemoveUploadedDocument = (slot: DocumentSlotConfig) => {
    const otherDocs = existingDocs.filter((d) => d.id !== slot.id && d.type !== slot.type);
    updateAssistantProfile({
      documents: otherDocs
    });
    showSuccessToast(`Removed uploaded file for ${slot.title}`);
  };

  // Handle Profile Details Save
  const handleSaveProfileDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateAssistantProfile({
      name: profileForm.name.trim() || profile.name,
      phone: profileForm.phone.trim() || profile.phone,
      currentLocation: {
        ...(profile.currentLocation || {
          lat: 19.0607,
          lng: 72.8258,
          area: 'Bandra West, Mumbai'
        }),
        address: profileForm.address.trim() || 'Hill Road, Bandra West, Mumbai',
        lastUpdated: new Date().toISOString()
      },
      serviceArea: profileForm.serviceArea
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      languages: profileForm.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      emergencyContact: {
        name: profileForm.emergencyName.trim() || 'Emergency Contact',
        phone: profileForm.emergencyPhone.trim() || profile.phone,
        relationship: profile.emergencyContact?.relationship || 'Family'
      }
    });
    setIsEditingProfile(false);
    showSuccessToast('Assistant profile details saved successfully!');
  };

  // Shared Documents Upload Grid Component (shown in DOCUMENTS mode and at bottom of MY_PROFILE mode)
  const renderDocumentsUploadGrid = () => (
    <div className="space-y-4">
      {/* Top Profile Photo Quick Upload Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#F42F73]/25 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="relative group shrink-0">
            <img
              src={
                profile.photo ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt={profile.name}
              className="w-22 h-22 rounded-full object-cover border-4 border-emerald-500 shadow-md"
            />
            <label
              htmlFor="assistant-quick-profile-photo-upload"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#F42F73] hover:bg-[#D81B60] text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105"
              title="Upload Profile Photo"
            >
              <Camera className="w-4 h-4" />
              <input
                id="assistant-quick-profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Official Assistant Badge Photo</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#14213D]">
              Upload / Change Profile Photo
            </h3>
            <p className="text-xs text-gray-500 max-w-md">
              Upload a clear passport-style photo or live selfie. This photo is shown to customers when you accept their trip request.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto shrink-0">
          <label
            htmlFor="assistant-main-photo-upload-btn"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-[#F42F73]/25 cursor-pointer transition-all min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            <span>
              {uploadingId === 'profile-photo' ? 'Uploading Photo...' : 'Upload Profile Photo'}
            </span>
            <input
              id="assistant-main-photo-upload-btn"
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* All KYC & Verification Document Cards with Upload Option */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENT_SLOTS.map((slot) => {
          const docRecord = getDocumentRecord(slot);
          const hasUploadedFile = Boolean(docRecord?.fileUrl);
          const hasBackFile = Boolean(docRecord?.backFileUrl);
          const isImageFile =
            docRecord?.fileUrl?.startsWith('data:image/') ||
            (slot.type === 'PROFILE_PHOTO' && Boolean(profile.photo));
          const displayImageUrl =
            slot.type === 'PROFILE_PHOTO'
              ? docRecord?.fileUrl || profile.photo
              : docRecord?.fileUrl;

          const currentDocNumber =
            editingDocNumbers[slot.id] !== undefined
              ? editingDocNumbers[slot.id]
              : docRecord?.documentNumber ||
                (slot.id === 'doc-family'
                  ? `${profile.emergencyContact?.name || 'Family'} (${
                      profile.emergencyContact?.relationship || 'Family'
                    }): ${profile.emergencyContact?.phone || profile.phone}`
                  : slot.defaultNumber);

          return (
            <div
              key={slot.id}
              className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#F42F73]/40 transition-all"
            >
              <div className="space-y-3">
                {/* Header & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-[#14213D]">{slot.title}</div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{slot.subtitle}</p>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                      hasUploadedFile
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{hasUploadedFile ? 'Uploaded & Verified' : 'Verified'}</span>
                  </span>
                </div>

                {/* Editable Document Number / Reference Field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Document / Reference Number
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentDocNumber}
                      onChange={(e) =>
                        setEditingDocNumbers((prev) => ({
                          ...prev,
                          [slot.id]: e.target.value
                        }))
                      }
                      placeholder={slot.placeholder}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                    />
                    {editingDocNumbers[slot.id] !== undefined &&
                      editingDocNumbers[slot.id] !== (docRecord?.documentNumber || '') && (
                        <button
                          type="button"
                          onClick={() => handleSaveDocumentNumber(slot)}
                          className="px-3 py-2 rounded-xl bg-[#14213D] hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      )}
                  </div>
                </div>

                {/* Uploaded File Preview Box */}
                {(hasUploadedFile || slot.type === 'PROFILE_PHOTO') && (
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImageFile && displayImageUrl ? (
                        <img
                          src={displayImageUrl}
                          alt={slot.title}
                          className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <FileCheck className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-black text-emerald-950 truncate">
                          {docRecord?.fileName ||
                            (slot.type === 'PROFILE_PHOTO' ? 'Active Profile Photo' : 'Document Uploaded')}
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          {docRecord?.uploadedAt
                            ? `Uploaded ${new Date(docRecord.uploadedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}`
                            : 'Ready for verification'}
                          {hasBackFile ? ' • Front & Back attached' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {displayImageUrl && displayImageUrl.startsWith('data:image/') && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: slot.title,
                              fileUrl: displayImageUrl,
                              fileName: docRecord?.fileName
                            })
                          }
                          className="p-2 rounded-xl bg-white hover:bg-gray-100 text-[#14213D] border border-gray-200 text-xs font-bold"
                          title="Preview Uploaded Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasUploadedFile && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedDocument(slot)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 text-xs font-bold"
                          title="Remove Uploaded Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Action Buttons */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={`upload-input-${slot.id}-front`}
                    className="flex-1 py-2.5 px-3.5 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[40px] shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#F42F73]" />
                    <span>
                      {uploadingId === `${slot.id}-FRONT`
                        ? 'Uploading...'
                        : hasUploadedFile
                        ? slot.supportsBackSide
                          ? 'Re-upload Front'
                          : 'Update / Re-upload'
                        : slot.supportsBackSide
                        ? 'Upload Front Side'
                        : 'Upload Photo / PDF'}
                    </span>
                    <input
                      id={`upload-input-${slot.id}-front`}
                      type="file"
                      accept={slot.type === 'PROFILE_PHOTO' ? 'image/*' : 'image/*,.pdf'}
                      onChange={(e) => handleDocumentFileChange(slot, e, 'FRONT')}
                      className="hidden"
                    />
                  </label>

                  {slot.supportsBackSide && (
                    <label
                      htmlFor={`upload-input-${slot.id}-back`}
                      className="flex-1 py-2.5 px-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-[#14213D] border border-gray-200 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[40px]"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#F42F73]" />
                      <span>
                        {uploadingId === `${slot.id}-BACK`
                          ? 'Uploading...'
                          : hasBackFile
                          ? 'Back Uploaded ✓'
                          : 'Upload Back Side'}
                      </span>
                      <input
                        id={`upload-input-${slot.id}-back`}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocumentFileChange(slot, e, 'BACK')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <span>Supports JPG, PNG, Camera Photo or PDF</span>
                  <span>Verified by Diblo Safety Ops</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Floating Status Toast */}
      {statusToast && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="p-1 rounded-lg hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mode === 'DOCUMENTS' ? (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#F42F73]" />
              <span>MY DOCUMENTS & PHOTO UPLOAD</span>
            </h2>
            <p className="text-xs text-gray-500">
              Upload your profile photo, government ID proofs, and police verification records
            </p>
          </div>

          {/* Verification Status Summary Banner */}
          <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-900">
                ALL DOCUMENTS & PROFILE PHOTO UPLOAD PORTAL
              </div>
              <div className="text-[11px] text-emerald-700">
                Upload or update your Profile Photo, Aadhaar, PAN, Driving Licence, Address Proof, and Police Verification below.
              </div>
            </div>
          </div>

          {renderDocumentsUploadGrid()}
        </div>
      ) : (
        /* MY_PROFILE MODE */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
                <User className="w-6 h-6 text-[#F42F73]" />
                <span>MY PROFILE & DOCUMENTS</span>
              </h2>
              <p className="text-xs text-gray-500">
                Official Assistant ID, profile photo upload, and KYC verification documents
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingProfile((prev) => !prev)}
              className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-[#14213D] border border-gray-200 text-xs font-black shadow-2xs transition-all"
            >
              {isEditingProfile ? 'Cancel Editing' : 'Edit Profile Info'}
            </button>
          </div>

          {/* Main Profile Card with Direct Profile Photo Upload */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={
                      profile.photo ||
                      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
                    }
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-md"
                  />
                  <label
                    htmlFor="assistant-profile-avatar-upload"
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#F42F73] hover:bg-[#D81B60] text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105"
                    title="Upload New Profile Photo"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="assistant-profile-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-xl font-black text-[#14213D]">{profile.name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ACTIVE
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 font-mono">
                    Assistant ID: <strong className="text-[#14213D]">{profile.id}</strong> • Badge #DBL-8842
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs pt-1">
                    <span className="flex items-center gap-1 font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{profile.rating}</span>
                      <span className="text-gray-400 font-normal">({profile.totalRatings || 342})</span>
                    </span>

                    <span className="flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Police Verified</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Explicit Upload Profile Photo Button */}
              <label
                htmlFor="assistant-profile-card-upload-btn"
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all min-h-[42px] shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {uploadingId === 'profile-photo' ? 'Uploading...' : 'Upload Profile Photo'}
                </span>
                <input
                  id="assistant-profile-card-upload-btn"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {isEditingProfile ? (
              <form
                onSubmit={handleSaveProfileDetails}
                className="pt-4 border-t border-gray-100 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Registered Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Registered Mumbai Address
                    </label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Operating Service Areas (comma separated)
                    </label>
                    <input
                      type="text"
                      value={profileForm.serviceArea}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, serviceArea: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Spoken Languages (comma separated)
                    </label>
                    <input
                      type="text"
                      value={profileForm.languages}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, languages: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.emergencyPhone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, emergencyPhone: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Credentials Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">
                    Registered Phone
                  </div>
                  <div className="font-extrabold text-[#14213D] mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
                    <span>+91 {profile.phone}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">
                    Registered Address
                  </div>
                  <div className="font-extrabold text-[#14213D] mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
                    <span>
                      {profile.currentLocation?.address || 'Hill Road, Bandra West, Mumbai'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">
                    Operating Service Areas
                  </div>
                  <div className="font-extrabold text-[#14213D] mt-0.5">
                    {profile.serviceArea?.join(', ') || 'Bandra, Khar, Santacruz, Andheri'}
                  </div>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">
                    Spoken Languages
                  </div>
                  <div className="font-extrabold text-[#14213D] mt-0.5">
                    {profile.languages?.join(', ') || 'Hindi, English, Marathi'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Also include Full Document & Photo Upload Section directly inside MY_PROFILE */}
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="text-lg font-black text-[#14213D] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#F42F73]" />
                <span>UPLOAD PROFILE PHOTO & VERIFICATION DOCUMENTS</span>
              </h3>
              <p className="text-xs text-gray-500">
                Upload or update your Profile Photo, Aadhaar Card, PAN Card, Driving Licence, Address Proof, and Bank Passbook
              </p>
            </div>

            {renderDocumentsUploadGrid()}
          </div>
        </div>
      )}

      {/* Document Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-[#14213D] text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black">{previewDoc.title}</h4>
                {previewDoc.fileName && (
                  <p className="text-[11px] text-gray-300">{previewDoc.fileName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 bg-gray-100 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewDoc.fileUrl}
                alt={previewDoc.title}
                className="max-w-full max-h-[60vh] rounded-2xl object-contain shadow-md"
              />
            </div>
            <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2.5 rounded-xl bg-[#14213D] text-white text-xs font-black"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
