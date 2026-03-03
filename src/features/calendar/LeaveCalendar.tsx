import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
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
  parseISO,
  getDay
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, Calendar as CalendarIcon, Info, Flag } from 'lucide-react';
import type { LeaveRequest, PublicHoliday } from '../../types/database';

const typeColors: Record<string, string> = {
  paid_leave: 'bg-indigo-500',
  sick: 'bg-red-500',
  special: 'bg-purple-500',
  unpaid: 'bg-slate-400'
};

const typeLightColors: Record<string, string> = {
  paid_leave: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  sick: 'bg-red-50 text-red-700 border-red-100',
  special: 'bg-purple-50 text-purple-700 border-purple-100',
  unpaid: 'bg-slate-50 text-slate-700 border-slate-200'
};

const typeLabels: Record<string, string> = {
  paid_leave: '年次有給休暇',
  sick: '病気休暇',
  special: '特別休暇',
  unpaid: '無給休暇'
};

export function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Fetch Approved Leave Requests
  const { data: requests, isLoading: isRequestsLoading, error: requestsError } = useQuery({
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

  // Fetch Public Holidays
  const { data: holidays, isLoading: isHolidaysLoading } = useQuery({
    queryKey: ['publicHolidays', format(currentDate, 'yyyy')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*');
      if (error) throw error;
      return data as PublicHoliday[];
    }
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  if (isRequestsLoading || isHolidaysLoading) return <LoadingSpinner />;
  if (requestsError) return <ErrorState message="カレンダーデータの取得中にエラーが発生しました。" />;

  const selectedDateRequests = requests?.filter(req => {
    const start = parseISO(req.start_date);
    const end = parseISO(req.end_date);
    return isWithinInterval(selectedDate, { start, end });
  }) || [];

  const selectedDayHoliday = holidays?.find(h => isSameDay(parseISO(h.date), selectedDate));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <CalendarIcon className="w-8 h-8 mr-3 text-indigo-600" />
            休暇カレンダー
          </h1>
          <p className="text-slate-500 mt-1 font-medium ml-11">
            チームの休暇スケジュールを把握しましょう。
          </p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm self-start md:self-center text-black">
          <button onClick={prevMonth} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold min-w-[140px] text-center text-slate-700">
            {format(currentDate, 'yyyy年 MM月', { locale: ja })}
          </span>
          <button onClick={nextMonth} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0 text-black">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
                <div key={day} className={`py-4 text-center text-[11px] font-black uppercase tracking-widest ${idx === 0 ? 'text-red-500 bg-red-50/30' : idx === 6 ? 'text-blue-500 bg-blue-50/30' : 'text-slate-400'}`}>
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

                const holiday = holidays?.find(h => isSameDay(parseISO(h.date), day));
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, monthStart);
                const dayOfWeek = getDay(day); // 0: Sunday, 6: Saturday

                return (
                  <div
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[85px] md:min-h-[125px] p-1.5 md:p-2 border-r border-b border-slate-50 transition-all cursor-pointer relative group ${
                      !isCurrentMonth ? 'bg-slate-50/30 opacity-40' : 
                      dayOfWeek === 0 || holiday ? 'bg-red-50/10' : 
                      dayOfWeek === 6 ? 'bg-blue-50/10' : 'bg-white'
                    } hover:bg-indigo-50/30 ${isSelected ? 'bg-indigo-50/50 ring-2 ring-indigo-500 ring-inset z-10 shadow-lg shadow-indigo-100' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className={`text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                        isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 
                        isSelected ? 'text-indigo-600' :
                        holiday || dayOfWeek === 0 ? 'text-red-500' :
                        dayOfWeek === 6 ? 'text-blue-500' :
                        !isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      {holiday && (
                        <div className="text-[8px] md:text-[9px] font-bold text-red-400 truncate max-w-[70%] text-right leading-tight">
                          {holiday.name}
                        </div>
                      )}
                    </div>
                    
                    {/* Names display */}
                    <div className="space-y-1 overflow-hidden">
                      {dayRequests.slice(0, 2).map((req) => (
                        <div
                          key={req.id}
                          className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-lg border font-bold truncate ${typeLightColors[req.type] || typeLightColors.paid_leave}`}
                        >
                          {req.profiles?.display_name || req.profiles?.email?.split('@')[0]}
                        </div>
                      ))}
                      {dayRequests.length > 2 && (
                        <div className="text-[8px] md:text-[9px] font-black text-slate-400 text-center mt-0.5">
                          + {dayRequests.length - 2} 名
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <div className="space-y-6 text-black">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-6 px-8 border-none">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 text-white">選択された日付</div>
              <div className="text-2xl font-black text-white flex items-center">
                {format(selectedDate, 'yyyy年 MM月 dd日', { locale: ja })}
                {selectedDayHoliday && (
                  <span className="ml-3 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-lg border border-red-500/30 flex items-center">
                    <Flag className="w-3 h-3 mr-1" />
                    {selectedDayHoliday.name}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                {selectedDateRequests.length > 0 ? (
                  selectedDateRequests.map((req) => (
                    <div key={req.id} className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${typeColors[req.type] || typeColors.paid_leave}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {req.profiles?.display_name || req.profiles?.email?.split('@')[0]}
                        </div>
                        <div className="text-xs font-bold text-indigo-600 uppercase mt-0.5">
                          {typeLabels[req.type]} {req.is_half_day && `(${req.half_day_type === 'AM' ? '午前' : '午後'}半休)`}
                        </div>
                        {req.reason && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic font-medium">
                            " {req.reason} "
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 border border-slate-100">
                      <Info className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">休暇中のメンバーはいません。</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white p-6">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(typeLabels).map(([type, label]) => (
                <div key={type} className="flex items-center space-x-2.5 p-2 rounded-xl border border-slate-50 bg-slate-50/30">
                  <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${typeColors[type]}`}></span>
                  <span className="text-[11px] font-black text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
