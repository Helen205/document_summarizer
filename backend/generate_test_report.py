#!/usr/bin/env python3
"""
Test Raporu Oluşturucu
Bu script testleri çalıştırır ve HTML raporu oluşturur.
"""

import subprocess
import sys
import os
from datetime import datetime

def run_tests_and_generate_report():
    """Testleri çalıştırır ve HTML raporu oluşturur."""
    
    print("🧪 Test Raporu Oluşturuluyor...")
    print("=" * 50)
    
    # Test komutunu hazırla
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "--html=test_report.html",
        "--self-contained-html",
        "--cov=app",
        "--cov-report=html",
        "--cov-report=term-missing"
    ]
    
    try:
        # Testleri çalıştır
        print("📋 Testler çalıştırılıyor...")
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
        
        # Sonuçları yazdır
        print("\n📊 Test Sonuçları:")
        print("-" * 30)
        print(result.stdout)
        
        if result.stderr:
            print("\n⚠️  Uyarılar:")
            print("-" * 15)
            print(result.stderr)
        
        # Rapor dosyalarını kontrol et
        report_files = []
        if os.path.exists("test_report.html"):
            report_files.append("test_report.html")
        
        if os.path.exists("htmlcov/index.html"):
            report_files.append("htmlcov/index.html")
        
        print(f"\n✅ Raporlar oluşturuldu:")
        for file in report_files:
            print(f"   📄 {file}")
        
        print(f"\n📅 Rapor Tarihi: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        return False

if __name__ == "__main__":
    success = run_tests_and_generate_report()
    sys.exit(0 if success else 1) 