// endpoints/event-logs/event-logs.const.ts

export const EVENT_LOG_NOT_FOUND = 'Event log not found';
export const EVENT_LOG_CREATION_ERROR = 'Error creating event log';
export const EVENT_LOG_UPDATE_ERROR = 'Error updating event log';
export const EVENT_LOG_DELETION_ERROR = 'Error deleting event log';
export const EVENT_LOG_GET_ERROR = 'Error fetching event logs';
export const EVENT_LOG_ALREADY_CHECKED_IN = 'User already checked in for this event';
export const EVENT_LOG_NOT_CHECKED_IN = 'User not checked in for this event';
export const CHECK_OUT_TIME_BEFORE_CHECK_IN = 'Check out time cannot be before check in time';
export const INVALID_TIME_RANGE = 'Invalid time range';

// Rewards constants
export const REWARD_POINTS_PER_30_MINS = 5;
export const BADGE_SILVER_HOURS = 5;
export const BADGE_GOLD_HOURS = 10;
export const BADGE_DIAMOND_HOURS = 15;

// Badge messages
export const BADGE_MESSAGES = {
  SILVER: '🎉 Congratulations! You earned a SILVER BADGE for completing 5 hours of service!',
  GOLD: '🏆 Amazing! You earned a GOLD BADGE for completing 10 hours of service!',
  DIAMOND: '💎 Outstanding! You earned a DIAMOND CHAMPIONS BADGE for completing 15 hours of service!'
};