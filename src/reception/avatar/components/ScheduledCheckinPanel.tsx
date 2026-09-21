/**
 * ScheduledCheckinPanel.tsx
 * Path: src/reception/avatar/components/ScheduledCheckinPanel.tsx
 *
 * Full Touch Flow for Scheduled Patient Check-in (Flow A):
 * 1. Phone number keypad input (+ quick demo shortcuts)
 * 2. OTP verification (Mock code 1234)
 * 3. Family member disambiguation (if multiple patients on phone)
 * 4. Today's appointment confirmation
 * 5. Token issuance and station / room guidance
 */

import React, { useState, useEffect } from 'react';
import {
  Phone,
  KeyRound,
  Users,
  CalendarCheck2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  MapPin,
  Stethoscope,
  Sparkles,
  AlertCircle,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { getMaClient } from '../../lib/api/maClient';
import type { PatientSummary, AppointmentSummary, QueueTicket } from '../../types/reception';

export type CheckinStep =
  | 'PHONE_INPUT'
  | 'OTP_VERIFY'
  | 'PATIENT_SELECT'
  | 'APPOINTMENT_CONFIRM'
  | 'TOKEN_ISSUED';

interface ScheduledCheckinPanelProps {
  onStepChange: (step: CheckinStep, speechPrompt: string) => void;
  onFinish: () => void;
  onSwitchToWalkIn?: () => void;
  onActivity: () => void;
}

export const ScheduledCheckinPanel: React.FC<ScheduledCheckinPanelProps> = ({
  onStepChange,
  onFinish,
  onSwitchToWalkIn,
  onActivity,
}) => {
  const maClient = getMaClient();

  const [currentStep, setCurrentStep] = useState<CheckinStep>('PHONE_INPUT');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentSummary | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<QueueTicket | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationSent, setNotificationSent] = useState<boolean>(false);

  // Initial speech when mounting
  useEffect(() => {
    onStepChange(
      'PHONE_INPUT',
      'Please enter your mobile phone number on the keypad to look up your scheduled appointment.'
    );
  }, []);

  // Handle touch keypad input for phone
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

  // Handle touch keypad input for OTP
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

  // Quick Demo Shortcut selection
  const selectDemoProfile = (phone: string) => {
    onActivity();
    setPhoneNumber(phone);
    setErrorMessage(null);
  };

  // Step 1 -> Step 2: Send OTP
  const handleSendOtp = async () => {
    onActivity();
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
      setErrorMessage('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await maClient.sendOtp(phoneNumber);
      setCurrentStep('OTP_VERIFY');
      onStepChange(
        'OTP_VERIFY',
        'We sent a 4-digit verification code to your phone. For this demo, please enter 1 2 3 4.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3 or 4: Verify OTP & Lookup Patients
  const submitOtp = async (codeToVerify: string) => {
    onActivity();
    setLoading(true);
    setErrorMessage(null);
    try {
      const verifyRes = await maClient.verifyOtp(phoneNumber, codeToVerify);
      setSessionToken(verifyRes.sessionToken);

      const foundPatients = await maClient.lookupClientsByPhone(phoneNumber, verifyRes.sessionToken);

      if (!foundPatients || foundPatients.length === 0) {
        setErrorMessage('No patient record found with this phone number.');
        onStepChange(
          'PHONE_INPUT',
          "We could not find an existing record with that number. You can register as a walk-in patient or check the number."
        );
        return;
      }

      setPatients(foundPatients);

      if (foundPatients.length === 1) {
        // Single patient - directly fetch appointments
        const patient = foundPatients[0];
        setSelectedPatient(patient);
        await loadAppointmentsForPatient(patient.id, patient.name, verifyRes.sessionToken);
      } else {
        // Multiple family members
        setCurrentStep('PATIENT_SELECT');
        onStepChange(
          'PATIENT_SELECT',
          `Multiple family members are linked to this number. Who is checking in today?`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid code. Please try again with code 1234.');
    } finally {
      setLoading(false);
    }
  };

  // Load appointments for chosen patient
  const loadAppointmentsForPatient = async (
    patientId: string,
    patientName: string,
    token: string = sessionToken
  ) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const apts = await maClient.getTodayAppointments(patientId, token);
      setAppointments(apts);

      if (apts.length > 0) {
        setSelectedAppointment(apts[0]);
        setCurrentStep('APPOINTMENT_CONFIRM');
        onStepChange(
          'APPOINTMENT_CONFIRM',
          `Hello ${patientName}. We found your appointment for ${apts[0].serviceName} with ${apts[0].providerName || 'your doctor'} today at ${apts[0].time}. Please confirm your check-in.`
        );
      } else {
        setCurrentStep('APPOINTMENT_CONFIRM');
        onStepChange(
          'APPOINTMENT_CONFIRM',
          `Hello ${patientName}. We could not find a scheduled appointment for today. Would you like to join the walk-in queue?`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a family member
  const handleSelectPatient = async (patient: PatientSummary) => {
    onActivity();
    setSelectedPatient(patient);
    await loadAppointmentsForPatient(patient.id, patient.name);
  };

  // Step 4 -> Step 5: Check-in appointment
  const handleConfirmCheckin = async () => {
    if (!selectedAppointment || !selectedPatient) return;
    onActivity();
    setLoading(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `checkin_${selectedAppointment.id}_${selectedPatient.id}_${Date.now()}`;
      const result = await maClient.checkinAppointment(
        selectedAppointment.id,
        selectedPatient.id,
        sessionToken,
        idempotencyKey
      );

      setIssuedTicket(result.ticket);
      setCurrentStep('TOKEN_ISSUED');

      const roomText = result.ticket.stationName || 'Room 101';
      onStepChange(
        'TOKEN_ISSUED',
        `Check-in complete! Your token number is ${result.ticket.tokenLabel}. Please proceed to ${roomText}. Have a great visit!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed. Please ask front desk staff for assistance.');
    } finally {
      setLoading(false);
    }
  };

  // Send Token SMS / WhatsApp Notification
  const handleSendNotification = async (channel: 'sms' | 'whatsapp') => {
    if (!issuedTicket) return;
    onActivity();
    setLoading(true);
    try {
      await maClient.sendTokenNotification(issuedTicket.id, phoneNumber, channel);
      setNotificationSent(true);
    } catch {
      // Ignored in mock
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto font-['Outfit'] select-none">
      {/* Step Progress Indicators */}
      <div className="flex items-center justify-between mb-6 px-2">
        {[
          { key: 'PHONE_INPUT', label: '1. Phone', icon: Phone },
          { key: 'OTP_VERIFY', label: '2. Verify', icon: KeyRound },
          { key: 'PATIENT_SELECT', label: '3. Patient', icon: Users },
          { key: 'APPOINTMENT_CONFIRM', label: '4. Confirm', icon: CalendarCheck2 },
          { key: 'TOKEN_ISSUED', label: '5. Token', icon: CheckCircle2 },
        ].map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentStep === item.key;
          const isDone =
            (item.key === 'PHONE_INPUT' && currentStep !== 'PHONE_INPUT') ||
            (item.key === 'OTP_VERIFY' && ['PATIENT_SELECT', 'APPOINTMENT_CONFIRM', 'TOKEN_ISSUED'].includes(currentStep)) ||
            (item.key === 'PATIENT_SELECT' && ['APPOINTMENT_CONFIRM', 'TOKEN_ISSUED'].includes(currentStep)) ||
            (item.key === 'APPOINTMENT_CONFIRM' && currentStep === 'TOKEN_ISSUED');

          return (
            <div key={item.key} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30'
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

      {/* Error alert if any */}
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
            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
              Enter Your Mobile Number
            </h2>
            <p className="text-slate-400 text-sm">
              We'll find today's appointment registered under this number.
            </p>
          </div>

          {/* Phone Display Box */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border-2 border-blue-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-6 h-6 text-blue-400" />
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

          {/* Quick Synthetic Demo Shortcuts */}
          <div className="mb-6 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Demo Test Accounts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => selectDemoProfile('+1 (555) 234-5678')}
                className="text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-200">Eleanor Vance</div>
                <div className="text-slate-400 font-mono">+1 (555) 234-5678 (Dr. Sharma 10:30 AM)</div>
              </button>
              <button
                onClick={() => selectDemoProfile('+91 91234 56780')}
                className="text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 transition-all text-xs"
              >
                <div className="font-bold text-slate-200">Sunita Rao</div>
                <div className="text-slate-400 font-mono">+91 91234 56780 (Dr. Patel 11:00 AM)</div>
              </button>
            </div>
          </div>

          {/* Large Touch Keypad */}
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSendOtp}
              disabled={loading || phoneNumber.length < 5}
              className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Look Up Appointment</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {currentStep === 'OTP_VERIFY' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-3 border border-blue-500/30">
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

          {/* OTP Digits Display */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-6">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 flex items-center justify-center text-3xl font-mono font-bold transition-all ${
                  otp[index]
                    ? 'border-blue-500 bg-blue-950/40 text-white shadow-lg shadow-blue-500/20'
                    : 'border-slate-700 bg-slate-950/60 text-slate-600'
                }`}
              >
                {otp[index] || '•'}
              </div>
            ))}
          </div>

          {/* OTP Touch Keypad */}
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

          {/* Back to Phone */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onActivity();
                setCurrentStep('PHONE_INPUT');
                setOtp('');
              }}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Change Phone Number
            </button>
            <button
              onClick={() => submitOtp('1234')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 py-2 px-3 rounded-lg hover:bg-blue-950/50"
            >
              Auto-Fill 1234
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PATIENT SELECTION (Family Disambiguation) */}
      {currentStep === 'PATIENT_SELECT' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
              Select Patient Checking In
            </h2>
            <p className="text-slate-400 text-sm">
              Multiple members are registered under {phoneNumber}. Tap your profile to continue.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {patients.map((pat) => (
              <button
                key={pat.id}
                onClick={() => handleSelectPatient(pat)}
                className="w-full p-4 rounded-2xl bg-slate-800/90 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500/60 transition-all flex items-center justify-between text-left group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {pat.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-blue-200">
                      {pat.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Age: {pat.age || 'N/A'}</span>
                      <span>•</span>
                      <span>{pat.gender || 'Patient'}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-medium">Relation: {pat.relation || 'Self'}</span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onActivity();
              setCurrentStep('PHONE_INPUT');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 py-2 px-3"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      )}

      {/* STEP 4: APPOINTMENT CONFIRMATION */}
      {currentStep === 'APPOINTMENT_CONFIRM' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {selectedAppointment ? (
            <div>
              <div className="text-center mb-6">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 mb-2">
                  <CalendarCheck2 className="w-3.5 h-3.5" /> Appointment Confirmed
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Welcome, {selectedPatient?.name}!
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Here are your appointment details for today.
                </p>
              </div>

              {/* Main Appointment Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border border-blue-500/30 shadow-xl mb-6">
                <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      Service
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">
                      {selectedAppointment.serviceName}
                    </h3>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    Ready for Check-in
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                      <Stethoscope className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Practitioner</p>
                      <p className="text-sm font-bold text-white">
                        {selectedAppointment.providerName || 'Attending Physician'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">Scheduled Time</p>
                      <p className="text-sm font-bold text-white">Today at {selectedAppointment.time}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Check-in CTA Button */}
              <button
                onClick={handleConfirmCheckin}
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Confirm & Check In Now</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            // No Appointment Found
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3 border border-amber-500/30">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                No Appointment Found for Today
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                We couldn't find a scheduled slot for {selectedPatient?.name} today. You can join the walk-in queue right away or check in with front desk staff.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {onSwitchToWalkIn && (
                  <button
                    onClick={onSwitchToWalkIn}
                    className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <span>Join Walk-In Queue</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    onActivity();
                    setCurrentStep('PHONE_INPUT');
                  }}
                  className="px-6 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Try Another Phone
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: TOKEN ISSUED (SUCCESS) */}
      {currentStep === 'TOKEN_ISSUED' && issuedTicket && (
        <div className="bg-slate-900/90 rounded-3xl border border-emerald-500/40 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-bold uppercase tracking-wider mb-4 animate-bounce">
            <CheckCircle2 className="w-4 h-4" /> Check-in Successful!
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            You're Checked In, {selectedPatient?.name}!
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Please take note of your token number below.
          </p>

          {/* Large Token Hero Card */}
          <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/30 border-2 border-emerald-500/50 shadow-2xl mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Your Queue Token
            </p>
            <div className="text-5xl sm:text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-wider my-2">
              {issuedTicket.tokenLabel}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 mt-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Estimated Wait: ~{issuedTicket.estimatedWaitMin || 5} mins</span>
            </div>
          </div>

          {/* Direction & Next Step Banner */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 max-w-md mx-auto mb-6 flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Where to go:</p>
              <h4 className="text-base font-bold text-white">
                {issuedTicket.stationName || 'Room 101 - Dr. Sharma'}
              </h4>
              <p className="text-xs text-slate-400">
                Please be seated in the 1st Floor Waiting Area.
              </p>
            </div>
          </div>

          {/* Send SMS / WhatsApp receipt */}
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

          {/* Finish & Return to Idle CTA */}
          <button
            onClick={() => {
              onActivity();
              onFinish();
            }}
            className="w-full max-w-md mx-auto h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <span>Done / Return to Home</span>
          </button>
        </div>
      )}
    </div>
  );
};
