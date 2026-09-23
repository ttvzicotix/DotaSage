import React from 'react';

export default class GamePlanBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('DotaSage Game Plan render failure', error, info);
  }

  resetGamePlan = () => {
    try {
      [
        'dotasage:match-minute',
        'dotasage:match-state',
        'dotasage:match-clock-start',
        'dotasage:match-signature',
        'dotasage:manual-timer-running',
        'dotasage:manual-timer-base',
        'dotasage:manual-timer-anchor',
        'dotasage:observed-enemy-items',
        'dotasage:lane-overrides',
      ].forEach(key => sessionStorage.removeItem(key));
    } catch {}
    this.setState({ error: null });
    this.props.onBack?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="gameplan-recovery">
      <strong>Game Plan recovered safely.</strong>
      <p>A Game Plan component failed, so DotaSage stopped it instead of leaving a black screen.</p>
      <button onClick={this.resetGamePlan}>RESET GAME PLAN & RETURN TO DRAFT</button>
    </main>;
  }
}
