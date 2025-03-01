<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { format, parseISO, startOfWeek, addDays, differenceInDays, eachDayOfInterval, subMonths, isWithinInterval, isSameDay } from 'date-fns';
import { fetchDailyCounts } from '../api/stats';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface DailyCount {
  date: string;
  count: number;
}

interface ReadingCounts {
  archived_count: number;
  later_count: number;
}

const readCounts = ref<DailyCount[]>([]);
const savedCounts = ref<DailyCount[]>([]);
const totalCounts = ref<ReadingCounts | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function loadDailyCounts() {
  try {
    loading.value = true;
    const data = await fetchDailyCounts();
    readCounts.value = data.readCounts;
    savedCounts.value = data.savedCounts;
    totalCounts.value = data.totalCounts;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data';
    console.error('Error fetching counts:', err);
  } finally {
    loading.value = false;
  }
}

const formattedData = computed(() => {
  const readData = readCounts.value.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM d'),
    goalMet: item.count >= 5,
  }));

  const savedData = savedCounts.value.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM d'),
  }));

  // Get unique dates from both arrays
  const allDates = [...new Set([
    ...readData.map(d => d.formattedDate),
    ...savedData.map(d => d.formattedDate)
  ])].sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());
  
  // Limit the number of data points to improve readability
  // Show more recent data points with higher priority
  let dates = allDates;
  if (allDates.length > 30) {
    // For large datasets, show the most recent 30 days
    dates = allDates.slice(-30);
  }

  return {
    labels: dates,
    datasets: [
      {
        label: 'Read > Saved',
        data: dates.map(date => {
          const readItem = readData.find(d => d.formattedDate === date);
          const savedItem = savedData.find(d => d.formattedDate === date);
          const readCount = readItem ? readItem.count : 0;
          const savedCount = savedItem ? savedItem.count : 0;
          return readCount > savedCount ? readCount : 0;
        }),
        fill: true,
        backgroundColor: 'rgba(100, 108, 255, 0.08)',
        borderWidth: 0,
        pointRadius: 0,
        order: 3 // Put this dataset in the background
      },
      {
        label: 'Articles Read',
        data: dates.map(date => {
          const item = readData.find(d => d.formattedDate === date);
          return item ? item.count : 0;
        }),
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return 'rgba(100, 108, 255, 0)';
          }
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(100, 108, 255, 0)');
          gradient.addColorStop(1, 'rgba(100, 108, 255, 0.1)');
          return gradient;
        },
        borderColor: '#646cff',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#646cff',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointRadius: (context: any) => {
          const dataPoint = readData.find(d => d.formattedDate === dates[context.dataIndex]);
          return dataPoint && dataPoint.goalMet ? 4 : 3;
        },
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#646cff',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        order: 1
      },
      {
        label: 'Articles Saved',
        data: dates.map(date => {
          const item = savedData.find(d => d.formattedDate === date);
          return item ? item.count : 0;
        }),
        fill: false,
        borderColor: '#22c55e',
        borderWidth: 2,
        tension: 0.4,
        borderDash: [5, 5],
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#22c55e',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        order: 2
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 10,
      right: 10,
      bottom: 30,
      left: 10
    }
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'center' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        filter: (item: any) => item.text !== 'Read > Saved' // Hide the background dataset from legend
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      titleFont: {
        size: 14,
        weight: 'bold' as const,
      },
      bodyFont: {
        size: 13
      },
      padding: 12,
      cornerRadius: 6,
      displayColors: true,
      usePointStyle: true,
      callbacks: {
        title: function(context: any) {
          return context[0].label;
        },
        label: function(context: any) {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          return `${label}: ${value}`;
        },
        footer: function(context: any) {
          const date = context[0].label;
          const readValue = formattedData.value.datasets[1].data[context[0].dataIndex];
          const savedValue = formattedData.value.datasets[2].data[context[0].dataIndex];
          
          const messages = [];
          
          if (readValue >= 5) {
            messages.push('🎯 Daily goal achieved!');
          }
          
          if (readValue > savedValue) {
            messages.push('✅ Read more than saved');
          } else if (readValue < savedValue) {
            messages.push('📌 Saved more than read');
          }
          
          if (readValue === 0 && savedValue === 0) {
            messages.push('⚠️ No reading activity');
          }
          
          return messages.join('\n');
        }
      }
    },
    annotation: {
      annotations: {
        line1: {
          type: 'line',
          yMin: 5,
          yMax: 5,
          borderColor: 'rgba(255, 68, 68, 0.7)',
          borderWidth: 2,
          borderDash: [6, 4],
          label: {
            content: 'Daily Goal (5)',
            enabled: true,
            position: 'end',
            backgroundColor: 'rgba(255, 68, 68, 0.7)',
            font: {
              size: 12
            },
            padding: {
              x: 6,
              y: 4
            },
            borderRadius: 4
          }
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11
        },
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit: 15, // Limit the number of ticks shown on the x-axis
        callback: function(value: any, index: number, values: any[]) {
          // Show fewer labels on the x-axis for better readability
          const labels = formattedData.value.labels;
          if (labels.length <= 15 || index % Math.ceil(labels.length / 15) === 0) {
            return labels[index];
          }
          return '';
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.05)',
        drawBorder: false
      },
      ticks: {
        stepSize: 5, // Increase step size for better readability
        font: {
          size: 11
        },
        padding: 8
      }
    }
  }
};

const stats = computed(() => {
  if (readCounts.value.length === 0 || savedCounts.value.length === 0) {
    return {
      readYesterday: 0,
      savedYesterday: 0,
      readAverage: '0.0',
      savedAverage: '0.0',
      goalsMetCount: 0,
      readTotal: 0,
      savedTotal: 0
    };
  }
  
  const readData = readCounts.value;
  const savedData = savedCounts.value;
  
  // Get the most recent date's data (which is yesterday's data)
  const readYesterday = readData[readData.length - 1]?.count || 0;
  const savedYesterday = savedData[savedData.length - 1]?.count || 0;
  
  return {
    readYesterday,
    savedYesterday,
    readAverage: (readData.reduce((sum, item) => sum + item.count, 0) / readData.length || 0).toFixed(1),
    savedAverage: (savedData.reduce((sum, item) => sum + item.count, 0) / savedData.length || 0).toFixed(1),
    goalsMetCount: readData.filter(item => item.count >= 5).length,
    readTotal: readData.reduce((sum, item) => sum + item.count, 0),
    savedTotal: savedData.reduce((sum, item) => sum + item.count, 0)
  };
});

const tableData = computed(() => {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  
  return readCounts.value.map(item => ({
    date: format(parseISO(item.date), 'EEE, MMM d'),
    count: item.count,
    goalMet: item.count >= 5,
    remaining: Math.max(0, 5 - item.count),
    percentage: (item.count / 5) * 100,
    isToday: item.date === today
  })).reverse();
});

const weeklyStats = computed(() => {
  if (readCounts.value.length === 0) return [];
  
  // Group by week
  const weekMap = new Map();
  
  // Find the earliest and latest dates in the data
  const dates = [...readCounts.value, ...savedCounts.value].map(item => parseISO(item.date));
  const earliestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const latestDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
  
  // Get current week start
  const currentWeekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  
  // Ensure we show at least 12 weeks of data
  const minWeeksToShow = 12;
  let startDate = startOfWeek(earliestDate);
  const endDate = startOfWeek(latestDate);
  
  // If we have less than minWeeksToShow weeks of data, extend the start date
  const weeksInData = Math.ceil(differenceInDays(endDate, startDate) / 7) + 1;
  if (weeksInData < minWeeksToShow) {
    startDate = addDays(endDate, -7 * (minWeeksToShow - 1));
  }
  
  // Create entries for all weeks in the range
  let weekIterator = startDate;
  while (differenceInDays(endDate, weekIterator) >= -6) { // Include the end week
    const weekStartStr = format(weekIterator, 'yyyy-MM-dd');
    weekMap.set(weekStartStr, {
      weekStart: weekStartStr,
      readCount: 0,
      savedCount: 0,
      daysWithGoalMet: 0,
      daysTracked: 0,
      isHighlight: weekStartStr === currentWeekStart
    });
    weekIterator = addDays(weekIterator, 7);
  }
  
  // Add read counts
  readCounts.value.forEach(item => {
    const date = parseISO(item.date);
    const weekStart = format(startOfWeek(date), 'yyyy-MM-dd');
    
    if (weekMap.has(weekStart)) {
      const weekData = weekMap.get(weekStart);
      weekData.readCount += item.count;
      weekData.daysTracked += 1;
      if (item.count >= 5) {
        weekData.daysWithGoalMet += 1;
      }
    }
  });
  
  // Add saved counts
  savedCounts.value.forEach(item => {
    const date = parseISO(item.date);
    const weekStart = format(startOfWeek(date), 'yyyy-MM-dd');
    
    if (weekMap.has(weekStart)) {
      weekMap.get(weekStart).savedCount += item.count;
    }
  });
  
  // Convert to array and sort
  return Array.from(weekMap.values())
    .sort((a, b) => parseISO(b.weekStart).getTime() - parseISO(a.weekStart).getTime())
    .map(week => ({
      ...week,
      weekLabel: `${format(parseISO(week.weekStart), 'MMM d')} - ${format(addDays(parseISO(week.weekStart), 6), 'MMM d')}`,
      readAvg: week.daysTracked > 0 ? (week.readCount / week.daysTracked).toFixed(1) : '0.0',
      savedAvg: week.daysTracked > 0 ? (week.savedCount / week.daysTracked).toFixed(1) : '0.0',
      successRate: week.daysTracked > 0 ? ((week.daysWithGoalMet / week.daysTracked) * 100).toFixed(0) : '0',
      isEmpty: week.daysTracked === 0,
      isHighlight: week.weekStart === currentWeekStart || 
                  (weekMap.values().next().value && week.weekStart === weekMap.values().next().value.weekStart)
    }));
});

const streakStats = computed(() => {
  if (readCounts.value.length === 0) return { current: 0, longest: 0 };
  
  // Sort by date ascending
  const sortedDates = [...readCounts.value]
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let currentRun = 0;
  
  // Calculate streaks (consecutive days with goal met)
  for (let i = 0; i < sortedDates.length; i++) {
    if (sortedDates[i].count >= 5) {
      currentRun++;
      
      // Check if dates are consecutive
      if (i > 0) {
        const prevDate = parseISO(sortedDates[i-1].date);
        const currDate = parseISO(sortedDates[i].date);
        const dayDiff = differenceInDays(currDate, prevDate);
        
        if (dayDiff > 1) {
          // Break in consecutive days
          currentRun = 1;
        }
      }
    } else {
      currentRun = 0;
    }
    
    // Update longest streak
    longestStreak = Math.max(longestStreak, currentRun);
    
    // If this is the most recent date (yesterday), set current streak
    if (i === sortedDates.length - 1) {
      currentStreak = currentRun;
    }
  }
  
  return { current: currentStreak, longest: longestStreak };
});

// Add velocity metrics
const velocityStats = computed(() => {
  if (readCounts.value.length === 0 || savedCounts.value.length === 0) {
    return { 
      last7Days: 0, 
      last30Days: 0,
      trend: 'neutral',
      estimatedDaysToEmpty: 0,
      backlogGrowth: 0
    };
  }
  
  // Sort by date ascending
  const sortedReadCounts = [...readCounts.value]
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  
  const sortedSavedCounts = [...savedCounts.value]
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  
  // Get the most recent date (yesterday)
  const lastDate = parseISO(sortedReadCounts[sortedReadCounts.length - 1].date);
  
  // Calculate read vs saved for last 7 days (up to yesterday)
  const last7DaysRead = sortedReadCounts
    .filter(item => differenceInDays(lastDate, parseISO(item.date)) < 7)
    .reduce((sum, item) => sum + item.count, 0);
  
  const last7DaysSaved = sortedSavedCounts
    .filter(item => differenceInDays(lastDate, parseISO(item.date)) < 7)
    .reduce((sum, item) => sum + item.count, 0);
  
  // Calculate read vs saved for last 30 days (up to yesterday)
  const last30DaysRead = sortedReadCounts
    .filter(item => differenceInDays(lastDate, parseISO(item.date)) < 30)
    .reduce((sum, item) => sum + item.count, 0);
  
  const last30DaysSaved = sortedSavedCounts
    .filter(item => differenceInDays(lastDate, parseISO(item.date)) < 30)
    .reduce((sum, item) => sum + item.count, 0);
  
  // Calculate velocity (read minus saved)
  const velocity7Days = last7DaysRead - last7DaysSaved;
  const velocity30Days = last30DaysRead - last30DaysSaved;
  
  // Determine trend
  let trend = 'neutral';
  if (velocity7Days > 0 && velocity30Days > 0) {
    trend = 'positive';
  } else if (velocity7Days < 0 && velocity30Days < 0) {
    trend = 'negative';
  }
  
  // Calculate estimated days to empty reading list
  let estimatedDaysToEmpty = 0;
  if (velocity30Days > 0 && totalCounts.value) {
    // Daily read rate over last 30 days
    const dailyReadRate = last30DaysRead / 30;
    estimatedDaysToEmpty = Math.round(totalCounts.value.later_count / dailyReadRate);
  }
  
  // Calculate backlog growth rate (negative means shrinking)
  const backlogGrowth = last30DaysSaved - last30DaysRead;
  
  return {
    last7Days: velocity7Days,
    last30Days: velocity30Days,
    trend,
    estimatedDaysToEmpty,
    backlogGrowth
  };
});

// Add weekly performance metrics
const weeklyBestPerformance = computed(() => {
  if (weeklyStats.value.length === 0) {
    return { weekLabel: 'No data', readCount: 0, readAvg: '0.0' };
  }
  
  // Find the week with the highest read count (excluding empty weeks)
  const nonEmptyWeeks = weeklyStats.value.filter(week => !week.isEmpty);
  if (nonEmptyWeeks.length === 0) {
    return { weekLabel: 'No data', readCount: 0, readAvg: '0.0' };
  }
  
  const bestWeek = nonEmptyWeeks.reduce((best, current) => 
    current.readCount > best.readCount ? current : best, nonEmptyWeeks[0]);
  
  return {
    weekLabel: bestWeek.weekLabel,
    readCount: bestWeek.readCount,
    readAvg: bestWeek.readAvg
  };
});

const weeklyGoalAchievement = computed(() => {
  const nonEmptyWeeks = weeklyStats.value.filter(week => !week.isEmpty);
  if (nonEmptyWeeks.length === 0) {
    return { rate: 0, count: 0, total: 0 };
  }
  
  // Count weeks where success rate is at least 70% (5 out of 7 days)
  const successfulWeeks = nonEmptyWeeks.filter(week => parseInt(week.successRate) >= 70);
  
  return {
    rate: Math.round((successfulWeeks.length / nonEmptyWeeks.length) * 100),
    count: successfulWeeks.length,
    total: nonEmptyWeeks.length
  };
});

const weeklyTrend = computed(() => {
  const nonEmptyWeeks = weeklyStats.value.filter(week => !week.isEmpty);
  if (nonEmptyWeeks.length < 2) {
    return { direction: 'stable', message: 'Not enough data to determine trend' };
  }
  
  // Get the 4 most recent weeks (or fewer if not available)
  const recentWeeks = nonEmptyWeeks.slice(0, 4);
  
  // Calculate average read count for first half and second half
  const midpoint = Math.ceil(recentWeeks.length / 2);
  const olderWeeks = recentWeeks.slice(midpoint);
  const newerWeeks = recentWeeks.slice(0, midpoint);
  
  const olderAvg = olderWeeks.reduce((sum, week) => sum + week.readCount, 0) / olderWeeks.length;
  const newerAvg = newerWeeks.reduce((sum, week) => sum + week.readCount, 0) / newerWeeks.length;
  
  // Determine trend direction
  const percentChange = ((newerAvg - olderAvg) / olderAvg) * 100;
  
  if (percentChange >= 10) {
    return { 
      direction: 'up', 
      message: `Reading volume increased by ${Math.round(percentChange)}% compared to previous weeks` 
    };
  } else if (percentChange <= -10) {
    return { 
      direction: 'down', 
      message: `Reading volume decreased by ${Math.round(Math.abs(percentChange))}% compared to previous weeks` 
    };
  } else {
    return { 
      direction: 'stable', 
      message: 'Reading volume has been relatively stable in recent weeks' 
    };
  }
});

onMounted(() => {
  loadDailyCounts();
});
</script>

<template>
  <div class="daily-stats">
    <h2 class="text-xl font-bold mb-4">
      Daily Reading Activity
    </h2>

    <div
      v-if="loading"
      class="loading"
    >
      Loading statistics...
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>

    <template v-else>
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Reading Activity Trends</h3>
          <p class="chart-subtitle">Track your daily reading and saving patterns (data up to yesterday)</p>
          <p class="chart-note" v-if="readCounts.length > 30">
            Showing the most recent 30 days of data
          </p>
        </div>
        <Line
          :data="formattedData"
          :options="chartOptions"
        />
      </div>

      <div class="stats-grid">
        <!-- Daily Activity Group -->
        <div class="stat-group">
          <h4 class="group-title">Yesterday's Activity</h4>
          <div class="group-cards">
            <div class="stat-card">
              <p class="label">Read Yesterday</p>
              <p class="value">{{ stats.readYesterday }}</p>
              <div class="goal-indicator" v-if="stats.readYesterday >= 5">Goal Met ✓</div>
              <div class="goal-indicator pending" v-else>Goal: {{ 5 - stats.readYesterday }} more</div>
            </div>
            <div class="stat-card">
              <p class="label">Saved Yesterday</p>
              <p class="value">{{ stats.savedYesterday }}</p>
              <div class="net-indicator" :class="{ 
                'positive': stats.readYesterday > stats.savedYesterday,
                'negative': stats.readYesterday < stats.savedYesterday
              }" v-if="stats.readYesterday !== 0 || stats.savedYesterday !== 0">
                {{ stats.readYesterday > stats.savedYesterday ? 'Net Positive ↑' : 'Net Negative ↓' }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Performance Group -->
        <div class="stat-group">
          <h4 class="group-title">Performance</h4>
          <div class="group-cards">
            <div class="stat-card">
              <p class="label">Read Average</p>
              <p class="value">{{ stats.readAverage }}</p>
              <div class="avg-indicator" :class="{
                'good': parseFloat(stats.readAverage) >= 5,
                'medium': parseFloat(stats.readAverage) >= 3 && parseFloat(stats.readAverage) < 5,
                'low': parseFloat(stats.readAverage) < 3
              }">
                {{ parseFloat(stats.readAverage) >= 5 ? 'Above Goal' : 
                   parseFloat(stats.readAverage) >= 3 ? 'Moderate' : 'Below Goal' }}
              </div>
            </div>
            <div class="stat-card">
              <p class="label">Saved Average</p>
              <p class="value">{{ stats.savedAverage }}</p>
            </div>
            <div class="stat-card">
              <p class="label">Goals Met</p>
              <p class="value">{{ stats.goalsMetCount }}</p>
              <div class="completion-percent" v-if="readCounts.length > 0">
                {{ Math.round((stats.goalsMetCount / readCounts.length) * 100) }}% of days
              </div>
            </div>
          </div>
        </div>
        
        <!-- Totals Group -->
        <div class="stat-group wide-group">
          <h4 class="group-title">Library Status</h4>
          <div class="group-cards">
            <div class="stat-card">
              <p class="label">Total Read</p>
              <p class="value">{{ stats.readTotal.toLocaleString() }}</p>
            </div>
            <div class="stat-card highlight-card">
              <p class="label">Total Archive</p>
              <p class="value">{{ totalCounts?.archived_count?.toLocaleString() || 0 }}</p>
            </div>
            <div class="stat-card highlight-card">
              <p class="label">Reading List</p>
              <p class="value">{{ totalCounts?.later_count?.toLocaleString() || 0 }}</p>
              <div class="backlog-indicator" v-if="velocityStats.estimatedDaysToEmpty > 0">
                {{ velocityStats.estimatedDaysToEmpty }} days to empty
              </div>
            </div>
          </div>
        </div>
        
        <!-- Streaks & Velocity Group -->
        <div class="stat-group wide-group">
          <h4 class="group-title">Momentum</h4>
          <div class="group-cards">
            <div class="stat-card streak-card">
              <div class="streak-icon">🔥</div>
              <div class="streak-content">
                <p class="label">Current Streak</p>
                <p class="value">{{ streakStats.current }} days</p>
                <p class="streak-best" v-if="streakStats.longest > 0">
                  Best: {{ streakStats.longest }} days
                </p>
              </div>
            </div>
            
            <div class="stat-card velocity-card" :class="{ 
              'positive-velocity': velocityStats.last7Days > 0,
              'negative-velocity': velocityStats.last7Days < 0
            }">
              <p class="label">7-Day Velocity</p>
              <p class="value">
                <span v-if="velocityStats.last7Days > 0">+</span>{{ velocityStats.last7Days }}
                <span class="velocity-icon" v-if="velocityStats.last7Days !== 0">
                  {{ velocityStats.last7Days > 0 ? '↑' : '↓' }}
                </span>
              </p>
              <p class="velocity-desc">
                {{ velocityStats.last7Days > 0 ? 'Reading faster than saving' : 
                   velocityStats.last7Days < 0 ? 'Saving faster than reading' : 'Balanced' }}
              </p>
            </div>
            
            <div class="stat-card velocity-card" :class="{ 
              'positive-velocity': velocityStats.last30Days > 0,
              'negative-velocity': velocityStats.last30Days < 0
            }">
              <p class="label">30-Day Velocity</p>
              <p class="value">
                <span v-if="velocityStats.last30Days > 0">+</span>{{ velocityStats.last30Days }}
                <span class="velocity-icon" v-if="velocityStats.last30Days !== 0">
                  {{ velocityStats.last30Days > 0 ? '↑' : '↓' }}
                </span>
              </p>
              <p class="velocity-desc">
                {{ velocityStats.trend === 'positive' ? 'Positive trend' : 
                   velocityStats.trend === 'negative' ? 'Negative trend' : 'Neutral trend' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Remove velocity insights section after the stats grid -->
      <div class="daily-breakdown enhanced-weekly">
        <h3 class="text-lg font-semibold mb-3 mt-6">
          Weekly Reading Insights
        </h3>
        
        <!-- Add weekly performance summary cards -->
        <div class="weekly-summary-cards">
          <div class="summary-card">
            <div class="summary-icon">📊</div>
            <div class="summary-content">
              <h4 class="summary-title">Best Week</h4>
              <p class="summary-value">
                {{ weeklyBestPerformance.weekLabel }}
              </p>
              <p class="summary-detail">
                {{ weeklyBestPerformance.readCount }} articles read ({{ weeklyBestPerformance.readAvg }} daily avg)
              </p>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">🎯</div>
            <div class="summary-content">
              <h4 class="summary-title">Goal Achievement</h4>
              <p class="summary-value">
                {{ weeklyGoalAchievement.rate }}% of weeks
              </p>
              <p class="summary-detail">
                Met daily goal at least 5 days in {{ weeklyGoalAchievement.count }} of {{ weeklyGoalAchievement.total }} tracked weeks
              </p>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">📈</div>
            <div class="summary-content">
              <h4 class="summary-title">Weekly Trend</h4>
              <p class="summary-value">
                <span v-if="weeklyTrend.direction === 'up'">↗️ Improving</span>
                <span v-else-if="weeklyTrend.direction === 'down'">↘️ Declining</span>
                <span v-else>➡️ Stable</span>
              </p>
              <p class="summary-detail">
                {{ weeklyTrend.message }}
              </p>
            </div>
          </div>
        </div>
        
        <div class="table-container mt-4">
          <table class="progress-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Total Read</th>
                <th>Daily Avg</th>
                <th>Saved</th>
                <th>Net</th>
                <th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="week in weeklyStats"
                :key="week.weekStart"
                :class="{ 
                  'empty-week': week.isEmpty,
                  'highlight-week': week.isHighlight
                }"
              >
                <td class="week-cell">
                  <div class="week-label">{{ week.weekLabel }}</div>
                  <div class="week-badge" v-if="week.isHighlight">Current</div>
                </td>
                <td class="count-cell">
                  <span class="count-value">{{ week.readCount }}</span>
                </td>
                <td class="avg-cell">
                  <span class="avg-value" :class="{
                    'good-avg': parseFloat(week.readAvg) >= 5,
                    'medium-avg': parseFloat(week.readAvg) >= 3 && parseFloat(week.readAvg) < 5,
                    'low-avg': parseFloat(week.readAvg) < 3 && !week.isEmpty
                  }">{{ week.readAvg }}</span>
                </td>
                <td class="count-cell">
                  <span class="count-value">{{ week.savedCount }}</span>
                </td>
                <td class="net-cell">
                  <span 
                    class="net-value"
                    :class="{
                      'text-green-500': week.readCount > week.savedCount,
                      'text-red-500': week.readCount < week.savedCount,
                      'text-neutral': week.readCount === week.savedCount
                    }"
                  >
                    <span class="net-icon" v-if="week.readCount !== week.savedCount">
                      {{ week.readCount > week.savedCount ? '↑' : '↓' }}
                    </span>
                    {{ week.readCount > week.savedCount ? '+' : '' }}{{ week.readCount - week.savedCount }}
                  </span>
                </td>
                <td class="rate-cell">
                  <div class="completion-rate">
                    <div 
                      class="completion-bar"
                      :style="{ width: `${week.successRate}%` }"
                      :class="{
                        'bg-green-500': week.successRate >= 80,
                        'bg-yellow-500': week.successRate >= 50 && week.successRate < 80,
                        'bg-red-500': week.successRate < 50 && !week.isEmpty
                      }"
                    />
                    <span class="completion-text">{{ week.successRate }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Add weekly insights legend -->
        <div class="weekly-insights-legend">
          <div class="legend-item">
            <div class="legend-color success-rate"></div>
            <span>Success Rate: Percentage of days meeting the daily goal (5+ articles)</span>
          </div>
          <div class="legend-item">
            <div class="legend-badge highlight-badge"></div>
            <span>Current/Most Recent Week</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.daily-stats {
  padding: 1rem;
}

.chart-container {
  height: 450px;
  margin: 1rem 0 3rem;
  padding: 1rem 1rem 2rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  border: 1px solid var(--border-color, #ffffff1a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: visible;
}

.chart-header {
  text-align: center;
  margin-bottom: 1rem;
}

.chart-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.chart-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted, #888);
  margin-bottom: 0.25rem;
}

.chart-note {
  font-size: 0.75rem;
  color: var(--text-muted, #888);
  font-style: italic;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
}

.error {
  color: #ff4444;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.stat-group {
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--border-color, #ffffff1a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.wide-group {
  width: 100%;
}

.group-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-color, #fff);
  opacity: 0.9;
  border-bottom: 1px solid var(--border-color, #ffffff1a);
  padding-bottom: 0.5rem;
}

.group-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--card-bg-lighter, #ffffff08);
  padding: 1rem;
  border-radius: 8px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.highlight-card {
  background: linear-gradient(135deg, var(--card-bg-lighter, #ffffff08) 0%, rgba(100, 108, 255, 0.08) 100%);
  border: 1px solid rgba(100, 108, 255, 0.1);
}

.label {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.value {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.goal-indicator {
  font-size: 0.8rem;
  color: #22c55e;
  margin-top: 0.25rem;
}

.goal-indicator.pending {
  color: var(--text-muted, #888);
}

.net-indicator {
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.net-indicator.positive {
  color: #22c55e;
}

.net-indicator.negative {
  color: #ef4444;
}

.avg-indicator {
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.avg-indicator.good {
  color: #22c55e;
}

.avg-indicator.medium {
  color: #eab308;
}

.avg-indicator.low {
  color: #ef4444;
}

.completion-percent {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
  margin-top: 0.25rem;
}

.backlog-indicator {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
  margin-top: 0.25rem;
}

.streak-card {
  display: flex;
  align-items: center;
}

.streak-icon {
  font-size: 1.75rem;
  margin-right: 1rem;
}

.streak-content {
  flex: 1;
}

.streak-best {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
  margin-top: 0.25rem;
}

.velocity-desc {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
  margin-top: 0.25rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .group-cards {
    grid-template-columns: 1fr;
  }
}

/* Keep existing velocity card styles */
.velocity-card {
  position: relative;
  overflow: hidden;
}

.positive-velocity {
  background: linear-gradient(135deg, var(--card-bg-lighter, #ffffff08) 0%, rgba(34, 197, 94, 0.1) 100%);
  border: 1px solid rgba(34, 197, 94, 0.1);
}

.negative-velocity {
  background: linear-gradient(135deg, var(--card-bg-lighter, #ffffff08) 0%, rgba(239, 68, 68, 0.1) 100%);
  border: 1px solid rgba(239, 68, 68, 0.1);
}

.velocity-icon {
  font-size: 1.25rem;
  margin-left: 0.25rem;
}

/* Remove these styles as they're replaced */
.total-stat {
  background: var(--card-bg, #ffffff0d);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border: 1px solid var(--border-color, #ffffff1a);
  grid-column: span 2;
}

@media (max-width: 640px) {
  .total-stat {
    grid-column: span 1;
  }
}

/* Fix for tooltip types */
:deep(.chartjs-tooltip) {
  opacity: 1;
  position: absolute;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 3px;
  transition: all 0.1s ease;
  pointer-events: none;
  transform: translate(-50%, 0);
  padding: 6px;
}

/* Enhanced weekly stats styles */
.enhanced-weekly {
  margin-top: 2.5rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.weekly-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  padding: 1rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
  border: 1px solid var(--border-color, #ffffff1a);
  align-items: flex-start;
}

.summary-icon {
  font-size: 1.75rem;
  margin-right: 1rem;
  opacity: 0.8;
}

.summary-content {
  flex: 1;
}

.summary-title {
  font-size: 0.9rem;
  color: var(--text-muted, #888);
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.summary-detail {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  line-height: 1.4;
}

.highlight-week {
  background-color: rgba(100, 108, 255, 0.08);
  position: relative;
}

.highlight-week td:first-child {
  position: relative;
}

.highlight-week td:first-child::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--accent-color, #646cff);
  border-radius: 2px;
}

.weekly-insights-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #ffffff1a);
  font-size: 0.8rem;
  color: var(--text-muted, #888);
}

.legend-color.success-rate {
  background: linear-gradient(to right, #ef4444, #eab308, #22c55e);
}

.legend-badge {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  background-color: rgba(100, 108, 255, 0.2);
  border-left: 3px solid var(--accent-color, #646cff);
  border-radius: 2px;
}

.mt-4 {
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .weekly-summary-cards {
    grid-template-columns: 1fr;
  }
}

.table-container {
  overflow-x: auto;
  margin-top: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #ffffff1a);
  background: var(--card-bg-lighter, #ffffff08);
}

.progress-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.progress-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color, #fff);
  opacity: 0.8;
  border-bottom: 1px solid var(--border-color, #ffffff1a);
  background: var(--card-bg, #ffffff0d);
}

.progress-table th:first-child {
  border-top-left-radius: 8px;
}

.progress-table th:last-child {
  border-top-right-radius: 8px;
}

.progress-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #ffffff1a);
  font-size: 0.95rem;
}

.progress-table tr:last-child td {
  border-bottom: none;
}

.progress-table tr:hover {
  background: var(--card-bg, #ffffff0d);
}

.net-value {
  font-weight: 600;
}

.text-green-500 {
  color: #22c55e;
}

.text-red-500 {
  color: #ef4444;
}

.text-neutral {
  color: var(--text-muted, #888);
}

.completion-rate {
  position: relative;
  height: 8px;
  background: var(--card-bg, #ffffff0d);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  max-width: 150px;
}

.completion-bar {
  position: absolute;
  height: 100%;
  left: 0;
  top: 0;
  border-radius: 4px;
}

.completion-text {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 0.85rem;
  font-weight: 600;
}

.empty-week {
  opacity: 0.6;
}

.highlight-week {
  background-color: rgba(100, 108, 255, 0.08);
  position: relative;
}

.highlight-week td:first-child {
  position: relative;
}

.highlight-week td:first-child::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--accent-color, #646cff);
  border-radius: 2px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 2rem;
  height: 0.5rem;
  border-radius: 2px;
}

.week-cell {
  position: relative;
  min-width: 120px;
}

.week-label {
  font-weight: 500;
}

.week-badge {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 0.7rem;
  background: var(--accent-color, #646cff);
  color: white;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  opacity: 0.8;
}

.count-cell {
  font-weight: 600;
}

.avg-cell {
  min-width: 80px;
}

.avg-value {
  font-weight: 600;
}

.good-avg {
  color: #22c55e;
}

.medium-avg {
  color: #eab308;
}

.low-avg {
  color: #ef4444;
}

.net-cell {
  min-width: 80px;
}

.net-icon {
  display: inline-block;
  margin-right: 0.25rem;
  font-size: 0.85rem;
}

.rate-cell {
  min-width: 150px;
}

.bg-green-500 {
  background-color: #22c55e;
}

.bg-yellow-500 {
  background-color: #eab308;
}

.bg-red-500 {
  background-color: #ef4444;
}
</style> 