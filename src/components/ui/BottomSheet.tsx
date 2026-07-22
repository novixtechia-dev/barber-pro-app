'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-dark/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[90vh] overflow-y-auto bg-dark border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col max-w-lg mx-auto"
          >
            <div className="flex justify-center p-3 sticky top-0 bg-dark z-10">
              <div className="w-12 h-1.5 bg-surface border-border rounded-full" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
