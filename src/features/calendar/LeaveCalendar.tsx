import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LeaveRequest } from '../../types/database';

const typeColors: Record<string, string> = {
  paid_leave: 'bg-blue-100 text-blue-800 border-blue-200',
  sick: 'bg-red-100 text-red-800 border-red-200',
  special: 'bg-purple-100 text-purple-800 border-purple-200',
  unpaid: 'bg-gray-100 text-gray-800 border-gray-200'
};

export function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['approvedRequests', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .eq('status', 'approved');
      
      if (error) throw error;
      return data as LeaveRequest[];
    }
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="カレンダーデータの取得中にエラーが発生しました。" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">休暇カレンダー</h1>
        <div className="flex items-center space-x-4 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold min-w-[120px] text-center">
            {format(currentDate, 'yyyy年 MM月', { locale: ja })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayRequests = requests?.filter(req => {
                const start = parseISO(req.start_date);
                const end = parseISO(req.end_date);
                return isWithinInterval(day, { start, end });
              }) || [];

              return (
                <div
                  key={day.toString()}
                  className={`min-h-[120px] p-2 border-r border-b border-gray-100 transition-colors ${
                    !isSameMonth(day, monthStart) ? 'bg-gray-50/50' : 'bg-white'
                  } ${isSameDay(day, new Date()) ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    !isSameMonth(day, monthStart) ? 'text-gray-400' : 
                    isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${typeColors[req.type] || typeColors.paid_leave}`}
                        title={`${req.profiles?.display_name || req.profiles?.email}: ${req.reason || ''}`}
                      >
                        {req.is_half_day ? `[${req.half_day_type}] ` : ''}
                        {req.profiles?.display_name || req.profiles?.email?.split('@')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(typeColors).map(([type, colorClass]) => {
          const labels: Record<string, string> = {
            paid_leave: '年次有給休暇',
            sick: '病気休暇',
            special: '特別休暇',
            unpaid: '無給休暇'
          };
          return (
            <div key={type} className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-sm border ${colorClass.split(' ')[0]} ${colorClass.split(' ')[2]}`}></span>
              <span className="text-gray-600">{labels[type]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
