import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Check, ThumbsUp, AlertCircle, ShieldCheck } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  assistantName: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  assistantName
}) => {
  const { rateBooking } = useBooking();
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Punctual & On-Time', 'Polite & Respectful']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const availableTags = [
    'Punctual & On-Time',
    'Polite & Respectful',
    'Careful with Seniors',
    'Handled Paperwork Well',
    'Clear Communication',
    'Trustworthy & Honest',
    'Fast & Efficient'
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await rateBooking(bookingId, stars, comment, selectedTags);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-gray-100 text-[#14213D]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-[#F42F73] uppercase tracking-wider">Rate Experience</div>
              <h3 className="text-lg font-bold">How was your Diblo Assistant?</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center space-y-2 py-2">
            <div className="text-sm font-semibold text-gray-700">{assistantName}</div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setStars(s)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-8 h-8 ${
                      s <= stars
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-100 text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-amber-600">
              {stars === 5 && '🌟 Exceptional Service!'}
              {stars === 4 && '👍 Great Job!'}
              {stars === 3 && '👌 Satisfactory'}
              {stars < 3 && '⚠️ Needs Improvement'}
            </div>
          </div>

          {/* Feedback Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">What went well?</label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#FFF0F5] text-[#F42F73] border border-[#F42F73] font-bold'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Box */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Add a brief comment (optional)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Very polite and patient with my elderly mother at Lilavati hospital."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Submit Rating</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
