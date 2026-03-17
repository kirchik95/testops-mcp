import { HttpClient } from '../client/http-client.js';
import { AutomationTrendPoint, StatusDistribution, SuccessRatePoint } from '../types/api-types.js';

export class AnalyticsApi {
  constructor(private http: HttpClient) {}

  async getAutomationTrend(projectId: number): Promise<AutomationTrendPoint[]> {
    return this.http.get<AutomationTrendPoint[]>(`/api/analytic/${projectId}/automation_chart`);
  }

  async getStatusDistribution(projectId: number): Promise<StatusDistribution[]> {
    return this.http.get<StatusDistribution[]>(`/api/analytic/${projectId}/group_by_status`);
  }

  async getSuccessRate(projectId: number): Promise<SuccessRatePoint[]> {
    return this.http.get<SuccessRatePoint[]>(`/api/analytic/${projectId}/tc_success_rate`);
  }
}
