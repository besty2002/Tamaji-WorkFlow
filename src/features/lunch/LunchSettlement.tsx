import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, getDay, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, ReceiptText, Users, WalletCards } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { ErrorState, LoadingSpinner } from '../../components/ui/States';
import type { LunchRecord } from '../../types/database';
import {
  createLunchSettlementCsv,
  getLunchMonthRange,
  summarizeLunchRecordsByUser,
  type LunchSummaryRecord,
} from './lunchUtils';

type LunchRecordWithProfile = Omit<LunchRecord, 'profiles'> & {
  profiles?: {
    display_name: string | null;
    email: string;
  } | null;
};

function getMealLabel(record: Pick<LunchSummaryRecord, 'has_bento' | 'has_rice'>) {
  if (record.has_bento && record.has_rice) return '弁当 + チンご飯';
  if (record.has_bento) return '弁当';
  if (record.has_rice) return 'チンご飯';
  return '記録なし';
}

function getFreeLabel(record: LunchSummaryRecord) {
  const day = getDay(new Date(`${record.meal_date}T00:00:00`));
  if (day === 1 || day === 5) return '無料日';
  return record.cost > 0 ? '有料日' : '無料提供日';
}

function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function LunchSettlement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthRange = getLunchMonthRange(currentDate);

  const { data: records = [], isLoading, error } = useQuery({
    queryKey: ['lunchSettlementRecords', monthRange.start, monthRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lunch_records')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .gte('meal_date', monthRange.start)
        .lte('meal_date', monthRange.end)
        .order('meal_date', { ascending: true });

      if (error) throw error;
      return data as LunchRecordWithProfile[];
    },
  });

  const summaries = useMemo(
    () => summarizeLunchRecordsByUser(records as LunchSummaryRecord[]),
    [records],
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedSummary = summaries.find((summary) => summary.userId === selectedUserId) ?? summaries[0];
  const totalCost = summaries.reduce((sum, summary) => sum + summary.totalCost, 0);
  const totalBento = summaries.reduce((sum, summary) => sum + summary.bentoCount, 0);
  const totalRice = summaries.reduce((sum, summary) => sum + summary.riceCount, 0);
  const totalFree = summaries.reduce((sum, summary) => sum + summary.freeCount, 0);

  const handleDownloadCsv = () => {
    const csv = createLunchSettlementCsv(summaries);
    downloadCsv(csv, `lunch-settlement-${format(currentDate, 'yyyy-MM')}.csv`);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={getErrorMessage(error, 'ランチ精算データの取得に失敗しました。')} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-extrabold tracking-tight">
            <ReceiptText className="mr-3 h-8 w-8 text-indigo-600" />
            ランチ精算
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            月別集計で社員ごとのランチ利用数と請求額を確認できます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button type="button" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-50 hover:text-indigo-600">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[140px] text-center text-base font-bold text-slate-700">
              {format(currentDate, 'yyyy年 M月', { locale: ja })}
            </span>
            <button type="button" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-50 hover:text-indigo-600">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Button type="button" variant="outline" onClick={handleDownloadCsv} disabled={summaries.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            CSVをダウンロード
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black text-slate-400">合計請求額</div>
            <div className="mt-2 flex items-center text-2xl font-black text-slate-900">
              <WalletCards className="mr-2 h-5 w-5 text-emerald-500" />
              {totalCost.toLocaleString()}円
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black text-slate-400">利用社員数</div>
            <div className="mt-2 flex items-center text-2xl font-black text-slate-900">
              <Users className="mr-2 h-5 w-5 text-indigo-500" />
              {summaries.length}名
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black text-slate-400">弁当数</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totalBento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black text-slate-400">チンご飯数</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totalRice}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-black text-slate-400">無料提供日</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totalFree}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <span>社員別の請求額</span>
            <span className="text-sm font-bold text-slate-400">{summaries.length}名</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="px-5 py-3">社員名</th>
                    <th className="px-5 py-3">弁当数</th>
                    <th className="px-5 py-3">チンご飯数</th>
                    <th className="px-5 py-3">無料日利用数</th>
                    <th className="px-5 py-3">有料日利用数</th>
                    <th className="px-5 py-3 text-right">請求額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries.map((summary) => (
                    <tr
                      key={summary.userId}
                      className={`cursor-pointer transition hover:bg-indigo-50/40 ${selectedSummary?.userId === summary.userId ? 'bg-indigo-50/70' : 'bg-white'}`}
                      onClick={() => setSelectedUserId(summary.userId)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900">{summary.displayName}</div>
                        <div className="text-xs font-semibold text-slate-400">{summary.email}</div>
                      </td>
                      <td className="px-5 py-4 font-bold">{summary.bentoCount}</td>
                      <td className="px-5 py-4 font-bold">{summary.riceCount}</td>
                      <td className="px-5 py-4 font-bold">{summary.freeCount}</td>
                      <td className="px-5 py-4 font-bold">{summary.paidCount}</td>
                      <td className="px-5 py-4 text-right text-base font-black text-slate-900">{summary.totalCost.toLocaleString()}円</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summaries.length === 0 && (
              <div className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                この月のランチ記録はありません。
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>選択した社員の利用明細</CardHeader>
          <CardContent className="space-y-3">
            {selectedSummary ? (
              <>
                <div className="rounded-2xl bg-slate-900 p-5 text-white">
                  <div className="text-sm font-black text-slate-300">{selectedSummary.displayName}</div>
                  <div className="mt-2 text-3xl font-black">{selectedSummary.totalCost.toLocaleString()}円</div>
                </div>
                {selectedSummary.records.map((record) => (
                  <div key={`${record.user_id}-${record.meal_date}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <div className="font-black text-slate-800">{format(new Date(`${record.meal_date}T00:00:00`), 'M月d日（E）', { locale: ja })}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{getMealLabel(record)} / {getFreeLabel(record)}</div>
                    </div>
                    <div className="text-base font-black text-slate-900">{record.cost.toLocaleString()}円</div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm font-bold text-slate-400">社員を選択すると明細が表示されます。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
