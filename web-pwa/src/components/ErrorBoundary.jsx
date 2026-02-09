import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur UI:', error, info);
  }

  render() {
    const { hasError, error } = this.state;
    if (!hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen app-bg flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 border border-red-200">
          <h1 className="text-xl font-semibold text-red-700 mb-3">Une erreur est survenue</h1>
          <p className="text-sm text-gray-700">
            Une action a provoqué un blocage. Vous pouvez recharger la page.
          </p>
          {error && (
            <pre className="mt-4 text-xs text-red-600 whitespace-pre-wrap">
              {error.message || String(error)}
            </pre>
          )}
          <button
            className="mt-5 px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
}
