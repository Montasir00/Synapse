import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, getDocs, doc, setDoc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { JournalEntry } from '../../types/binance';
import { CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

export const JournalMigrator: React.FC = () => {
  const [status, setStatus] = useState<'IDLE' | 'MIGRATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [stats, setStats] = useState({ scanned: 0, migrated: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isMigrated, setIsMigrated] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!auth.currentUser) return;
      const settingsSnap = await getDoc(doc(db, 'user_settings', auth.currentUser.uid));
      if (settingsSnap.exists() && settingsSnap.data().journalMigrated) {
        setIsMigrated(true);
      }
    };
    checkStatus();
  }, []);

  const runMigration = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setStatus('MIGRATING');
    setError(null);

    try {
      // 1. Scan positions
      const positionsSnap = await getDocs(collection(db, 'binance_positions', user.uid, 'items'));
      const batch = writeBatch(db);
      let migratedCount = 0;

      positionsSnap.forEach((syncDoc) => {
        const data = syncDoc.data();
        
        // NULL GUARD: Skip if no notes AND no tags
        const hasNotes = data.notes && data.notes.trim().length > 0;
        const hasTags = data.tags && Array.isArray(data.tags) && data.tags.length > 0;

        if (!hasNotes && !hasTags) return;

        // 2. Map to Journal Schema
        const journalDocRef = doc(db, 'trade_journals', syncDoc.id);
        const journalEntry: JournalEntry = {
          id: syncDoc.id,
          uid: user.uid,
          symbol: data.symbol,
          followedPlan: false, // Default for historical
          rating: 0,
          notes: data.notes || '',
          tags: data.tags || [],
          updatedAt: serverTimestamp()
        };

        batch.set(journalDocRef, journalEntry, { merge: true });
        migratedCount++;
      });

      // 3. Update Sync Lock to disable this button in the future
      batch.set(doc(db, 'user_settings', user.uid), {
        journalMigrated: true,
        migratedAt: serverTimestamp()
      }, { merge: true });

      if (migratedCount > 0) {
        await batch.commit();
      } else {
         // Even if zero migrated, set the flag to disable future scans
         await setDoc(doc(db, 'user_settings', user.uid), {
            journalMigrated: true,
            migratedAt: serverTimestamp()
         }, { merge: true });
      }

      setStats({ scanned: positionsSnap.size, migrated: migratedCount });
      setStatus('SUCCESS');
      setIsMigrated(true);
    } catch (err: any) {
      console.error('[Migrator] Critical Failure:', err);
      setError(err.message || 'Unknown migration error');
      setStatus('ERROR');
    }
  };

  if (isMigrated && status !== 'SUCCESS') {
    return (
      <div className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-3 text-emerald-400">
          <CheckCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Journal Migration Complete</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border-accent/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-black text-ink uppercase tracking-tight">Institutional Migration Bridge</h3>
        </div>
        {status === 'MIGRATING' && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
      </div>

      <p className="text-[10px] font-medium text-muted/60 leading-relaxed mb-6 uppercase">
        Safe isolation of qualitative trade insights. This will transition your legacy notes and tags to the immutable 
        <span className="text-accent mx-1">trade_journals</span> collection.
      </p>

      {status === 'ERROR' && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded mb-4 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase leading-none">{error}</span>
        </div>
      )}

      {status === 'SUCCESS' ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-[10px] font-black text-ink uppercase tracking-widest">Mission Complete</p>
          <p className="text-[9px] font-bold text-muted/40 uppercase mt-1">
            {stats.migrated} Journals Isolated / {stats.scanned} Positions Audited
          </p>
        </div>
      ) : (
        <button
          onClick={runMigration}
          disabled={status === 'MIGRATING'}
          className="w-full py-3 bg-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded hover:bg-accent-hover transition-all disabled:opacity-50"
        >
          {status === 'MIGRATING' ? 'Executing Bridge...' : 'Initiate Migration'}
        </button>
      )}
    </div>
  );
};
