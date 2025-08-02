from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user, get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
import logging
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/profile", response_model=UserSchema)
async def get_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Mevcut kullanıcının profilini getir"""
    return current_user

@router.get("/", response_model=List[UserSchema])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Tüm kullanıcıları listele (sadece admin)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/get/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Belirli bir kullanıcıyı getir"""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user_update: UserUpdate, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Kullanıcıyı günceller (profil bilgileri ve isteğe bağlı şifre)."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlemi yapmaya yetkiniz yok."
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı."
        )
    
    update_data = user_update.dict(exclude_unset=True)
    
    if "password" in update_data:
        if "old_password" not in update_data or not update_data["old_password"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Şifre değiştirmek için mevcut şifrenizi girmelisiniz."
            )
        
        if not verify_password(update_data["old_password"], user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mevcut şifreniz hatalı."
            )
        
        if update_data["old_password"] == update_data["password"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yeni şifreniz, eski şifrenizle aynı olamaz."
            )

        user.hashed_password = get_password_hash(update_data.pop("password"))
        update_data.pop("old_password", None) 
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"User {user.username} (ID: {user_id}) updated successfully.")
        return user
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kullanıcı bilgileri güncellenirken bir hata oluştu."
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Kullanıcı sil (sadece admin)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"} 

@router.post("/{user_id}/upload-profile-picture")
async def upload_profile_picture(
    user_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Kullanıcı profil resmi yükler"""
    # Kullanıcı kendi profil resmini yüklüyorsa VEYA admin ise izin ver
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlemi yapmak için yeterli izniniz yok veya kendi profiliniz değil."
        )

    # Diğer işlemler (kullanıcıyı bulma, dosya yükleme vb.)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )

    file_path = os.path.join(settings.STORAGE_PATH, f"{user_id}.jpg")
    with open(file_path, "wb") as f:
        f.write(await file.read())
    user.profile_picture_url = f"/uploads/{user_id}.jpg" # Buraya web'den erişilebilir URL'yi kaydediyoruz
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Profil resmi başarıyla yüklendi"}