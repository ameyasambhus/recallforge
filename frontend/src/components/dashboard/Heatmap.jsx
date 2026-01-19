import React, { useMemo } from 'react';

const Heatmap = ({ reviewHistory }) => {
  const { weeks } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include today by setting it to end of day
    
    // Align to the end of the current week (Saturday)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Next Saturday (or today)
    endOfWeek.setHours(23, 59, 59, 999);

    // Go back ~1 year to start. Ensure it's a Sunday.
    // 52 weeks * 7 = 364 days. 
    // We want to cover at least 365 days.
    // Let's take endOfWeek and go back 52 full weeks -> 364 days.
    // That gives us a Saturday. add 1 day to get Sunday? No, subtract.
    
    // Simplest way: Start date = endOfWeek - 370 days (approx) then align to Sunday.
    const startDate = new Date(endOfWeek);
    startDate.setDate(startDate.getDate() - 371); // 53 weeks back
    // startDate is now a Saturday (since endOfWeek is Saturday).
    // We want it to be a Sunday? 
    // If endOfWeek is Sat, endOfWeek - 7*53 is Sat.
    // We want the Sunday *after* that? Or before?
    // Let's just find the Sunday before 365 days ago.
    
    // Align to Sunday
    while (startDate.getDay() !== 0) {
        startDate.setDate(startDate.getDate() + 1);
    }

    const dateMap = reviewHistory || {};
    const generatedWeeks = [];
    
    let currentColumn = [];
    // Initialize first column with pads if needed? 
    // No, startDate is force-aligned to Sunday (index 0), so no padding at start.
    
    let currentDate = new Date(startDate);
    let currentMonth = currentDate.getMonth();

    // Iterate until we reach endOfWeek
    while (currentDate <= endOfWeek) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const month = currentDate.getMonth();

        // Check for month change
        // If the month changed, AND we are not at the start of a column (Sunday), we split.
        // If we are at Sunday (currentColumn.length === 0), it's a natural split, just update month.
        if (month !== currentMonth && currentColumn.length > 0) {
            // Fill rest of current column with nulls
            while (currentColumn.length < 7) {
                currentColumn.push({ date: null }); // Placeholder
            }
            generatedWeeks.push({ days: currentColumn, isNewMonth: false }); // Previous month end
            
            // Start new column for new month
            currentColumn = [];
            // Mark this column as start of new month for spacing
            // But we also need to pad the START of this new column up to current weekday
            for (let i = 0; i < currentDate.getDay(); i++) {
                currentColumn.push({ date: null });
            }
            
            // Note: we'll push this column when it's full or when month changes again
            // We need to flag that this column starts a new month
             currentMonth = month;
             // We can't easily flag "isNewMonth" on the column *object* until we push it.
             // But we are pushing the *previous* column above.
             // The next push (of this column) should have isNewMonth = true.
        } else if (month !== currentMonth) {
             // Month changed exactly on Sunday
             currentMonth = month;
        }

        const count = dateMap[dateStr] || 0;
        
        currentColumn.push({
            date: dateStr,
            count: count,
            isInFuture: currentDate > today,
            isPlaceholder: false
        });

        if (currentColumn.length === 7) {
            // Check if this column was the start of a new month?
            // Simple logic: if the FIRST valid date in this column is the 1st of month?
            // Or just check if the previous generatedWeek was from prev month.
            
            // Better logic for spacing:
            // Calculate isNewMonth based on comparison with previous week's last date?
            // Or just rely on our specific split logic.
            // If we split manually, we definitely have a new month.
            // If we didn't split (natural Sunday transition), we also have a new month.
            
            // Let's determine isStartOfMonth based on content.
            // If the column contains the 1st of a month, it's a start (unless 1st is placeholder?)
            // Actually, if we use the split logic, the `currentColumn` will ALWAYS contain days from ONLY ONE month (except placeholders).
            // So we can check if the month of the first valid day in this week != month of last valid day in prev week.
            
            generatedWeeks.push({ days: currentColumn, isNewMonth: false }); // Logic handled in render or post-process?
            currentColumn = [];
        }

        // Next Day
        currentDate = new Date(currentDate); // Clone to avoid reference issues
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Push last partial column
    if (currentColumn.length > 0) {
        while (currentColumn.length < 7) {
            currentColumn.push({ date: null });
        }
        generatedWeeks.push({ days: currentColumn, isNewMonth: false });
    }

    // Now post-process to set isNewMonth flag for spacing
    for (let i = 1; i < generatedWeeks.length; i++) {
        const prevWeek = generatedWeeks[i-1];
        const currWeek = generatedWeeks[i];
        
        // Find first valid date in current and previous
        const prevValid = prevWeek.days.find(d => d.date);
        const currValid = currWeek.days.find(d => d.date);
        
        if (prevValid && currValid) {
            const d1 = new Date(prevValid.date);
            const d2 = new Date(currValid.date);
            if (d1.getMonth() !== d2.getMonth()) {
                currWeek.isNewMonth = true;
            }
        }
    }

    return { weeks: generatedWeeks };
  }, [reviewHistory]);

  const getColor = (count) => {
    if (count === 0) return 'bg-white/5';
    if (count <= 2) return 'bg-indigo-700/50';
    if (count <= 5) return 'bg-indigo-500/60';
    if (count <= 10) return 'bg-indigo-300/80';
    return 'bg-indigo-100';
  };

  return (
    <div className="w-full">
      <div className="w-full">
        <div className="flex w-full items-end gap-1">
          {weeks.map((week, wIndex) => (
            <div 
              key={wIndex} 
              className={`flex flex-1 min-w-0 flex-col gap-1 ${week.isNewMonth ? 'ml-2' : 'ml-0'}`}
            >
              {week.days.map((day, dIndex) => (
                <div
                  key={dIndex}
                  className={`w-full aspect-square rounded-sm ${(!day.date || day.isInFuture) ? 'opacity-0' : getColor(day.count)} transition-all hover:scale-125 hover:z-10 cursor-default relative group`}
                >
                    {/* Tooltip */}
                    {day.date && !day.isInFuture && (
                        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block transition-opacity z-50 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white shadow-lg border border-white/10 pointer-events-none">
                            {day.count} reviews on {day.date}
                        </div>
                    )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-neutral-500">
           <span>Less</span>
           <div className="flex gap-[3px]">
             <div className="h-3 w-3 rounded-sm bg-white/5"></div>
             <div className="h-3 w-3 rounded-sm bg-indigo-700/50"></div>
             <div className="h-3 w-3 rounded-sm bg-indigo-500/60"></div>
             <div className="h-3 w-3 rounded-sm bg-indigo-300/80"></div>
             <div className="h-3 w-3 rounded-sm bg-indigo-100"></div>
           </div>
           <span>More</span>
        </div>
      </div>
    </div>
  );
};
export default Heatmap;
