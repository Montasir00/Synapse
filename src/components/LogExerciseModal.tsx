import React, { useState } from 'react';
import { X, Activity, Clock, AlignLeft, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (session: any) => void | Promise<void>;
}

export default function LogExerciseModal({ isOpen, onClose, onAdd }: LogExerciseModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Strength');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('Moderate');
  const [description, setDescription] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const titleError = submitAttempted && !title.trim();
  const durationValue = parseInt(duration, 10);
  const durationError = submitAttempted && (Number.isNaN(durationValue) || durationValue <= 0);

  React.useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusFirstElement = () => {
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const timer = window.setTimeout(focusFirstElement, 0);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (titleError || durationError) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    const iconNameMap: Record<string, string> = {
      Strength: 'Zap',
      Yoga: 'Flower2',
      Cardio: 'Activity',
    };

    try {
      await Promise.resolve(onAdd({
        title: title.trim(),
        category,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        description: description,
        duration: `${durationValue} MIN`,
        intensity: intensity.toUpperCase(),
        icon: iconNameMap[category] || 'Activity',
        img: `https://picsum.photos/seed/${title.toLowerCase().replace(/\s/g, '-')}/200/200`,
      }));

      setTitle('');
      setCategory('Strength');
      setDuration('');
      setIntensity('Moderate');
      setDescription('');
      setSubmitAttempted(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Add exercise session">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/70 backdrop-blur-md"
          />
          
          <motion.div 
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative bg-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-[42px] shadow-2xl border border-border"
          >
            <div className="p-4 sm:p-6 lg:p-10">
                <div className="flex items-start justify-between gap-4 mb-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <span className="text-xs font-black text-ink uppercase tracking-[0.12em] sm:tracking-[0.3em]">Log session</span>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted/75">Use one entry per workout to keep the timeline readable.</p>
                  </div>
                  <button 
                    onClick={() => !isSubmitting && onClose()}
                    disabled={isSubmitting}
                    aria-label="Close exercise modal"
                    className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center text-muted hover:text-accent hover:bg-accent/5 transition-all border border-border"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <label htmlFor="exercise-title" className="micro-label text-muted">Session Title</label>
                  <div className="relative group">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <input 
                      id="exercise-title"
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setSubmitAttempted(true)}
                      placeholder="e.g. Endurance Protocol" 
                      className={`w-full bg-surface-subtle rounded-full py-4 pl-12 pr-6 text-sm font-medium focus:border-accent/40 outline-none transition-all border text-ink placeholder:text-muted ${titleError ? 'border-alert/50' : 'border-border'}`}
                      aria-invalid={titleError}
                      aria-describedby={titleError ? 'exercise-title-error' : undefined}
                      required
                    />
                  </div>
                  {titleError && (
                    <p id="exercise-title-error" className="text-xs font-semibold text-alert">Session title is required.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3">
                    <label htmlFor="exercise-category" className="micro-label text-muted">Workout type</label>
                    <div className="relative group">
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                      <select 
                        id="exercise-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-surface-subtle rounded-full py-4 px-6 text-sm font-medium focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-border text-ink"
                      >
                        <option className="bg-surface" value="Strength">Strength</option>
                        <option className="bg-surface" value="Yoga">Yoga</option>
                        <option className="bg-surface" value="Cardio">Cardio</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="exercise-duration" className="micro-label text-muted">Duration (min)</label>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted/50">Use total active minutes for the session.</p>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <input 
                        id="exercise-duration"
                        type="number" 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        onBlur={() => setSubmitAttempted(true)}
                        placeholder="30" 
                        className={`w-full bg-surface-subtle rounded-full py-4 pl-12 pr-6 text-sm font-medium focus:border-accent/40 outline-none transition-all border text-ink placeholder:text-muted ${durationError ? 'border-alert/50' : 'border-border'}`}
                        aria-invalid={durationError}
                        aria-describedby={durationError ? 'exercise-duration-error' : undefined}
                        required
                      />
                    </div>
                    {durationError && (
                      <p id="exercise-duration-error" className="text-xs font-semibold text-alert">Duration must be greater than 0 minutes.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="exercise-intensity" className="micro-label text-muted">Intensity</label>
                  <div className="relative group">
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                    <select 
                      id="exercise-intensity"
                      value={intensity}
                      onChange={(e) => setIntensity(e.target.value)}
                      className="w-full bg-surface-subtle rounded-full py-4 px-6 text-sm font-medium focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-border text-ink"
                    >
                      <option className="bg-surface" value="Low">Low Intensity</option>
                      <option className="bg-surface" value="Moderate">Moderate</option>
                      <option className="bg-surface" value="High">High Intensity</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="exercise-notes" className="micro-label text-muted">Notes</label>
                  <div className="relative group">
                    <AlignLeft className="absolute left-4 top-4 text-muted w-4 h-4 transition-colors group-focus-within:text-accent" />
                    <textarea 
                      id="exercise-notes"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Feedback loop notes…" 
                      className="w-full bg-surface-subtle rounded-[32px] py-4 pl-12 pr-6 text-sm font-medium focus:border-accent/40 outline-none transition-all min-h-[100px] resize-none border border-border text-ink placeholder:text-muted"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="precise-button w-full py-4 text-xs tracking-[0.12em] sm:tracking-[0.3em] font-black mt-4 shadow-xl active:scale-[0.98]"
                >
                  {isSubmitting ? 'Committing…' : 'Commit Session'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
