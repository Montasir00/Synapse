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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative glass-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="p-8 lg:p-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="serif-text text-3xl font-bold text-on-surface">Log Session</h2>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:bg-white/10 transition-colors border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Session Name</label>
                  <div className="relative">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Morning Run" 
                      className="w-full bg-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all border border-white/10 text-on-surface placeholder:text-on-surface-variant/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Category</label>
                    <div className="relative group">
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-white/5 rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer border border-white/10 text-on-surface"
                      >
                        <option className="bg-surface" value="Strength">Strength</option>
                        <option className="bg-surface" value="Yoga">Yoga</option>
                        <option className="bg-surface" value="Cardio">Cardio</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Duration (min)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                      <input 
                        type="number" 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="30" 
                        className="w-full bg-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all border border-white/10 text-on-surface placeholder:text-on-surface-variant/50"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Intensity</label>
                  <div className="relative group">
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                    <select 
                      value={intensity}
                      onChange={(e) => setIntensity(e.target.value)}
                      className="w-full bg-white/5 rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer border border-white/10 text-on-surface"
                    >
                      <option className="bg-surface" value="Low">Low Intensity</option>
                      <option className="bg-surface" value="Moderate">Moderate</option>
                      <option className="bg-surface" value="High">High Intensity</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Notes</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-4 top-4 text-on-surface-variant w-4 h-4" />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="How did you feel?" 
                      className="w-full bg-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px] resize-none border border-white/10 text-on-surface placeholder:text-on-surface-variant/50"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-primary text-black rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] mt-4"
                >
                  Log Session
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
