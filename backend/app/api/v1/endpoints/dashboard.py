from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc 
from datetime import datetime, timedelta
from loguru import logger

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.document import Document
from app.models.ActivityLog import  ActivityLog 
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Dashboard istatistikleri ve son aktiviteler"""
    try:
        total_documents = db.query(func.count(Document.id)).filter(
            Document.user_id == current_user.id
        ).scalar()
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_documents = db.query(func.count(Document.id)).filter(
            Document.user_id == current_user.id,
            Document.created_at >= week_ago
        ).scalar()
        
        storage_used = db.query(func.sum(Document.file_size)).filter(
            Document.user_id == current_user.id
        ).scalar() or 0
        
        search_and_question_count = db.query(func.count(ActivityLog.id)).filter(
            ActivityLog.user_id == current_user.id,
            ActivityLog.activity_type.in_(['document_search', 'question_ask'])
        ).scalar()

        recent_activities = db.query(ActivityLog, Document.title).filter(
            ActivityLog.user_id == current_user.id
        ).outerjoin(Document, ActivityLog.document_id == Document.id)\
         .order_by(desc(ActivityLog.timestamp))\
         .limit(5).all()
        
        formatted_activities = []
        for activity, doc_title in recent_activities:
            time_diff = datetime.utcnow() - activity.timestamp
            if time_diff.days > 0:
                time_ago = f"{time_diff.days} gün önce"
            elif time_diff.seconds >= 3600:
                time_ago = f"{time_diff.seconds // 3600} saat önce"
            elif time_diff.seconds >= 60:
                time_ago = f"{time_diff.seconds // 60} dakika önce"
            else:
                time_ago = "şimdi"

            activity_description = activity.description 
            # Eğer doküman başlığı varsa, açıklamaya ekle
            if doc_title and activity.activity_type in ['document_search', 'question_ask', 'document_upload', 'document_delete']:
                activity_description = f"'{doc_title}' dokümanı ile ilgili {activity.activity_type.replace('_', ' ').replace('document', '').strip()}."
                if activity.activity_type == 'document_upload':
                     activity_description = f"'{doc_title}' dokümanı yüklendi."
                elif activity.activity_type == 'document_search':
                     activity_description = f"'{activity.description.split('için')[0].strip()}' araması yapıldı."
                elif activity.activity_type == 'question_ask':
                     activity_description = f"'{activity.description.split('için')[0].strip()}'"
            elif activity.activity_type == 'document_delete':
                activity_description = f"Bir doküman silindi." 

            formatted_activities.append({
                "type": activity.activity_type,
                "description": activity_description,
                "timeAgo": time_ago,
                "documentTitle": doc_title 
            })

        return {
            "totalDocuments": total_documents,
            "recentDocuments": recent_documents,
            "searchAndQuestionCount": search_and_question_count, 
            "storageUsed": storage_used,
            "recentActivities": formatted_activities 
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting dashboard statistics"
        )