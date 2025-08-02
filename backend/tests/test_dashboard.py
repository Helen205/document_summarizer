import pytest
from fastapi import status
from app.models.document import Document
from app.models.ActivityLog import ActivityLog
from datetime import datetime, timedelta

def test_dashboard_stats_no_data(client, test_user_token):
    """Veri olmadığında dashboard istatistiklerini test eder."""
    response = client.get(
        "/api/v1/dashboard/stats",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["totalDocuments"] == 0
    assert data["recentDocuments"] == 0
    assert data["storageUsed"] == 0
    assert data["searchAndQuestionCount"] == 0
    assert len(data["recentActivities"]) == 0