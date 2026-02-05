import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #facc15 0%, #22c55e 100%)',
          padding: '2rem'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem' }}>
            <h2 style={{ color: '#b91c1c', marginBottom: '1rem' }}>Erreur de chargement</h2>
            <p style={{ marginBottom: '1rem' }}>
              Une erreur s'est produite lors du chargement de l'application.
            </p>
            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Détails techniques</summary>
              <pre style={{
                background: '#f1f5f9',
                padding: '1rem',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.85rem'
              }}>
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              className="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

