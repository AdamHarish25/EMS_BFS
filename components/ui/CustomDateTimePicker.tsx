'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import * as Popover from '@radix-ui/react-popover';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export default function CustomDateTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date & time'
}: CustomDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [selectedHour, setSelectedHour] = useState<string>(
    value ? format(new Date(value), 'HH') : '00'
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    value ? format(new Date(value), 'mm') : '00'
  );

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  // Generate minute options (00, 05, 10, ..., 55 or every minute)
  const minutes = Array.from({ length: 60 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  const updateDateTime = (date: Date, hour: string, minute: string) => {
    const newDateTime = new Date(date);
    newDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    const localISODate = new Date(
      newDateTime.getTime() - newDateTime.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);
    onChange(localISODate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateDateTime(date, selectedHour, selectedMinute);
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setSelectedHour(newHour);
    if (selectedDate) {
      updateDateTime(selectedDate, newHour, selectedMinute);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setSelectedMinute(newMinute);
    if (selectedDate) {
      updateDateTime(selectedDate, selectedHour, newMinute);
    }
  };

  const displayValue = value
    ? format(new Date(value), 'MMM d, yyyy HH:mm')
    : placeholder;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </label>
      )}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all',
              !value && 'text-slate-400'
            )}
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm">{displayValue}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 w-[340px] z-50"
            align="start"
            sideOffset={4}
          >
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="border-none"
                />
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Time
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedHour}
                    onChange={handleHourChange}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-slate-400 font-bold">:</span>
                  <select
                    value={selectedMinute}
                    onChange={handleMinuteChange}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {minutes.map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <Popover.Close className="sr-only">Close</Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
