/**
 * K6 Configuration for CampusX Load Testing
 */

export const config = {
  // Base URL for API
  baseUrl: __ENV.API_URL || 'http://localhost:3001',

  // Test data
  testUsers: {
    count: parseInt(__ENV.USER_COUNT) || 60,
    password: 'Test@123'
  },

  // Load test stages
  stages: {
    // Warm up
    rampUp: { duration: '30s', target: 10 },
    // Sustained load
    steady: { duration: '2m', target: 30 },
    // Peak load
    peak: { duration: '1m', target: 50 },
    // Cool down
    rampDown: { duration: '30s', target: 0 }
  },

  // Thresholds for performance
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    http_reqs: ['rate>10'] // Min 10 req/s
  }
};

// Helper to create load test options
export function getLoadTestOptions(customStages) {
  return {
    stages: customStages || [
      config.stages.rampUp,
      config.stages.steady,
      config.stages.peak,
      config.stages.rampDown
    ],
    thresholds: config.thresholds
  };
}

// Helper to create spike test options
export function getSpikeTestOptions() {
  return {
    stages: [
      { duration: '10s', target: 5 },
      { duration: '30s', target: 100 }, // Spike
      { duration: '10s', target: 5 }
    ],
    thresholds: config.thresholds
  };
}

// Helper to create stress test options
export function getStressTestOptions() {
  return {
    stages: [
      { duration: '1m', target: 20 },
      { duration: '2m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 150 },
      { duration: '1m', target: 0 }
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000', 'p(99)<2000'],
      http_req_failed: ['rate<0.05']
    }
  };
}
