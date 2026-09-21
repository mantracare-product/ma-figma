/**
 * WalkInBookingPanel.tsx
 * Path: src/reception/avatar/components/WalkInBookingPanel.tsx
 *
 * Full Touch Flow for Walk-in Patient Registration & Booking (Flow B):
 * 1. Phone number keypad + OTP verification (1234)
 * 2. Patient intake form (Name, Age, Gender, Reason for visit)
 * 3. Service / Department selection + Doctor picker ("Next Available" by default)
 * 4. Client creation in MantraAssist + immediate queue placement
 * 5. Token issuance and station / room guidance
 */

import React, { useState, useEffect } from 'react';
import {
  Phone,
  KeyRound,
  UserCheck,
  Stethoscope,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  User,
  Heart,
  Pill,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { getMaClient } from '../../lib/api/maClient';
import type {
  PatientSummary,
  ServiceItem,
  ProviderItem,
  QueueTicket,
} from '../../types/reception';

export type WalkInStep =
  | 'PHONE_INPUT'
  | 'OTP_VERIFY'
  | 'PATIENT_DETAILS'
  | 'SERVICE_SELECT'
  | 'TOKEN_ISSUED';

interface WalkInBookingPanelProps {
  onStepChange: (step: WalkInStep, speechPrompt: string) => void;
  onFinish: () => void;
  onActivity: () => void;
}

export const WalkInBookingPanel: React.FC<WalkInBookingPanelProps> = ({
  onStepChange,
  onFinish,
  onActivity,
}) => {
  const maClient = getMaClient();

  const [currentStep, setCurrentStep] = useState<WalkInStep>('PHONE_INPUT');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');

  // Patient Details
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<number>(32);
  const [patientGender, setPatientGender] = useState<string>('Female');
  const [visitReason, setVisitReason] = useState<string>('General Consultation');
  const [existingPatient, setExistingPatient] = useState<PatientSummary | null>(null);

  // Services & Providers
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('srv_consult');
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('next_available');

  const [issuedTicket, setIssuedTicket] = useState<QueueTicket | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationSent, setNotificationSent] = useState<boolean>(false);

  // Initial speech prompt
  useEffect(() => {
    onStepChange(
      'PHONE_INPUT',
      'Welcome! Please enter your mobile phone number on the keypad to start your walk-in registration.'
    );
  }, []);

  // Fetch available services & providers
  useEffect(() => {
    const loadData = async () => {
      try {
        const srvs = await maClient.getServices();
        setServices(srvs);
        const provs = await maClient.getProviders();
        setProviders(provs);
      } catch (e) {
        console.error('Error loading services:', e);
      }
    };
    loadData();
  }, []);

  // Handle phone keypad
  const handleKeypadPress = (digit: string) => {
    onActivity();
    setErrorMessage(null);
    if (digit === 'BACK') {
      setPhoneNumber((prev) => prev.slice(0, -1));
    } else if (digit === 'CLEAR') {
      setPhoneNumber('');
    } else {
      if (phoneNumber.length < 15) {
        setPhoneNumber((prev) => prev + digit);
      }
    }
  };

  // Handle OTP keypad
  const handleOtpKeypadPress = (digit: string) => {
    onActivity();
    setErrorMessage(null);
    if (digit === 'BACK') {
      setOtp((prev) => prev.slice(0, -1));
    } else if (digit === 'CLEAR') {
      setOtp('');
    } else {
      if (otp.length < 4) {
        const nextOtp = otp + digit;
        setOtp(nextOtp);
        if (nextOtp.length === 4) {
          submitOtp(nextOtp);
        }
      }
    }
  };

  // Send OTP
  const handleSendOtp = async () => {
    onActivity();
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
      setErrorMessage('Please enter a valid mobile number (at least 7 digits).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await maClient.sendOtp(phoneNumber);
      setCurrentStep('OTP_VERIFY');
      onStepChange(
        'OTP_VERIFY',
        'We sent a 4-digit code to your phone. For this demo, please enter 1 2 3 4.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP & check if patient already exists
  const submitOtp = async (codeToVerify: string) => {
    onActivity();
    setLoading(true);
    setErrorMessage(null);
    try {
      const verifyRes = await maClient.verifyOtp(phoneNumber, codeToVerify);
      setSessionToken(verifyRes.sessionToken);

      const foundPatients = await maClient.lookupClientsByPhone(phoneNumber, verifyRes.sessionToken);

      if (foundPatients && foundPatients.length > 0) {
        const first = foundPatients[0];
        setExistingPatient(first);
        setPatientName(first.name);
        if (first.age) setPatientAge(first.age);
        if (first.gender) setPatientGender(first.gender);
        setCurrentStep('PATIENT_DETAILS');
        onStepChange(
          'PATIENT_DETAILS',
          `Welcome back ${first.name}! Please confirm your details and reason for today's visit.`
        );
      } else {
        setExistingPatient(null);
        setPatientName('Sarah Connor');
        setCurrentStep('PATIENT_DETAILS');
        onStepChange(
          'PATIENT_DETAILS',
          'Please confirm your name, age, and reason for visit so we can prepare your chart.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid code. Please enter 1234.');
    } finally {
      setLoading(false);
    }
  };

  // Proceed from Patient Details to Service Selection
  const handleProceedToService = () => {
    onActivity();
    if (!patientName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    setErrorMessage(null);
    setCurrentStep('SERVICE_SELECT');
    onStepChange(
      'SERVICE_SELECT',
      'Please select the service or department you need today. Next available doctor is selected by default.'
    );
  };

  // Complete Walk-in Registration & Queue Check-in
  const handleConfirmWalkIn = async () => {
    onActivity();
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create or match client in MantraAssist
      let clientId = existingPatient?.id;
      if (!clientId) {
        const newClient = await maClient.createWalkInClient(
          {
            name: patientName,
            phone: phoneNumber,
            age: patientAge,
            gender: patientGender,
            reason: visitReason,
          },
          sessionToken
        );
        clientId = newClient.id;
      }

      // 2. Immediate Queue Placement via checkinWalkIn
      const idempotencyKey = `walkin_${clientId}_${Date.now()}`;
      const walkinResult = await maClient.checkinWalkIn({
        patient: {
          name: patientName,
          phone: phoneNumber,
        },
        reason: visitReason,
        idempotencyKey,
      });

      setIssuedTicket(walkinResult.ticket);
      setCurrentStep('TOKEN_ISSUED');

      const roomName = walkinResult.ticket.stationName || 'Room 101 - Dr. Sharma';
      onStepChange(
        'TOKEN_ISSUED',
        `Walk-in registration complete! Your queue token is ${walkinResult.ticket.tokenLabel}. Please proceed to ${roomName}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete registration. Please speak with front desk staff.');
    } finally {
      setLoading(false);
    }
  };

  // Send SMS / WhatsApp Notification
  const handleSendNotification = async (channel: 'sms' | 'whatsapp') => {
    if (!issuedTicket) return;
    onActivity();
    setLoading(true);
    try {
      await maClient.sendTokenNotification(issuedTicket.id, phoneNumber, channel);
      setNotificationSent(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto font-['Outfit'] select-none">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6 px-2">
        {[
          { key: 'PHONE_INPUT', label: '1. Phone', icon: Phone },
          { key: 'OTP_VERIFY', label: '2. Verify', icon: KeyRound },
          { key: 'PATIENT_DETAILS', label: '3. Details', icon: UserCheck },
          { key: 'SERVICE_SELECT', label: '4. Service', icon: Stethoscope },
          { key: 'TOKEN_ISSUED', label: '5. Token', icon: CheckCircle2 },
        ].map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentStep === item.key;
          const isDone =
            (item.key === 'PHONE_INPUT' && currentStep !== 'PHONE_INPUT') ||
            (item.key === 'OTP_VERIFY' && ['PATIENT_DETAILS', 'SERVICE_SELECT', 'TOKEN_ISSUED'].includes(currentStep)) ||
            (item.key === 'PATIENT_DETAILS' && ['SERVICE_SELECT', 'TOKEN_ISSUED'].includes(currentStep)) ||
            (item.key === 'SERVICE_SELECT' && currentStep === 'TOKEN_ISSUED');

          return (
            <div key={item.key} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/30'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-xs font-semibold hidden md:inline ${
                  isActive ? 'text-white' : isDone ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
              {idx < 4 && <div className="hidden sm:block w-4 h-[2px] bg-slate-800 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="flex-1 font-medium">{errorMessage}</p>
        </div>
      )}

      {/* STEP 1: PHONE INPUT */}
      {currentStep === 'PHONE_INPUT' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Walk-In Patient Registration
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Enter Your Mobile Number
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              We'll link your walk-in visit and send token updates to this number.
            </p>
          </div>

          {/* Phone Display */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border-2 border-indigo-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-6 h-6 text-indigo-400" />
              <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
                {phoneNumber || <span className="text-slate-600 font-normal">Phone number</span>}
              </span>
            </div>
            {phoneNumber && (
              <button
                onClick={() => handleKeypadPress('CLEAR')}
                className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Demo Shortcuts */}
          <div className="mb-6 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">Quick Test Mobile:</span>
            <button
              onClick={() => {
                onActivity();
                setPhoneNumber('+1 (555) 777-8899');
              }}
              className="text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 py-1 px-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30"
            >
              +1 (555) 777-8899
            </button>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-sm mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', 'BACK'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                className={`h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-bold transition-all active:scale-95 flex items-center justify-center ${
                  key === 'BACK'
                    ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                    : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700/60 shadow-md'
                }`}
              >
                {key === 'BACK' ? '⌫' : key}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleSendOtp}
            disabled={loading || phoneNumber.length < 5}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Continue Registration</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: OTP VERIFY */}
      {currentStep === 'OTP_VERIFY' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3 border border-indigo-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
              Enter Verification Code
            </h2>
            <p className="text-slate-400 text-sm">
              Code sent to <span className="text-white font-mono font-semibold">{phoneNumber}</span>
            </p>
            <div className="mt-2 inline-block px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              Demo Code: <span className="font-mono font-black text-white">1234</span>
            </div>
          </div>

          {/* OTP Digits */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-6">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 flex items-center justify-center text-3xl font-mono font-bold transition-all ${
                  otp[index]
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-500/20'
                    : 'border-slate-700 bg-slate-950/60 text-slate-600'
                }`}
              >
                {otp[index] || '•'}
              </div>
            ))}
          </div>

          {/* OTP Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-sm mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((key) => (
              <button
                key={key}
                onClick={() => handleOtpKeypadPress(key)}
                className={`h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-bold transition-all active:scale-95 flex items-center justify-center ${
                  key === 'BACK' || key === 'CLEAR'
                    ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 text-sm'
                    : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700/60 shadow-md'
                }`}
              >
                {key === 'BACK' ? '⌫' : key}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onActivity();
                setCurrentStep('PHONE_INPUT');
                setOtp('');
              }}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Change Number
            </button>
            <button
              onClick={() => submitOtp('1234')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 py-2 px-3 rounded-lg hover:bg-indigo-950/50"
            >
              Auto-Fill 1234
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PATIENT DETAILS & REASON */}
      {currentStep === 'PATIENT_DETAILS' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
              Patient Information
            </h2>
            <p className="text-slate-400 text-sm">
              Please confirm your details for today's medical chart.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => {
                    onActivity();
                    setPatientName(e.target.value);
                  }}
                  placeholder="e.g. Sarah Connor"
                  className="flex-1 px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              {/* Quick name chips */}
              <div className="flex gap-2 mt-2">
                {['Sarah Connor', 'David Miller', 'Anita Roy'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onActivity();
                      setPatientName(name);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Age & Gender Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Age
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[24, 32, 48, 65].map((ageVal) => (
                    <button
                      key={ageVal}
                      type="button"
                      onClick={() => {
                        onActivity();
                        setPatientAge(ageVal);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        patientAge === ageVal
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {ageVal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Female', 'Male', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        onActivity();
                        setPatientGender(g);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        patientGender === g
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reason for Visit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Primary Reason for Visit
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'General Consultation / Fever',
                  'Routine Health Checkup',
                  'Cardiology / Blood Pressure',
                  'Dental Care / Tooth Pain',
                  'Prescription Refill',
                  'Lab Tests / Blood Work',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      onActivity();
                      setVisitReason(reason);
                    }}
                    className={`p-3 rounded-xl text-left text-xs font-semibold transition-all border ${
                      visitReason === reason
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                onActivity();
                setCurrentStep('PHONE_INPUT');
              }}
              className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Back
            </button>
            <button
              onClick={handleProceedToService}
              className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <span>Choose Doctor & Service</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SERVICE & DOCTOR SELECTION */}
      {currentStep === 'SERVICE_SELECT' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
              Select Department & Doctor
            </h2>
            <p className="text-slate-400 text-sm">
              We'll assign your queue ticket immediately.
            </p>
          </div>

          {/* Service Cards */}
          <div className="space-y-3 mb-6">
            {[
              {
                id: 'srv_consult',
                title: 'General Physician Consultation',
                desc: 'Fever, cough, cold, flu, general wellness check',
                icon: Stethoscope,
                color: 'blue',
              },
              {
                id: 'srv_cardio',
                title: 'Cardiology Specialist',
                desc: 'Blood pressure, chest check, ECG review',
                icon: Heart,
                color: 'rose',
              },
              {
                id: 'srv_dental',
                title: 'Dental Clinic',
                desc: 'Toothache, cleaning, dental consultation',
                icon: Smile,
                color: 'amber',
              },
            ].map((srv) => {
              const Icon = srv.icon;
              const isSelected = selectedServiceId === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => {
                    onActivity();
                    setSelectedServiceId(srv.id);
                  }}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between group active:scale-[0.99] ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{srv.title}</h4>
                      <p className="text-xs text-slate-400">{srv.desc}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-600 text-white'
                        : 'border-slate-600'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Doctor Selection (Default: Next Available) */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Assigned Practitioner</span>
              <span className="text-emerald-400 font-normal">Shortest wait time</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onActivity();
                  setSelectedProviderId('next_available');
                }}
                className={`p-3 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                  selectedProviderId === 'next_available'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="text-white">Next Available Doctor</div>
                  <div className="text-[10px] text-emerald-400 font-normal">Recommended (~5m wait)</div>
                </div>
                {selectedProviderId === 'next_available' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onActivity();
                  setSelectedProviderId('prov_1');
                }}
                className={`p-3 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                  selectedProviderId === 'prov_1'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="text-white">Dr. Ananya Sharma</div>
                  <div className="text-[10px] text-slate-400 font-normal">Room 101 • General Physician</div>
                </div>
                {selectedProviderId === 'prov_1' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                )}
              </button>
            </div>
          </div>

          {/* Book & Join Queue CTA */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                onActivity();
                setCurrentStep('PATIENT_DETAILS');
              }}
              className="px-4 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Back
            </button>
            <button
              onClick={handleConfirmWalkIn}
              disabled={loading}
              className="flex-1 h-16 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Join Queue & Get Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TOKEN ISSUED */}
      {currentStep === 'TOKEN_ISSUED' && issuedTicket && (
        <div className="bg-slate-900/90 rounded-3xl border border-emerald-500/40 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-bold uppercase tracking-wider mb-4 animate-bounce">
            <CheckCircle2 className="w-4 h-4" /> Registration Successful!
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
            You're in the Queue, {patientName}!
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Your patient chart has been created in MantraAssist. Please note your token.
          </p>

          {/* Token Hero Display */}
          <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/30 border-2 border-emerald-500/50 shadow-2xl mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Your Queue Token
            </p>
            <div className="text-5xl sm:text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-wider my-2">
              {issuedTicket.tokenLabel}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 mt-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Estimated Wait: ~{issuedTicket.estimatedWaitMin || 10} mins</span>
            </div>
          </div>

          {/* Direction Banner */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 max-w-md mx-auto mb-6 flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Where to go:</p>
              <h4 className="text-base font-bold text-white">
                {issuedTicket.stationName || 'Room 101 - Dr. Sharma'}
              </h4>
              <p className="text-xs text-slate-400">
                Please wait in the 1st Floor Lobby. Your token will be called on the screen.
              </p>
            </div>
          </div>

          {/* Receipts */}
          <div className="max-w-md mx-auto mb-6">
            {notificationSent ? (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Token receipt sent to {phoneNumber}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendNotification('sms')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-blue-400" /> Send SMS Receipt
                </button>
                <button
                  onClick={() => handleSendNotification('whatsapp')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Receipt
                </button>
              </div>
            )}
          </div>

          {/* Return CTA */}
          <button
            onClick={() => {
              onActivity();
              onFinish();
            }}
            className="w-full max-w-md mx-auto h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
          >
            <span>Done / Return to Home</span>
          </button>
        </div>
      )}
    </div>
  );
};
