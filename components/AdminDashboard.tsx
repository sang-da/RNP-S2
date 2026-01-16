
import React, { useState, useMemo, useEffect } from 'react';
import { Agency, Deliverable, WeekModule, TransactionRequest, AIInsight } from '../types';
import { collection, query, where, onSnapshot, db } from '../services/firebase';
import { useUI } from '../contexts/UIContext';

// IMPORTS SUB-COMPONENTS
import { ActionToolbar } from './admin/dashboard/ActionToolbar';
import { DashboardWidgets } from './admin/dashboard/DashboardWidgets';
import { AgencyLeaderboard } from './admin/dashboard/AgencyLeaderboard';
import { ActivityFeed } from './admin/dashboard/ActivityFeed';
import { AIBriefing } from './admin/dashboard/AIBriefing';

// IMPORTS MODALS (Refactored)
import { GradingModal } from './admin/dashboard/modals/GradingModal';
import { AuditRHModal } from './admin/dashboard/modals/AuditRHModal';
import { ControlPanelModal } from './admin/dashboard/modals/ControlPanelModal';

interface AdminDashboardProps {
  agencies: Agency[];
  onSelectAgency: (id: string) => void;
  onShuffleConstraints: (id: string) => void;
  onUpdateAgency: (agency: Agency) => void;
  onProcessWeek: () => void; // Deprecated
  onNavigate: (view: string) => void;
  readOnly?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ agencies, onSelectAgency, onUpdateAgency, onNavigate, readOnly }) => {
  const { toast } = useUI();
  
  const [gradingItem, setGradingItem] = useState<{agencyId: string, weekId: string, deliverable: Deliverable} | null>(null);
  const [auditAgency, setAuditAgency] = useState<Agency | null>(null);
  const [selectedClass, setSelectedClass] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [showControlPanel, setShowControlPanel] = useState(false);

  // 0. LISTENER SALLE D'ATTENTE
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingUsersCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  // 1. FILTERING
  const activeAgencies = useMemo(() => {
      return agencies.filter(a => 
          a.id !== 'unassigned' && 
          (selectedClass === 'ALL' || a.classId === selectedClass)
      );
  }, [agencies, selectedClass]);

  // 1b. PENDING LICENCIEMENTS (FIRE)
  const pendingFires = useMemo(() => {
      let count = 0;
      activeAgencies.forEach(a => {
          count += a.mercatoRequests.filter(r => r.type === 'FIRE' && r.status === 'PENDING').length;
      });
      return count;
  }, [activeAgencies]);

  // 1c. PENDING EMBAUCHES (HIRE)
  const pendingHires = useMemo(() => {
      let count = 0;
      activeAgencies.forEach(a => {
          count += a.mercatoRequests.filter(r => r.type === 'HIRE' && r.status === 'PENDING').length;
      });
      return count;
  }, [activeAgencies]);

  // 1d. PENDING FINANCIAL REQUESTS
  const pendingTransactions = useMemo(() => {
      const txs: {agency: Agency, request: TransactionRequest}[] = [];
      activeAgencies.forEach(a => {
          (a.transactionRequests || []).forEach(req => {
              if(req.status === 'PENDING') txs.push({agency: a, request: req});
          });
      });
      return txs;
  }, [activeAgencies]);

  // 3. PENDING REVIEWS
  const pendingReviews = useMemo(() => {
    const reviews: {agency: Agency, weekId: string, deliverable: Deliverable}[] = [];
    activeAgencies.forEach(agency => {
        Object.values(agency.progress).forEach((week: WeekModule) => {
            week.deliverables.forEach(d => {
                if (d.status === 'submitted') {
                    reviews.push({ agency, weekId: week.id, deliverable: d });
                }
            });
        });
    });
    return reviews;
  }, [activeAgencies]);

  // --- AI ACTION HANDLER ---
  const handleAIAction = (insight: AIInsight) => {
      if(readOnly) return;
      
      const targetAgency = agencies.find(a => a.id === insight.targetAgencyId);
      if(!targetAgency) return;

      if (insight.suggestedAction.actionType === 'AUDIT') {
          setAuditAgency(targetAgency);
          toast('info', `Ouverture Audit RH pour ${targetAgency.name}`);
      } else if (insight.suggestedAction.actionType === 'CRISIS' || insight.suggestedAction.actionType === 'REWARD') {
          onNavigate('CRISIS');
          toast('info', `Redirection vers Zone de Crise pour appliquer: ${insight.title}`);
      } else {
          toast('info', `Action "${insight.suggestedAction.label}" notée. À traiter manuellement.`);
      }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans pb-20">
      
      {/* --- TOP CONTROL BAR --- */}
      <ActionToolbar 
        selectedClass={selectedClass} 
        setSelectedClass={setSelectedClass}
        onNavigate={onNavigate}
        onOpenControlPanel={() => setShowControlPanel(true)}
        readOnly={readOnly}
      />

      {/* --- AI BRIEFING SECTION (NEW) --- */}
      {!readOnly && (
          <AIBriefing agencies={activeAgencies} onApplyAction={handleAIAction} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* --- LEFT COL: ALERTS & WIDGETS --- */}
        <DashboardWidgets 
            pendingUsersCount={pendingUsersCount}
            pendingHires={pendingHires}
            pendingFires={pendingFires}
            pendingTransactions={pendingTransactions}
            pendingReviews={pendingReviews}
            activeAgencies={activeAgencies}
            onNavigate={onNavigate}
            onSetGradingItem={setGradingItem}
            onSetAuditAgency={setAuditAgency}
            readOnly={readOnly}
        />

        {/* --- CENTER COL: PERFORMANCE --- */}
        <AgencyLeaderboard 
            activeAgencies={activeAgencies} 
            onSelectAgency={onSelectAgency} 
            onNavigate={onNavigate} 
        />

        {/* --- RIGHT COL: LIVE FEED --- */}
        <ActivityFeed activeAgencies={activeAgencies} />
      </div>

      {/* MODALS */}
      {gradingItem && !readOnly && (
          <GradingModal 
            isOpen={!!gradingItem} 
            onClose={() => setGradingItem(null)}
            item={gradingItem}
            agencies={agencies}
            onUpdateAgency={onUpdateAgency}
          />
      )}

      {auditAgency && (
          <AuditRHModal 
            agency={auditAgency} 
            onClose={() => setAuditAgency(null)} 
            onUpdateAgency={onUpdateAgency}
            readOnly={readOnly}
          />
      )}

      {/* CONTROL PANEL MODAL */}
      <ControlPanelModal 
        isOpen={showControlPanel} 
        onClose={() => setShowControlPanel(false)}
      />
    </div>
  );
};
