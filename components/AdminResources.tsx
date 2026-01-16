
import React, { useMemo, useState } from 'react';
import { Agency, Deliverable, WeekModule } from '../types';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';
import { GradingModal } from './admin/dashboard/modals/GradingModal'; // Fix Import Path

// Sub-components
import { ResourceToolbar } from './admin/resources/ResourceToolbar';
import { UploadsTable } from './admin/resources/UploadsTable';
import { WikiManager } from './admin/resources/WikiManager';

interface AdminResourcesProps {
  agencies: Agency[];
  readOnly?: boolean;
}

export const AdminResources: React.FC<AdminResourcesProps> = ({ agencies, readOnly }) => {
  const { resources, addResource, deleteResource, updateAgency } = useGame();
  const { confirm } = useUI();
  
  const [viewMode, setViewMode] = useState<'UPLOADS' | 'WIKI'>('UPLOADS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'GRADED'>('PENDING');

  // State for Grading Modal
  const [gradingItem, setGradingItem] = useState<{agencyId: string, weekId: string, deliverable: Deliverable} | null>(null);

  // --- UPLOADS LOGIC ---
  const allFiles = useMemo(() => {
      const files: any[] = [];
      agencies.forEach(agency => {
          if (agency.id === 'unassigned') return;
          if (filterClass !== 'ALL' && agency.classId !== filterClass) return;

          (Object.values(agency.progress) as WeekModule[]).forEach(week => {
              week.deliverables.forEach(del => {
                  if (del.fileUrl && del.fileUrl !== '#' && del.status !== 'pending') {
                      if (del.name.toLowerCase().includes('cv')) return; 

                      const isGraded = del.status === 'validated' || del.status === 'rejected';
                      if (filterStatus === 'PENDING' && isGraded) return;
                      if (filterStatus === 'GRADED' && !isGraded) return;

                      files.push({
                          id: `${agency.id}-${week.id}-${del.id}`,
                          agencyId: agency.id,
                          agencyName: agency.name,
                          agencyClass: agency.classId,
                          weekId: week.id,
                          weekTitle: week.title,
                          deliverable: del,
                          url: del.fileUrl,
                          status: del.status,
                          date: del.submissionDate || 'N/A'
                      });
                  }
              });
          });
      });
      // Sort by date (newest first)
      return files.sort((a,b) => b.date.localeCompare(a.date));
  }, [agencies, filterClass, filterStatus]);

  const filteredFiles = allFiles.filter(f => 
      f.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.deliverable.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- WIKI LOGIC HELPERS ---
  const handleDeleteWiki = async (id: string) => {
      if (await confirm({ title: 'Supprimer ?', message: 'Cette ressource sera retirée pour tous les étudiants.', confirmText: 'Supprimer', isDangerous: true })) {
          await deleteResource(id);
      }
  };

  const filteredResources = resources.filter(r => 
      (filterClass === 'ALL' || r.targetClass === 'ALL' || r.targetClass === filterClass) &&
      r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        
        {/* SHARED TOOLBAR */}
        <ResourceToolbar 
            viewMode={viewMode} setViewMode={setViewMode}
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filterClass={filterClass} setFilterClass={setFilterClass}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        />

        {viewMode === 'UPLOADS' ? (
            /* UPLOADS TABLE SUB-COMPONENT */
            <UploadsTable 
                files={filteredFiles} 
                readOnly={readOnly} 
                onGrade={setGradingItem} 
            />
        ) : (
            /* WIKI MANAGER SUB-COMPONENT */
            <WikiManager 
                resources={filteredResources}
                onAdd={addResource}
                onDelete={handleDeleteWiki}
                readOnly={readOnly}
            />
        )}

        {/* MODAL CORRECTION */}
        {gradingItem && !readOnly && (
            <GradingModal 
                isOpen={!!gradingItem}
                onClose={() => setGradingItem(null)}
                item={gradingItem}
                agencies={agencies}
                onUpdateAgency={updateAgency}
            />
        )}
    </div>
  );
};
