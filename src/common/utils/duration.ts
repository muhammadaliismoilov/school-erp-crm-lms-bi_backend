const durationPattern = /^(?<amount>\d+)(?<unit>ms|s|m|h|d)$/;

export const parseDurationToMs = (duration: string): number => {
  const match = duration.match(durationPattern);

  if (!match?.groups) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const amount = Number.parseInt(match.groups.amount, 10);
  const unit = match.groups.unit;

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
};
