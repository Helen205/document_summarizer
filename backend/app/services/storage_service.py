import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, BinaryIO
from cryptography.fernet import Fernet
import boto3
from loguru import logger

from app.core.config import settings

class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        self.storage_path = settings.STORAGE_PATH
        
        # Şifreleme anahtarı
        if settings.ENCRYPTION_KEY:
            self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())
        else:
            self.cipher = None
        
    def save_file(self, file_content: BinaryIO, filename: str, content_type: str) -> str:
        """Dosyayı kaydet ve dosya yolunu döndür"""
        try:
            # Benzersiz dosya adı oluştur
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            if self.storage_type == "disk":
                return self._save_to_disk(file_content, unique_filename)
            else:
                raise ValueError(f"Unsupported storage type: {self.storage_type}")
                
        except Exception as e:
            logger.error(f"Error saving file {filename}: {e}")
            raise

    def _save_to_disk(self, file_content: BinaryIO, filename: str) -> str:
        try:
            os.makedirs(self.storage_path, exist_ok=True)
            file_path = os.path.join(self.storage_path, filename)
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file_content, f)
            return file_path
        except Exception as e:
            logger.error(f"Error saving file to disk: {e}")
            raise

    def read_file(self, file_path: str) -> bytes:
        """Dosyayı oku"""
        try:
            return self._read_from_disk(file_path)
                
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            raise

    def _read_from_disk(self, file_path: str) -> bytes:
        """Diskten dosya oku"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # Şifreleme varsa çöz
            if self.cipher and self._is_encrypted(file_path):
                content = self.cipher.decrypt(content)
            
            return content
            
        except Exception as e:
            logger.error(f"Error reading from disk: {e}")
            raise

    def delete_file(self, file_path: str) -> bool:
        """Dosyayı sil"""
        try:
            return self._delete_from_disk(file_path)
                
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False

    def _delete_from_disk(self, file_path: str) -> bool:
        """Diskten dosya sil"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting from disk: {e}")
            return False

    def _encrypt_file(self, file_path: str):
        """Dosyayı şifrele"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            encrypted_content = self.cipher.encrypt(content)
            
            with open(file_path, 'wb') as f:
                f.write(encrypted_content)
                
        except Exception as e:
            logger.error(f"Error encrypting file: {e}")
            raise

    def _is_encrypted(self, file_path: str) -> bool:
        """Dosyanın şifrelenmiş olup olmadığını kontrol et"""
        # Bu basit bir kontrol - gerçek uygulamada daha gelişmiş bir yöntem kullanılabilir
        return self.cipher is not None

    def get_file_size(self, file_path: str) -> int:
        """Dosya boyutunu al"""
        try:
            return os.path.getsize(file_path)
                
        except Exception as e:
            logger.error(f"Error getting file size: {e}")
            return 0



# Global storage servis instance'ı
storage_service = StorageService() 