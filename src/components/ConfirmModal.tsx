import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'تأكيد الحذف',
  cancelLabel = 'إلغاء',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5E8EF] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 id="confirm-modal-title" className="font-display text-lg font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600 leading-relaxed">{description}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-[#E5E8EF] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#F7F8FA] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'جاري التنفيذ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
