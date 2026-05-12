import { X } from 'lucide-react';
import Button from './Button.jsx';

export default function Modal({ title, open, onClose, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className={`w-full ${maxWidth} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <Button variant="ghost" onClick={onClose} className="px-2">
            <X size={18} />
          </Button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
