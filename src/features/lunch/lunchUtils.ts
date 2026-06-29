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
  profiles?: {
    display_name: string | null;
    email: string;
  } | null;
}

export interface LunchSummary {
  bentoCount: number;
  riceCount: number;
  freeCount: number;
  totalCost: number;
}

export interface LunchUserSummary extends LunchSummary {
  userId: string;
  displayName: string;
  email: string;
  paidCount: number;
  records: LunchSummaryRecord[];
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

function getProfileEmail(record: LunchSummaryRecord) {
  return record.profiles?.email ?? '';
}

function getProfileName(record: LunchSummaryRecord) {
  return record.profiles?.display_name || getProfileEmail(record).split('@')[0] || 'ユーザー';
}

function ateLunch(record: LunchSummaryRecord) {
  return record.has_bento || record.has_rice;
}

export function summarizeLunchRecordsByUser(records: LunchSummaryRecord[]): LunchUserSummary[] {
  const grouped = new Map<string, LunchSummaryRecord[]>();

  for (const record of records) {
    grouped.set(record.user_id, [...(grouped.get(record.user_id) ?? []), record]);
  }

  return [...grouped.entries()]
    .map(([userId, userRecords]) => {
      const sortedRecords = [...userRecords].sort((a, b) => a.meal_date.localeCompare(b.meal_date));
      const base = summarizeLunchRecords(sortedRecords);

      return {
        userId,
        displayName: getProfileName(sortedRecords[0]),
        email: getProfileEmail(sortedRecords[0]),
        ...base,
        paidCount: sortedRecords.filter((record) => ateLunch(record) && record.cost > 0).length,
        records: sortedRecords,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost || a.displayName.localeCompare(b.displayName, 'ja'));
}

function escapeCsvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createLunchSettlementCsv(summaries: LunchUserSummary[]) {
  const rows = [
    ['社員名', 'メール', '弁当数', 'チンご飯数', '無料日利用数', '有料日利用数', '請求額'],
    ...summaries.map((summary) => [
      summary.displayName,
      summary.email,
      summary.bentoCount,
      summary.riceCount,
      summary.freeCount,
      summary.paidCount,
      summary.totalCost,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}
