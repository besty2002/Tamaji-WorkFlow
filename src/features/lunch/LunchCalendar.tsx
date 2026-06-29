import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CircleDollarSign, Utensils } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errors';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/useToast';
import type { LunchRecord } from '../../types/database';
import { calculateLunchCost, getLunchMonthRange, summarizeLunchRecords } from './lunchUtils';

type LunchRecordWithProfile = LunchRecord & {
  profiles?: {
    display_name: string | null;
    email: string;
  } | null;
};

const faceEmojis = ['🙂', '😋', '😄', '😊', '🤗', '😌'];

function getFaceEmoji(userId: string) {
  const total = [...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return faceEmojis[total % faceEmojis.length];
}

function getDisplayName(record: LunchRecordWithProfile) {
  return record.profiles?.display_name || record.profiles?.email?.split('@')[0] || 'ユーザー';
}

function formatDateOnly(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getMealLabel(record: Pick<LunchRecord, 'has_bento' | 'has_rice'>) {
  if (record.has_bento && record.has_rice) return '🍱🍚';
  if (record.has_bento) return '🍱';
  if (record.has_rice) return '🍚';
  return '';
}

export function LunchCalendar() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const monthRange = getLunchMonthRange(currentDate);

  const { data: records = [], isLoading, error } = useQuery({
    queryKey: ['lunchRecords', monthRange.start, monthRange.end],
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

  const myRecords = useMemo(
    () => records.filter((record) => record.user_id === user?.id),
    [records, user?.id],
  );
  const summary = useMemo(() => summarizeLunchRecords(myRecords), [myRecords]);

  const selectedDateKey = formatDateOnly(selectedDate);
  const selectedDayRecords = records.filter((record) => record.meal_date === selectedDateKey);
  const mySelectedRecord = selectedDayRecords.find((record) => record.user_id === user?.id);

  const saveMutation = useMutation({
    mutationFn: async ({ hasBento, hasRice }: { hasBento: boolean; hasRice: boolean }) => {
      if (!user) throw new Error('ログインが必要です。');

      const payload = {
        user_id: user.id,
        meal_date: selectedDateKey,
        has_bento: hasBento,
        has_rice: hasRice,
        cost: calculateLunchCost({ mealDate: selectedDateKey, hasBento, hasRice }),
      };

      const { error } = await supabase
        .from('lunch_records')
        .upsert(payload, { onConflict: 'user_id,meal_date' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lunchRecords'] });
      showToast({ variant: 'success', message: '保存しました。' });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: getErrorMessage(err, '保存中にエラーが発生しました。') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('ログインが必要です。');

      const { error } = await supabase
        .from('lunch_records')
        .delete()
        .eq('user_id', user.id)
        .eq('meal_date', selectedDateKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lunchRecords'] });
      showToast({ variant: 'success', message: '削除しました。' });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: getErrorMessage(err, '削除中にエラーが発生しました。') });
    },
  });

  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={getErrorMessage(error, 'ランチ記録の取得中にエラーが発生しました。')} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-black">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-extrabold tracking-tight text-slate-900">
            <Utensils className="mr-3 h-8 w-8 text-indigo-600" />
            ランチ管理
          </h1>
          <p className="ml-11 mt-1 font-medium text-slate-500">
            弁当とチンご飯の記録をカレンダーで確認できます。
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm md:self-center">
          <button type="button" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-50 hover:text-indigo-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[140px] text-center text-base font-bold text-slate-700">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </span>
          <button type="button" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-50 hover:text-indigo-600">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-xl shadow-slate-200/50 lg:col-span-2">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <div
                  key={day}
                  className={`py-4 text-center text-[11px] font-black uppercase tracking-widest ${
                    index === 0 ? 'bg-red-50/30 text-red-500' : index === 6 ? 'bg-blue-50/30 text-blue-500' : 'text-slate-400'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dateKey = formatDateOnly(day);
                const dayRecords = records.filter((record) => record.meal_date === dateKey);
                const dayOfWeek = getDay(day);
                const isFreeDay = dayOfWeek === 1 || dayOfWeek === 5;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);

                return (
                  <button
                    type="button"
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[96px] border-b border-r border-slate-50 p-2 text-left transition-all ${
                      !isCurrentMonth
                        ? 'bg-slate-50/30 opacity-40'
                        : isFreeDay
                          ? 'bg-emerald-50/30'
                          : 'bg-white'
                    } hover:bg-indigo-50/30 ${isSelected ? 'z-10 bg-indigo-50/50 shadow-lg shadow-indigo-100 ring-2 ring-inset ring-indigo-500' : ''}`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </span>
                      {isFreeDay && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">無料</span>}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayRecords.slice(0, 4).map((record) => (
                        <div key={record.id} className="truncate rounded-lg border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {getFaceEmoji(record.user_id)} {getMealLabel(record)} {getDisplayName(record)}
                        </div>
                      ))}
                      {dayRecords.length > 4 && (
                        <div className="mt-0.5 text-center text-[9px] font-black text-slate-400">
                          + {dayRecords.length - 4} 名
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-xl shadow-slate-200/50">
            <CardHeader className="border-none bg-slate-900 px-8 py-6 text-white">
              <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">今月の合計</div>
              <div className="flex items-center text-3xl font-black">
                <CircleDollarSign className="mr-3 h-7 w-7 text-emerald-300" />
                {summary.totalCost.toLocaleString()}円
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 p-6">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <div className="text-[10px] font-black text-indigo-500">弁当</div>
                <div className="mt-1 text-2xl font-black text-indigo-700">{summary.bentoCount}</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <div className="text-[10px] font-black text-amber-600">チンご飯</div>
                <div className="mt-1 text-2xl font-black text-amber-700">{summary.riceCount}</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="text-[10px] font-black text-emerald-600">無料日</div>
                <div className="mt-1 text-2xl font-black text-emerald-700">{summary.freeCount}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-lg shadow-slate-200/40">
            <CardHeader className="border-none bg-slate-50/70 px-6 py-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">選択した日付</div>
              <div className="mt-1 text-xl font-black text-slate-900">
                {format(selectedDate, 'yyyy年 M月 d日', { locale: ja })}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center text-sm font-black text-slate-700">
                  <Utensils className="mr-2 h-4 w-4 text-amber-500" />
                  自分の記録
                </div>
                <div className="text-sm font-bold text-slate-500">
                  {mySelectedRecord ? `${getMealLabel(mySelectedRecord)} ${mySelectedRecord.cost.toLocaleString()}円` : 'まだ記録していません。'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button type="button" variant="primary" onClick={() => saveMutation.mutate({ hasBento: true, hasRice: false })} disabled={saveMutation.isPending}>
                  🍱 弁当
                </Button>
                <Button type="button" variant="secondary" onClick={() => saveMutation.mutate({ hasBento: false, hasRice: true })} disabled={saveMutation.isPending}>
                  🍚 チンご飯
                </Button>
                <Button type="button" variant="secondary" onClick={() => saveMutation.mutate({ hasBento: true, hasRice: true })} disabled={saveMutation.isPending}>
                  🍱🍚 弁当 + チンご飯
                </Button>
                <Button type="button" variant="outline" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending || !mySelectedRecord}>
                  食べない
                </Button>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">この日のメンバー</div>
                {selectedDayRecords.length > 0 ? (
                  selectedDayRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                      <span>{getFaceEmoji(record.user_id)} {getDisplayName(record)}</span>
                      <span>{getMealLabel(record)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-bold text-slate-400">記録はありません。</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
