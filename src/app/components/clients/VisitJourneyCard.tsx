/**
 * VisitJourneyCard.tsx
 * Path: src/app/components/clients/VisitJourneyCard.tsx
 *
 * MantraAssist Staff component for tracking and advancing a patient's active visit journey:
 * - Shows current visit token (e.g. D-001), appointment source, check-in timestamp
 * - Visual step timeline (Check-in -> Doctor Consultation -> Pharmacy -> Tests -> Completed)
 * - 1-Click stage advance buttons for clinic staff
 * - Reads/writes through IMaClient (MockMaClient)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Clock,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  Pill,
  FlaskConical,
  CreditCard,
  Sparkles,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { getMaClient } from '../../../reception/lib/api/maClient';
import type { Journey, QueueTicket, Station } from '../../../reception/types/reception';
import { toast } from 'sonner';

interface VisitJourneyCardProps {
  clientId: string;
  clientName: string;
  clientPhone?: string;
}

export const VisitJourneyCard: React.FC<VisitJourneyCardProps> = ({
  clientId,
  clientName,
  clientPhone,
}) => {
  const maClient = getMaClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [activeTicket, setActiveTicket] = useState<QueueTicket | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [advancing, setAdvancing] = useState<boolean>(false);

  const loadVisitData = useCallback(async () => {
    setLoading(true);
    try {
      const allStations = await maClient.getStations();
      setStations(allStations);

      // Search station queues for any active ticket belonging to this client
      let foundTicket: QueueTicket | null = null;
      for (const st of allStations) {
        const q = await maClient.getStationQueue(st.id);
        const match = q.find(
          (t) =>
            t.clientId === clientId ||
            (clientPhone && t.clientPhone?.replace(/\D/g, '') === clientPhone.replace(/\D/g, ''))
        );
        if (match) {
          foundTicket = match;
          break;
        }
      }

      setActiveTicket(foundTicket);

      if (foundTicket?.journeyId) {
        const j = await maClient.getJourney(foundTicket.journeyId);
        setActiveJourney(j);
      } else {
        setActiveJourney(null);
      }
    } catch (err) {
      console.error('Failed to load visit journey:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, clientPhone]);

  useEffect(() => {
    loadVisitData();
  }, [loadVisitData]);

  // Stage Advancement Handler
  const handleAdvanceStage = async (nextStationType: 'pharmacy' | 'lab' | 'billing' | 'completed') => {
    if (!activeTicket) return;
    setAdvancing(true);

    try {
      if (nextStationType === 'completed') {
        await maClient.completeTicket(activeTicket.id, []);
        toast.success(`Visit for ${clientName} marked as completed.`);
      } else {
        // Find target station
        const targetStation = stations.find((s) => s.type === nextStationType);
        if (targetStation) {
          await maClient.transferTicket(activeTicket.id, targetStation.id, 1);
          toast.success(`Patient moved to ${targetStation.name}.`);
        } else {
          await maClient.completeTicket(activeTicket.id, []);
          toast.success(`Stage advanced.`);
        }
      }
      await loadVisitData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to advance stage');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          <span>Checking active visit journey...</span>
        </div>
      </div>
    );
  }

  if (!activeTicket) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 font-['Outfit']">Reception Visit Status</h4>
              <p className="text-[11px] text-slate-500">No active clinic visit or queue token today.</p>
            </div>
          </div>
          <button
            onClick={loadVisitData}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-5 shadow-xs font-['Outfit']">
      {/* Header with Token */}
      <div className="flex items-center justify-between pb-3 border-b border-blue-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-500/20">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Clinic Visit
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                Token: {activeTicket.tokenLabel}
              </span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-800">{activeTicket.stationName}</span>
              <span>•</span>
              <span className="capitalize">{activeTicket.status}</span>
            </p>
          </div>
        </div>

        <button
          onClick={loadVisitData}
          className="p-1.5 rounded-lg hover:bg-blue-100/60 text-blue-600 transition-colors"
          title="Refresh visit state"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Stage Progression Timeline */}
      <div className="py-2 mb-3">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Visit Journey Stages
        </p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-600" />
            <span>Check-in</span>
          </div>

          <div className="p-2 rounded-lg bg-blue-100 border border-blue-300 text-blue-800 font-bold">
            <Stethoscope className="w-3.5 h-3.5 mx-auto mb-1 text-blue-600" />
            <span>Doctor</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
            <Pill className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
            <span>Pharmacy</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
            <CreditCard className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Staff Actions to Advance Stage */}
      <div className="pt-2 border-t border-blue-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-600 font-medium">Staff Actions:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAdvanceStage('pharmacy')}
            disabled={advancing}
            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Send to Pharmacy</span>
          </button>

          <button
            onClick={() => handleAdvanceStage('completed')}
            disabled={advancing}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete Visit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
