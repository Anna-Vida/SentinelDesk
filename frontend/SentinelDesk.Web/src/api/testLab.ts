import { apiRequest } from './client'
import type { TestLabStatus, TestScenarioName, TestScenarioResult } from '../types'

export const getTestLabStatus = () =>
  apiRequest<TestLabStatus>('/api/test-lab/status')

export const runTestScenario = (scenario: TestScenarioName) =>
  apiRequest<TestScenarioResult>(`/api/test-lab/scenarios/${scenario}`, {
    method: 'POST',
  })
