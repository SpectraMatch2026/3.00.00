# SpectraMatch

SpectraMatch, tekstil görüntülerinde renk ve desen benzerliğini analiz etmek için geliştirilmiş bir kalite kontrol yazılımıdır. Proje, aynı çekirdek analiz altyapısını kullanan web ve masaüstü arayüzleri içerir.

## Modüller

- `app.py`: Flask tabanlı web uygulaması ve API uçları
- `desktop/`: pywebview tabanlı masaüstü arayüzü
- `modules/ColorUnitBackend.py`: renk farkı ve renk benzerliği analizi
- `modules/PatternUnitBackend.py`: desen, yapı ve benzerlik analizi
- `modules/SingleImageUnitBackend.py`: tek görüntü analizi
- `modules/SettingsReceipt.py` ve `modules/ReportUtils.py`: PDF rapor ve ayar çıktıları

## Temel Özellikler

- Referans ve numune görüntülerinin karşılaştırılması
- Renk, desen ve genel skor üretimi
- Bölge seçimi ve örnekleme noktası yönetimi
- Türkçe ve İngilizce rapor çıktıları
- Web ve `.exe` masaüstü sürümü desteği

## Çalıştırma

Web sürümü:

```bash
python app.py
```

Masaüstü sürümü:

```bash
python desktop/app_desktop.py
```

## Not

Bu depo, üniversite teslimi ve akademik gösterim amacıyla düzenlenmiş proje dosyalarını içerir.
