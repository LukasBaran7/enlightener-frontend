<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { format, parseISO } from 'date-fns';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface DailyCount {
  date: string;
  count: number;
}

const dailyCounts = ref<DailyCount[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function fetchDailyCounts() {
  try {
    loading.value = true;
    const response = await fetch(`${import.meta.env.VITE_API_URL}/reader/articles/daily-counts`);
    if (!response.ok) {
      throw new Error('Failed to fetch daily counts');
    }
    dailyCounts.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data';
    console.error('Error fetching daily counts:', err);
  } finally {
    loading.value = false;
  }
}

const formattedData = computed(() => {
  const data = dailyCounts.value.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM d'),
    goalMet: item.count >= 5,
  }));

  return {
    labels: data.map(d => d.formattedDate),
    datasets: [
      {
        label: 'Articles Read',
        data: data.map(d => d.count),
        fill: false,
        borderColor: '#646cff',
        tension: 0.1
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true
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
  const data = dailyCounts.value;
  return {
    today: data[data.length - 1]?.count || 0,
    average: (data.reduce((sum: number, item: DailyCount) => sum + item.count, 0) / data.length || 0).toFixed(1),
    goalsMetCount: data.filter(item => item.count >= 5).length,
    total: data.reduce((sum: number, item: DailyCount) => sum + item.count, 0)
  };
});

const tableData = computed(() => {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  
  return dailyCounts.value.map(item => ({
    date: format(parseISO(item.date), 'EEE, MMM d'),
    count: item.count,
    goalMet: item.count >= 5,
    remaining: Math.max(0, 5 - item.count),
    percentage: (item.count / 5) * 100,
    isToday: item.date === today
  })).reverse();
});

onMounted(() => {
  fetchDailyCounts();
});
</script>

<template>
  <div class="daily-stats">
    <h2 class="text-xl font-bold mb-4">Daily Reading Progress</h2>

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
          <p class="label">Today's Count</p>
          <p class="value">{{ stats.today }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Weekly Average</p>
          <p class="value">{{ stats.average }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Goals Met</p>
          <p class="value">{{ stats.goalsMetCount }}</p>
        </div>
        <div class="stat-card">
          <p class="label">Total Articles</p>
          <p class="value">{{ stats.total }}</p>
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
</style> 