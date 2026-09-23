import React from 'react';
import {
  User,
  ShieldCheck,
  Star,
  Phone,
  MapPin,
  Calendar,
  FileCheck,
  Clock,
  AlertCircle,
  FileText,
  BadgeCheck,
  CheckCircle2
} from 'lucide-react';
import { AssistantProfile } from '../../types';

interface AssistantProfileViewProps {
  mode: 'MY_PROFILE' | 'DOCUMENTS';
  assistantProfile: AssistantProfile | null;
}

export const AssistantProfileView: React.FC<AssistantProfileViewProps> = ({
  mode,
  assistantProfile
}) => {
  const profile = assistantProfile || {
    id: 'asst-1',
    userId: 'user-asst-1',
    name: 'Rajesh Sharma',
    phone: '9820554433',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    rating: 4.9,
    totalRatings: 342,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Hindi', 'English', 'Marathi'],
    serviceArea: ['Bandra', 'Khar', 'Santacruz', 'Andheri West'],
    currentLocation: {
      lat: 19.0607,
      lng: 72.8258,
      address: 'Hill Road, Bandra West',
      area: 'Bandra West',
      lastUpdated: new Date().toISOString()
    },
    emergencyContact: {
      name: 'Sunita Sharma',
      phone: '9820112233',
      relationship: 'Spouse'
    },
    joinedDate: 'January 2024'
  };

  if (mode === 'DOCUMENTS') {
    const documentList = [
      {
        id: 'doc-aadhaar',
        title: 'Aadhaar Card',
        number: '•••• •••• 4912',
        status: 'VERIFIED',
        issuedDate: '2023-08-14'
      },
      {
        id: 'doc-licence',
        title: 'Driving Licence',
        number: 'MH02 20180019284',
        status: 'VERIFIED',
        issuedDate: '2023-09-02'
      },
      {
        id: 'doc-photo',
        title: 'Profile Photo & Identity Match',
        number: 'Biometrics Cleared',
        status: 'VERIFIED',
        issuedDate: '2024-01-10'
      },
      {
        id: 'doc-address',
        title: 'Address Proof (Electricity Bill)',
        number: 'Verified at Bandra West',
        status: 'VERIFIED',
        issuedDate: '2023-11-20'
      },
      {
        id: 'doc-family',
        title: 'Family Mobile & Emergency Contact',
        number: `${profile.emergencyContact?.name} (${profile.emergencyContact?.relationship}): ${profile.emergencyContact?.phone}`,
        status: 'VERIFIED',
        issuedDate: '2024-01-15'
      },
      {
        id: 'doc-police',
        title: 'Police Verification NOC',
        number: 'NOC-MUM-W-883921',
        status: 'VERIFIED',
        issuedDate: '2024-01-18'
      }
    ];

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#F42F73]" />
            <span>MY DOCUMENTS</span>
          </h2>
          <p className="text-xs text-gray-500">Government ID proofs and police verification records</p>
        </div>

        {/* Verification Status Summary Banner */}
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black text-emerald-900">ALL DOCUMENTS VERIFIED</div>
            <div className="text-[11px] text-emerald-700">
              You are fully cleared for daily companion & elderly care assignments in Mumbai.
            </div>
          </div>
        </div>

        {/* Document Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {documentList.map((doc) => {
            const isVerified = doc.status === 'VERIFIED';
            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-black text-[#14213D]">{doc.title}</div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending Verification</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{doc.number}</div>
                </div>

                <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-100">
                  Verified by Diblo Safety Operations
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MY_PROFILE MODE
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
          <User className="w-6 h-6 text-[#F42F73]" />
          <span>MY PROFILE</span>
        </h2>
        <p className="text-xs text-gray-500">Official Assistant ID and profile credentials</p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <img
            src={profile.photo}
            alt={profile.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-md"
          />

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xl font-black text-[#14213D]">{profile.name}</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                ACTIVE
              </span>
            </div>

            <div className="text-xs text-gray-500 font-mono">
              Assistant ID: <strong className="text-[#14213D]">{profile.id}</strong> • Badge #DBL-8842
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs pt-1">
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

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <div className="text-gray-400 font-bold uppercase text-[10px]">Registered Phone</div>
            <div className="font-extrabold text-[#14213D] mt-0.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>+91 {profile.phone}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <div className="text-gray-400 font-bold uppercase text-[10px]">Registered Address</div>
            <div className="font-extrabold text-[#14213D] mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>{profile.currentLocation?.address || 'Hill Road, Bandra West, Mumbai'}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <div className="text-gray-400 font-bold uppercase text-[10px]">Operating Service Areas</div>
            <div className="font-extrabold text-[#14213D] mt-0.5">
              {profile.serviceArea?.join(', ') || 'Bandra, Khar, Santacruz, Andheri'}
            </div>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <div className="text-gray-400 font-bold uppercase text-[10px]">Spoken Languages</div>
            <div className="font-extrabold text-[#14213D] mt-0.5">
              {profile.languages?.join(', ') || 'Hindi, English, Marathi'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
