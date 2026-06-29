export interface LunchCostInput {
  mealDate: string;
  hasBento: boolean;
  hasRice: boolean;
}

export interface LunchSummaryRecord {
  user_id: string;
  meal_date: string;
  has_bento: boolean;
  has_rice: boolean;
  cost: number;
}

export interface LunchSummary {
  bentoCount: number;
  riceCount: number;
  freeCount: number;
  totalCost: number;
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateLunchCost({ mealDate, hasBento, hasRice }: LunchCostInput) {
  if (!hasBento && !hasRice) return 0;

  const day = new Date(`${mealDate}T00:00:00`).getDay();
  if (day === 1 || day === 5) return 0;

  return (hasBento ? 400 : 0) + (hasRice ? 100 : 0);
}

export function getLunchMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: toDateOnly(start),
    end: toDateOnly(end),
  };
}

export function summarizeLunchRecords(records: LunchSummaryRecord[]): LunchSummary {
  return records.reduce<LunchSummary>(
    (summary, record) => ({
      bentoCount: summary.bentoCount + (record.has_bento ? 1 : 0),
      riceCount: summary.riceCount + (record.has_rice ? 1 : 0),
      freeCount: summary.freeCount + (record.cost === 0 && (record.has_bento || record.has_rice) ? 1 : 0),
      totalCost: summary.totalCost + record.cost,
    }),
    {
      bentoCount: 0,
      riceCount: 0,
      freeCount: 0,
      totalCost: 0,
    },
  );
}
