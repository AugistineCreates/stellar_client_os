import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CampaignCountdown } from '../CampaignCountdown';
import React from 'react';

describe('CampaignCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders countdown correctly with days remaining', () => {
    const targetDate = new Date('2026-10-05T12:00:00Z');
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));

    render(<CampaignCountdown targetDate={targetDate} />);

    expect(screen.getByText('4')).toBeInTheDocument(); // Days
    expect(screen.getAllByText('00').length).toBeGreaterThan(0); // Hours, Minutes, Seconds
    expect(screen.getByText('Campaign Ends In:')).toBeInTheDocument();
  });

  it('updates countdown correctly after advancing time', () => {
    const targetDate = new Date('2026-10-02T12:00:00Z');
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));

    render(<CampaignCountdown targetDate={targetDate} />);

    expect(screen.getByText('1')).toBeInTheDocument(); // 1 day

    act(() => {
      vi.advanceTimersByTime(1000 * 60 * 60 * 24); // Advance 1 day
    });

    expect(screen.getByText('Campaign Ended')).toBeInTheDocument();
  });

  it('renders urgent state when less than 24 hours remain', () => {
    const targetDate = new Date('2026-10-01T14:00:00Z');
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));

    render(<CampaignCountdown targetDate={targetDate} />);

    expect(screen.getByText('0')).toBeInTheDocument(); // Days
    expect(screen.getByText('02')).toBeInTheDocument(); // Hours
    expect(screen.getByText('Campaign Ending Soon!')).toBeInTheDocument();
  });

  it('renders expired state when target date is in the past', () => {
    const targetDate = new Date('2026-09-01T12:00:00Z');
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));

    render(<CampaignCountdown targetDate={targetDate} />);

    expect(screen.getByText('Campaign Ended')).toBeInTheDocument();
    expect(screen.getByText('This campaign is no longer active.')).toBeInTheDocument();
  });
});
