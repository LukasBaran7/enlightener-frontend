<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { format, parseISO } from 'date-fns';
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
  const dates = [...new Set([
    ...readData.map(d => d.formattedDate),
    ...savedData.map(d => d.formattedDate)
  ])];

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
        backgroundColor: 'rgba(100, 108, 255, 0.1)',
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
        fill: false,
        borderColor: '#646cff',
        tension: 0.1,
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
        tension: 0.1,
        borderDash: [5, 5],
        order: 2
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        filter: (item: any) => item.text !== 'Read > Saved' // Hide the background dataset from legend
      }
    },
    annotation: {
      annotations: {
        line1: {
          type: 'line',
          yMin: 5,
          yMax: 5,
          borderColor: '#ff4444',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            content: 'Daily Goal (5)',
            enabled: true
          }
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1
      }
    }
  }
};

const stats = computed(() => {
  const readData = readCounts.value;
  const savedData = savedCounts.value;
  
  return {
    readToday: readData[readData.length - 1]?.count || 0,
    savedToday: savedData[savedData.length - 1]?.count || 0,
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

const combinedTableData = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  
  // Create a map of all dates with their read/saved counts
  const dateMap = new Map();
  
  readCounts.value.forEach(item => {
    dateMap.set(item.date, {
      date: format(parseISO(item.date), 'EEE, MMM d'),
      readCount: item.count,
      savedCount: 0,
      isToday: item.date === today
    });
  });
  
  savedCounts.value.forEach(item => {
    if (dateMap.has(item.date)) {
      dateMap.get(item.date).savedCount = item.count;
    } else {
      dateMap.set(item.date, {
        date: format(parseISO(item.date), 'EEE, MMM d'),
        readCount: 0,
        savedCount: item.count,
        isToday: item.date === today
      });
    }
  });
  
  // Convert map to array and sort by date descending
  return Array.from(dateMap.values())
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .map(item => ({
      ...item,
      difference: item.readCount - item.savedCount,
      ratio: item.savedCount ? (item.readCount / item.savedCount * 100).toFixed(0) : 0
    }));
});

onMounted(() => {
  loadDailyCounts();
});
</script>

<template>
  <div class="daily-stats">
    <h2 class="text-xl font-bold mb-4">Daily Reading Activity</h2>

    <div v-if="loading" class="loading">
      Loading statistics...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <template v-else>
      <div class="chart-container">
        <Line :data="formattedData" :options="chartOptions" />
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <p class="label">Read Today</p>
          <p class="value">{{ stats.readToday }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Saved Today</p>
          <p class="value">{{ stats.savedToday }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Read Average</p>
          <p class="value">{{ stats.readAverage }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Saved Average</p>
          <p class="value">{{ stats.savedAverage }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Goals Met</p>
          <p class="value">{{ stats.goalsMetCount }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Total Read</p>
          <p class="value">{{ stats.readTotal }}</p>
        </div>
        <div class="stat-card total-stat">
          <p class="label">Total Archive</p>
          <p class="value">{{ totalCounts?.archived_count?.toLocaleString() || 0 }}</p>
        </div>
        <div class="stat-card total-stat">
          <p class="label">Reading List</p>
          <p class="value">{{ totalCounts?.later_count?.toLocaleString() || 0 }}</p>
        </div>
      </div>

      <div class="daily-breakdown">
        <h3 class="text-lg font-semibold mb-3 mt-6">Daily Breakdown</h3>
        <div class="table-container">
          <table class="progress-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Articles</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in tableData" :key="day.date">
                <td>{{ day.date }}</td>
                <td>{{ day.count }}</td>
                <td class="progress-cell">
                  <div class="progress-bar-bg">
                    <div 
                      class="progress-bar-fill"
                      :style="{ width: `${Math.min(100, day.percentage)}%` }"
                      :class="{ 'goal-met': day.goalMet }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ day.count }}/5</span>
                </td>
                <td>
                  <div class="status-cell" :class="{ 'goal-met': day.goalMet }">
                    <template v-if="day.goalMet">
                      <span class="goal-icon">🎯</span>
                    </template>
                    <template v-else-if="day.isToday">
                      <span class="remaining-text">
                        {{ day.remaining }} more to go
                      </span>
                    </template>
                    <template v-else>
                      <span class="missed-goal">
                        Read {{ day.count }}/5
                      </span>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="daily-breakdown">
        <h3 class="text-lg font-semibold mb-3 mt-6">Read vs Saved Breakdown</h3>
        <div class="table-container">
          <table class="progress-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Read</th>
                <th>Saved</th>
                <th>Difference</th>
                <th>Read Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in combinedTableData" :key="day.date">
                <td>{{ day.date }}</td>
                <td>{{ day.readCount }}</td>
                <td>{{ day.savedCount }}</td>
                <td>
                  <span 
                    :class="{
                      'text-green-500': day.difference > 0,
                      'text-red-500': day.difference < 0
                    }"
                  >
                    {{ day.difference > 0 ? '+' : ''}}{{ day.difference }}
                  </span>
                </td>
                <td>
                  <div class="completion-rate">
                    <div 
                      class="completion-bar"
                      :style="{ width: `${Math.min(100, day.ratio)}%` }"
                      :class="{
                        'bg-green-500': day.ratio >= 100,
                        'bg-yellow-500': day.ratio > 50 && day.ratio < 100,
                        'bg-red-500': day.ratio <= 50
                      }"
                    ></div>
                    <span class="completion-text">{{ day.ratio }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
  height: 400px;
  margin: 1rem 0;
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-card {
  background: var(--card-bg, #ffffff0d);
  padding: 1rem;
  border-radius: 8px;
}

.label {
  color: var(--text-muted, #888);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.value {
  font-size: 1.5rem;
  font-weight: bold;
}

.daily-breakdown {
  margin-top: 2rem;
  background: var(--card-bg, #ffffff0d);
  border-radius: 8px;
  padding: 1rem;
}

.table-container {
  overflow-x: auto;
}

.progress-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.progress-table th {
  padding: 0.75rem;
  font-weight: 500;
  color: var(--text-muted, #888);
  border-bottom: 1px solid var(--border-color, #ffffff1a);
}

.progress-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color, #ffffff1a);
}

.progress-cell {
  width: 40%;
  position: relative;
}

.progress-bar-bg {
  background: var(--progress-bg, #ffffff1a);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
}

.progress-bar-fill {
  height: 100%;
  background: var(--progress-color, #646cff);
  transition: width 0.3s ease;
}

.progress-bar-fill.goal-met {
  background: var(--success-color, #22c55e);
}

.progress-text {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  color: var(--text-muted, #888);
}

.status-cell {
  white-space: nowrap;
  font-size: 0.875rem;
}

.status-cell.goal-met {
  color: var(--success-color, #22c55e);
  font-weight: 500;
}

.goal-icon {
  font-size: 1.25rem;
}

.remaining-text {
  color: var(--text-muted, #888);
}

.missed-goal {
  color: var(--text-muted, #888);
  font-size: 0.875rem;
}

/* Make table responsive */
@media (max-width: 640px) {
  .progress-table {
    font-size: 0.875rem;
  }
  
  .progress-table th,
  .progress-table td {
    padding: 0.5rem;
  }

  .progress-text {
    display: none;
  }
}

/* Add these to your existing styles */
.completion-rate {
  position: relative;
  width: 100%;
  height: 20px;
  background: var(--progress-bg, #ffffff1a);
  border-radius: 10px;
  overflow: hidden;
}

.completion-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.completion-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  color: var(--text-color, #fff);
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.text-green-500 {
  color: #22c55e;
}

.text-yellow-500 {
  color: #eab308;
}

.text-red-500 {
  color: #ef4444;
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
</style> 