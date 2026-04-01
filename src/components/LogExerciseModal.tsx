import React, { useState } from 'react';
import { X, Activity, Clock, Zap, Flower2, AlignLeft, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (session: any) => void;
}

export default function LogExerciseModal({ isOpen, onClose, onAdd }: LogExerciseModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Strength');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('Moderate');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const iconNameMap: Record<string, string> = {
      Strength: 'Zap',
      Yoga: 'Flower2',
      Cardio: 'Activity',
    };

    onAdd({
      title,
      category,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: description,
      duration: `${duration} MIN`,
      intensity: intensity.toUpperCase(),
      icon: iconNameMap[category] || 'Activity',
      img: `https://picsum.photos/seed/${title.toLowerCase().replace(/\s/g, '-')}/200/200`,
    });

    setTitle('');
    setCategory('Strength');
    setDuration('');
    setIntensity('Moderate');
    setDescription('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[42px] shadow-2xl border border-white/10"
          >
            <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-black text-ink uppercase tracking-[0.3em]">Protocol Session Entry</span>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-accent hover:bg-white/10 transition-all border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <label className="micro-label opacity-40">Session Descriptor</label>
                  <div className="relative group">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Endurance Protocol" 
                      className="w-full bg-black/20 rounded-full py-4 pl-12 pr-6 text-sm font-medium focus:border-accent/40 outline-none transition-all border border-white/5 text-ink placeholder:text-muted/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="micro-label opacity-40">Classification</label>
                    <div className="relative group">
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-black/20 rounded-full py-4 px-6 text-sm font-medium focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                      >
                        <option className="bg-surface" value="Strength">Strength</option>
                        <option className="bg-surface" value="Yoga">Yoga</option>
                        <option className="bg-surface" value="Cardio">Cardio</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label opacity-40">Duration (min)</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <input 
                        type="number" 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="30" 
                        className="w-full bg-black/20 rounded-full py-4 pl-12 pr-6 text-sm font-medium focus:border-accent/40 outline-none transition-all border border-white/5 text-ink placeholder:text-muted/20"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="micro-label opacity-40">Load Intensity</label>
                  <div className="relative group">
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                    <select 
                      value={intensity}
                      onChange={(e) => setIntensity(e.target.value)}
                      className="w-full bg-black/20 rounded-full py-4 px-6 text-sm font-medium focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                    >
                      <option className="bg-surface" value="Low">Low Intensity</option>
                      <option className="bg-surface" value="Moderate">Moderate</option>
                      <option className="bg-surface" value="High">High Intensity</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="micro-label opacity-40">Biometric Notes</label>
                  <div className="relative group">
                    <AlignLeft className="absolute left-4 top-4 text-muted/30 w-4 h-4 transition-colors group-focus-within:text-accent" />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Feedback loop notes..." 
                      className="w-full bg-black/20 rounded-[32px] py-4 pl-12 pr-6 text-sm font-medium focus:border-accent/40 outline-none transition-all min-h-[100px] resize-none border border-white/5 text-ink placeholder:text-muted/20"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="precise-button w-full py-4 text-xs tracking-[0.3em] font-black mt-4 shadow-xl active:scale-[0.98]"
                >
                  Confirm Session
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
