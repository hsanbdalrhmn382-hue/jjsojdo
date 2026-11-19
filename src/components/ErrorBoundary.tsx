import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: 'حدث خطأ غير متوقع أثناء تحميل البيانات. يرجى إعادة تحديث الصفحة والمحاولة مرة أخرى.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4">
          <div className="max-w-md w-full rounded-2xl border border-[#E5E8EF] bg-white p-8 text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />
            <h1 className="font-display text-xl font-bold text-[#1A3668]">
              تعذر إتمام العملية
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A3668] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#112447] transition-colors"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
