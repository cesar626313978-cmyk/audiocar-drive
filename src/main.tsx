import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean; errorMessage: string}
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, errorMessage: ''};
  }

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, errorMessage: error?.message || 'Error de renderizado'};
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AudioCar Drive ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-lg font-bold text-white mb-2">AudioCar Drive</h1>
          <p className="text-xs text-slate-400 mb-4 max-w-md">{this.state.errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
