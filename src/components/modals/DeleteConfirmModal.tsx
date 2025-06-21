import React from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  title?: string
  description?: string
  className?: string
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  title = "정말 삭제하시겠습니까?",
  description = "이 작업은 되돌릴 수 없습니다.",
  className = ""
}) => {
  const handleDelete = () => {
    onDelete()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white dark:bg-[#1f1f21] rounded-xl p-6 shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-destructive mr-3 h-6 w-6" />
              <h2 className="text-lg font-bold text-destructive">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 pl-9">{description}</p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                className="group hover:bg-red-600 transition-colors"
              >
                <Trash2 className="mr-2 h-4 w-4 group-hover:animate-bounce" />
                삭제
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 