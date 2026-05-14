/* ═══════════════════════════════════════════════════════════
   SPECTRAMATCH DESKTOP — Application Logic (Full)
   ═══════════════════════════════════════════════════════════ */
var Desktop = (function () {
'use strict';
var State = {
    refFile:null,sampleFile:null,refDataUrl:null,sampleDataUrl:null,
    refW:0,refH:0,sampleW:0,sampleH:0,
    singleMode:false,fullImage:true,isProcessing:false,lastResult:null,
    lang:'en',theme:'dark',
    manualPoints:[],randomPoints:[],samplingMode:'random',
    /* Region placement — pixel coords on the natural image */
    regionCenterX:0, regionCenterY:0,
    regionDragging:false, regionDragStart:{x:0,y:0},
    /* Pen (freehand) state */
    penPoints:[], penDrawing:false, penClosed:false
};
var $=function(id){return document.getElementById(id);};
var SVG_PH='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

/* ═══ i18n ═══ */
var T={en:{
'menu.file':'File','menu.open.ref':'Open Reference Image...','menu.open.sample':'Open Sample Image...',
'menu.delete.all':'Delete All Images','menu.exit':'Exit','menu.analysis':'Analysis','menu.run':'Run Analysis',
'menu.reset':'Reset All Settings','menu.tools':'Tools','menu.datasheet':'Technical Datasheet',
'menu.feedback':'Send Feedback','menu.contact':'Contact','menu.view':'View',
'menu.toggle.workspace':'Toggle Workspace Panel','menu.toggle.properties':'Toggle Properties Panel',
'menu.toggle.console':'Toggle Console Panel','menu.help':'Help','menu.about':'About SpectraMatch',
'tb.reference':'Reference','tb.sample':'Sample','tb.run':'Run','tb.delete':'Delete',
'tb.full.image':'Full Image','tb.shape':'Shape:','tb.size':'Size (px):','tb.height':'H:',
'tb.single':'Single Image','circle':'Circle','square':'Square','rectangle':'Rectangle','pen':'Pen (Freehand)',
'pen.draw.hint':'Click and drag on the image to draw a freehand region','pen.close.warning':'The freehand selection must be closed. Please draw a complete loop that connects back to the starting point.','pen.not.closed':'Selection Not Closed',
'pen.drawing':'Drawing...','pen.complete':'Freehand region set','pen.clear':'Clear Drawing',
'rtt.title':'Ready-to-Test Images','rtt.caption':'Load built-in sample images for quick testing','rtt.dual':'Dual Mode (Reference + Sample)','rtt.single':'Single Image Mode','rtt.pair':'Pair','rtt.loading':'Loading image...','rtt.loaded':'Ready-to-test image loaded','rtt.loaded.pair':'Ready-to-test pair loaded',
'panel.workspace':'Workspace','panel.viewer':'Image Viewer','panel.properties':'Properties',
'ws.images':'IMAGES','ws.ref.name':'Reference Image','ws.sample.name':'Sample Image',
'ws.no.file':'No file loaded','ws.status':'STATUS','ws.idle':'Idle — Awaiting images',
'ws.downloads':'DOWNLOADS','ws.no.reports':'No reports available',
'viewer.reference':'Reference','viewer.sample':'Sample',
'viewer.click.ref':'Click to load reference','viewer.click.sample':'Click to load sample',
'prop.general':'General','prop.operator':'Operator','prop.timezone':'Timezone',
'prop.report.lang':'Report Lang','prop.color.unit':'Color Unit','prop.pass.thresh':'Pass Threshold',
'prop.cond.thresh':'Conditional','prop.global.accept':'Global Accept.','prop.csi.good':'CSI Pass',
'prop.csi.warn':'CSI Conditional','prop.sampling.count':'Sampling Count',
'prop.lab.thresh.dl':'ΔL* Threshold','prop.lab.thresh.da':'Δa* Threshold','prop.lab.thresh.db':'Δb* Threshold','prop.lab.thresh.mag':'Magnitude Threshold',
'prop.sampling':'Sampling Configuration','prop.sampling.mode':'Mode','prop.points.count':'Points',
'prop.manual.pts':'Manual','prop.random.pts':'Random',
'prop.select.points':'Select Points','prop.complete.random':'Complete Randomly',
'prop.coord.entry':'Add Point by Coordinates','prop.coord.x':'X','prop.coord.y':'Y',
'prop.coord.add':'Add','prop.coord.points':'Entered Points','prop.coord.clear':'Clear All',
'prop.coord.none':'No coordinate points added yet.','prop.coord.invalid':'Invalid coordinates.',
'prop.coord.duplicate':'Point already exists.','prop.coord.outside':'Point is outside the selected region.',
'prop.coord.added':'Point added','prop.coord.removed':'Point removed','prop.coord.image.required':'Load image(s) first.',
'prop.scoring.basis':'Scoring Basis','prop.structural.match':'Structural','prop.pattern.unit':'Pattern Unit','prop.gradient':'Gradient','prop.phase':'Phase',
'prop.global.thresh':'Global Thresh.','prop.illuminant':'Illuminant','prop.primary':'Primary',
'prop.diff.sensitivity':'Difference Sensitivity','prop.grad.diff.sens':'Gradient Diff',
'prop.phase.diff.sens':'Phase Diff','prop.grad.bound.sens':'Gradient Boundary',
'prop.phase.bound.sens':'Phase Boundary','prop.structural.sensitivity':'Structural Sensitivity',
'prop.structural.sens':'Structural',
'prop.test.illuminants':'Test Illuminants','prop.rpt.color':'Report: Color Sections',
'prop.rpt.pattern':'Report: Pattern Sections','prop.methods':'Methods','prop.report':'Report',
'rpt.color.spaces':'Color Spaces','rpt.rgb':'RGB Values','rpt.lab':'Lab* Values',
'rpt.xyz':'XYZ Values','rpt.cmyk':'CMYK Values','rpt.diff':'Diff Metrics',
'rpt.stats':'Statistics','rpt.detailed.lab':'Detailed Lab','rpt.visualizations':'Visualizations',
'rpt.spectral':'Spectral Proxy','rpt.histograms':'RGB Histograms','rpt.visual.diff':'Visual Diff','rpt.illuminant':'Illuminant Analysis',
'rpt.exec.summary':'Executive Overview','rpt.visual.compare.section':'Visual Comparison',
'rpt.recommendations':'Recommendations','rpt.ssim':'Structural SSIM','rpt.gradient':'Gradient Similarity',
'rpt.phase':'Phase Correlation','rpt.structural':'Structural Difference','rpt.fourier':'Fourier Domain Analysis',
'rpt.glcm':'GLCM Texture Analysis',
'rpt.grad.bound':'Gradient Boundary','rpt.phase.bound':'Phase Boundary',
'prop.boundary.sensitivity':'Boundary Detection Sensitivity','prop.gradient.sens':'Gradient Sensitivity','prop.phase.sens':'Phase Sensitivity',
'rpt.summary':'Summary','rpt.conclusion':'Conclusion','rpt.pattern.rec':'Recommendations',
'btab.console':'Console','btab.results':'Results','btab.clear':'Clear',
'results.empty':'Run an analysis to see results here.','sb.ready':'Ready',
'sb.mode':'Mode','sb.region':'Region','sb.images':'Images','sb.processing':'Processing...','sb.custom':'Custom',
'log.init':'SpectraMatch Desktop v3.0.0 initialized','log.session.restored':'Session restored',
'log.theme':'Theme','log.language':'Language','log.region':'Region','log.shape':'Shape',
'log.loaded':'Loaded','log.region.center.set':'Region center set','log.console.cleared':'Console cleared',
'log.panel.toggled':'Panel toggled','log.settings.reset':'All settings reset to defaults',
'log.starting.analysis':'Starting analysis...','log.analysis.complete':'Analysis complete!',
'log.decision':'Decision','log.points.confirmed':'Points confirmed','log.points.reset':'Points reset due to region change',
'log.generated.random':'Generated random points','log.region.moved':'Region moved to',
'log.saving':'Saving','log.saved':'Saved','log.save.cancelled':'Save cancelled','log.save.error':'Save error',
'log.download.error':'Download error',
'loading.title':'Processing Analysis','loading.text':'Please wait...','loading.running':'Running analysis engine...',
'feedback.fail':'Failed to send. Please try again.','feedback.network':'Network error. Check your connection.',
'region.changed':'Region Changed','region.points.outside.msg':' point(s) are now outside the new region. Reset all points?',
'sampling.all.selected':'All points already selected.',
'about.title':'About SpectraMatch','ds.title':'Technical Documentation',
'ds.desc':'The complete technical documentation is available in PDF format.',
'ds.available':'Available in English and Turkish',
'cam.import.computer':'Import from Computer','cam.import.camera':'Import from Camera',
'cam.studio.title':'Camera Capture Studio','cam.select.camera':'Select Camera',
'cam.no.cameras':'No cameras detected','cam.requesting':'Requesting camera access...',
'cam.permission.denied':'Camera permission denied. Please allow access in settings.',
'cam.not.supported':'Camera is not supported in this environment.','cam.capture':'Capture',
'cam.retake':'Retake','cam.use.image':'Use Image','cam.cancel':'Cancel','cam.close':'Close',
'cam.rotate.left':'Rotate Left','cam.rotate.right':'Rotate Right','cam.flip.h':'Flip Horizontal',
'cam.brightness':'Brightness','cam.contrast':'Contrast','cam.mirror':'Mirror',
'cam.captured':'Image captured successfully','cam.assigned.ref':'Captured image set as Reference',
'cam.assigned.sample':'Captured image set as Sample',
'cam.file.build.error':'Could not build captured image file.',
'cam.access.error':'Camera access error','cam.stream.error':'Camera stream error',
'fb.title':'Send Feedback','fb.note':'All fields are optional. You can submit feedback anonymously.',
'fb.name':'Name','fb.email':'Email','fb.type':'Feedback Type','fb.message':'Message',
'fb.type.note':'Note','fb.type.suggestion':'Suggestion','fb.type.complaint':'Complaint',
'fb.type.question':'Question','fb.type.other':'Other',
'fb.anonymous':'Send anonymously','fb.email.note':'For attachments, please email','btn.cancel':'Cancel','btn.send':'Send',
'contact.title':'Contact','ps.title':'Select Sample Points',
'ps.hint':'Click on the image to place measurement points. Points are mirrored on both images.',
'ps.undo':'Undo Last','ps.clear':'Clear All','ps.random.fill':'Complete Randomly',
'ps.confirm':'Confirm Selection','random':'Random','manual':'Manual',
'about.desc':'SpectraMatch is a professional desktop application for textile quality control. It performs color difference analysis (Delta E 2000), pattern matching (SSIM, Gradient, Phase), and generates comprehensive PDF reports with detailed measurements, visualizations, and recommendations.',
'about.tagline':'Professional Textile Color & Pattern Quality Control',
'about.feat1':'Delta E 2000 Color Analysis',
'about.feat2':'SSIM, Gradient & Phase Pattern Matching',
'about.feat3':'Comprehensive PDF Reports',
'about.feat4':'CIE Standard Illuminants (D65, D50, TL84)',
'menu.shortcuts':'Keyboard Shortcuts','menu.documentation':'Documentation','menu.release.notes':'Release Notes','menu.check.updates':'Check for Updates',
'menu.export.results':'Export Results','menu.generate.report':'Generate Report',
'sc.close.dialogs':'Close all dialogs',
'confirm.delete.title':'Delete All Images','confirm.delete.msg':'Are you sure you want to delete all uploaded images? This action cannot be undone.',
'tb.reset':'Reset','reset.title':'Reset to Default','reset.msg':'This will reset ALL settings, clear all images, and return the application to its initial first-run state. Are you sure?','reset.done':'Application reset to default state',
'error.no.sample':'Please upload a sample image first.','error.no.both':'Please upload both reference and sample images first.',
'error.no.results':'No results to export. Please run an analysis first.',
'feedback.sent':'Feedback sent successfully!','feedback.empty':'Please enter a message.',
'mode.single':'Single Image','mode.dual':'Dual Image','color.score':'Color Score','pattern.score':'Pattern Score','overall.score':'Overall Score',
'region.click.hint':'Click on image to place region center','region.outside':'Point is outside the selected region',
'updates.current':'You are up to date!',
'rn.item1':'Full Turkish language support for all UI elements','rn.item2':'Complete toolbar with all analysis and help options','rn.item3':'Freehand (Pen) region selection tool','rn.item4':'Ready-to-Test built-in sample images','rn.item5':'Session persistence and state restoration','rn.item6':'Native Save-As dialog for PDF reports','rn.item7':'Manual and random sampling point selection','rn.item8':'GLCM texture and Fourier frequency analysis','rn.item9':'Comprehensive PDF reports with visualizations','rn.item10':'Panel resize and layout customization',
'tb.title.open.ref':'Open Reference Image (Ctrl+O)','tb.title.open.sample':'Open Sample Image (Ctrl+Shift+O)','tb.title.run':'Run Analysis (F5)','tb.title.delete':'Delete Images (Ctrl+D)','tb.title.full.image':'Process entire image','tb.title.single.mode':'Single image analysis mode','tb.title.ready.test':'Ready-to-Test Images','tb.title.datasheet':'Technical Datasheet','tb.title.feedback':'Send Feedback','tb.title.thesis.test':'Test for Thesis','tb.title.reset':'Reset to Default','tb.title.lang.switch':'Switch language','tb.title.theme':'Toggle theme','tb.title.hide.panel':'Hide panel','tb.title.clear.console':'Clear console',
'desktop.alignment.mode':'Alignment Mode','desktop.alignment.studio':'SPACTRA Studio','desktop.open.studio':'Open Studio',
'thesis.delete.title':'Delete Thesis Database','thesis.delete.msg':'Are you sure you want to delete the entire thesis test database?','thesis.delete.confirm':'Confirm','thesis.delete.success':'Thesis database deleted successfully','thesis.delete.error':'Failed to delete thesis database',
'rpt.report.summary':'Report Summary','rpt.color.analysis':'Color Analysis Details','rpt.pattern.analysis':'Pattern Analysis Details',
'rpt.texture.frequency':'Texture & Frequency Analysis','rpt.single.image.analysis':'Single Image Analysis',
'rpt.color.scoring.label':'Color Scoring','rpt.pattern.scoring.label':'Pattern Scoring',
'rpt.csi.label':'CSI (Full-image \u0394E2000)','rpt.mean.de2000':'Mean \u0394E 2000','rpt.report.size.label':'Report Size',
'rpt.deltaep2000.note':'ΔE₀₀ is reported as the raw color-difference value. It is not converted to a percentage score; lower values indicate closer color agreement.',
'rpt.structural.change':'Structural Change','rpt.color.comparison':'Color Comparison',
'rpt.reference':'Reference','rpt.sample':'Sample','rpt.regional.color.metrics':'Regional Color Metrics',
'rpt.de.summary.stats':'\u0394E Summary Statistics','rpt.illuminant.analysis':'Illuminant Analysis',
'rpt.individual.method.scores':'Individual Method Scores','rpt.structural.difference':'Structural Difference',
'rpt.similarity.score':'Similarity Score','rpt.change.percentage':'Change Percentage','rpt.verdict':'Verdict',
'rpt.difference.maps':'Difference Maps','rpt.boundary.detection':'Boundary Detection','rpt.structural.analysis':'Structural Analysis',
'rpt.mode.label':'Mode','rpt.single.image.mode':'Single Image Analysis',
'rpt.mean.de00':'Mean ΔE₀₀','rpt.method':'Method','rpt.status':'Status','rpt.composite':'Composite',
'rpt.structural.label':'Structural','rpt.position':'Position','rpt.ref.lab':'Ref L*a*b*','rpt.sam.lab':'Sam L*a*b*',
'rpt.metric':'Metric','rpt.average':'Average','rpt.std.dev':'Std Dev','rpt.min':'Min','rpt.max':'Max',
'rpt.de.heatmap':'\u0394E Heatmap','rpt.de.heatmap.caption':'Pixel-level color difference heatmap between reference and sample.',
'rpt.spectral.dist':'Spectral Distribution (Proxy)','rpt.spectral.dist.caption':'Approximated spectral reflectance curves from mean RGB values.',
'rpt.rgb.histograms':'RGB Histograms','rpt.rgb.histograms.caption':'Side-by-side RGB channel distribution for Reference and Sample.',
'rpt.lab.scatter':'a* vs b* Chromaticity Scatter','rpt.lab.scatter.caption':'Reference vs Sample chromaticity coordinates in the a*b* plane.',
'rpt.lab.bars':'Lab Components \u2013 Mean','rpt.lab.bars.caption':'Mean L*, a*, b* comparison between Reference and Sample.',
'rpt.ssim.map':'SSIM Difference Map','rpt.ssim.map.caption':'Structural SSIM difference \u2014 hot regions indicate structural dissimilarity.',
'rpt.gradient.map':'Gradient Similarity Map','rpt.gradient.map.caption':'Gradient magnitude difference \u2014 highlights edge/texture mismatches.',
'rpt.phase.map':'Phase Correlation Map','rpt.phase.map.caption':'Phase-based difference \u2014 detects spatial shifts and misalignment.',
'rpt.gradient.boundary':'Gradient Boundary','rpt.gradient.boundary.caption':'Significant gradient difference regions outlined on the sample.',
'rpt.gradient.filled':'Gradient Filled','rpt.gradient.filled.caption':'Gradient difference regions with filled red overlay.',
'rpt.phase.boundary':'Phase Boundary','rpt.phase.boundary.caption':'Significant phase difference regions outlined on the sample.',
'rpt.phase.filled':'Phase Filled','rpt.phase.filled.caption':'Phase difference regions with filled red overlay.',
'rpt.multi.method':'Multi-Method Comparison','rpt.multi.method.caption':'Gradient magnitude, combined methods, and noise-filtered difference maps.',
'rpt.pure.diff':'Pure Differences','rpt.pure.diff.caption':'Isolated pure difference regions (red on black).',
'rpt.fourier.fft':'Fourier Spectrum (FFT)','rpt.fourier.fft.caption':'2D FFT magnitude spectrum showing frequency-domain characteristics.',
'rpt.glcm.heatmap':'GLCM Texture Heatmap','rpt.glcm.heatmap.caption':'Gray-Level Co-occurrence Matrix texture feature comparison heatmaps.',
'rpt.histogram.single':'RGB Histogram','rpt.histogram.single.caption':'RGB channel distribution of the sample image.',
'rpt.spectral.single':'Spectral Distribution (Proxy)','rpt.spectral.single.caption':'Approximated spectral reflectance curve from mean RGB values.',
'rpt.fourier.single':'Fourier Spectrum','rpt.fourier.single.caption':'2D FFT magnitude spectrum showing frequency-domain characteristics.',
'rpt.score.color':'Color','rpt.score.pattern':'Pattern','rpt.score.overall':'Overall',
'rpt.dl.full':'Full Report','rpt.dl.color':'Color Report','rpt.dl.pattern':'Pattern Report','rpt.dl.receipt':'Settings Receipt',
'rpt.decision.accept':'ACCEPT','rpt.decision.reject':'REJECT','rpt.decision.conditional':'CONDITIONAL','rpt.decision.complete':'COMPLETE',
'exit.title':'Close SpectraMatch?','exit.warning':'Unsaved data and reports may be lost.','exit.cancel':'Cancel','exit.close':'Close',
'btn.ok':'OK',
'loading.thesis.title':'Running Thesis Tests',
'loading.thesis.stage.init':'Initializing test environment...',
'loading.thesis.stage.direct':'Running Direct Pixel analysis (1/3)...',
'loading.thesis.stage.ai':'Running AI SmartMatch analysis (2/3)...',
'loading.thesis.stage.bestch':'Running BESTCH analysis (3/3)...',
'loading.thesis.stage.compiling':'Compiling results & saving reports...',
'thesis.rtt.autoload':'No workspace images — loading Ready-to-Test Pair 1...',
'thesis.rtt.loading':'Loading test images into workspace...',
'thesis.rtt.autoloaded':'Ready-to-Test Pair 1 loaded.',
'thesis.rtt.starting':'Images loaded — starting thesis test...',
'alignment.no.images.title':'Images Required',
'alignment.no.images.msg':'Please load both a reference and sample image before opening SPACTRA Studio.',
'tb.align.label':'Align:',
'tb.title.align.mode':'Alignment Mode — select pre-processing method',
'tb.title.open.studio':'Open SPACTRA Studio',
'tb.title.sampling.count':'Sampling Count — number of color measurement points'
},tr:{
'menu.file':'Dosya','menu.open.ref':'Referans Görüntü Aç...','menu.open.sample':'Örnek Görüntü Aç...',
'menu.delete.all':'Tüm Görüntüleri Sil','menu.exit':'Çıkış','menu.analysis':'Analiz','menu.run':'Analizi Çalıştır',
'menu.reset':'Tüm Ayarları Sıfırla','menu.tools':'Araçlar','menu.datasheet':'Teknik Veri Sayfası',
'menu.feedback':'Geri Bildirim Gönder','menu.contact':'İletişim','menu.view':'Görünüm',
'menu.toggle.workspace':'Çalışma Alanı Paneli','menu.toggle.properties':'Özellikler Paneli',
'menu.toggle.console':'Konsol Paneli','menu.help':'Yardım','menu.about':'SpectraMatch Hakkında',
'tb.reference':'Referans','tb.sample':'Örnek','tb.run':'Çalıştır','tb.delete':'Sil',
'tb.full.image':'Tam Görüntü','tb.shape':'Şekil:','tb.size':'Boyut (px):','tb.height':'Y:',
'tb.single':'Tek Görüntü','circle':'Daire','square':'Kare','rectangle':'Dikdörtgen','pen':'Kalem (Serbest)',
'pen.draw.hint':'Serbest bölge çizmek için görüntü üzerinde tıklayıp sürükleyin','pen.close.warning':'Serbest seçim kapatılmalıdır. Lütfen başlangıç noktasına geri bağlanan tam bir döngü çizin.','pen.not.closed':'Seçim Kapatılmadı',
'pen.drawing':'Çiziliyor...','pen.complete':'Serbest bölge ayarlandı','pen.clear':'\u00c7izimi Temizle',
'rtt.title':'Teste Hazır Görüntüler','rtt.caption':'Hızlı test için yerleşik örnek görüntüleri yükleyin','rtt.dual':'Çift Mod (Referans + Örnek)','rtt.single':'Tek Görüntü Modu','rtt.pair':'Çift','rtt.loading':'Görüntü yükleniyor...','rtt.loaded':'Teste hazır görüntü yüklendi','rtt.loaded.pair':'Teste hazır çift yüklendi',
'panel.workspace':'Çalışma Alanı','panel.viewer':'Görüntü Görüntüleyici','panel.properties':'Özellikler',
'ws.images':'GÖRÜNTÜLER','ws.ref.name':'Referans Görüntü','ws.sample.name':'Örnek Görüntü',
'ws.no.file':'Dosya yüklenmedi','ws.status':'DURUM','ws.idle':'Boşta — Görüntü bekleniyor',
'ws.downloads':'İNDİRMELER','ws.no.reports':'Rapor mevcut değil',
'viewer.reference':'Referans','viewer.sample':'Örnek',
'viewer.click.ref':'Referans yüklemek için tıklayın','viewer.click.sample':'Örnek yüklemek için tıklayın',
'prop.general':'Genel','prop.operator':'Operatör','prop.timezone':'Saat Dilimi',
'prop.report.lang':'Rapor Dili','prop.color.unit':'Renk Birimi','prop.pass.thresh':'Geçiş Eşiği',
'prop.cond.thresh':'Koşullu','prop.global.accept':'Genel Kabul','prop.csi.good':'CSI Geçiş',
'prop.csi.warn':'CSI Koşullu','prop.sampling.count':'Örnekleme Sayısı',
'prop.lab.thresh.dl':'ΔL* Eşik Değeri','prop.lab.thresh.da':'Δa* Eşik Değeri','prop.lab.thresh.db':'Δb* Eşik Değeri','prop.lab.thresh.mag':'Büyüklük Eşik Değeri',
'prop.sampling':'Örnekleme Yapılandırması','prop.sampling.mode':'Mod','prop.points.count':'Noktalar',
'prop.manual.pts':'Manuel','prop.random.pts':'Rastgele',
'prop.select.points':'Noktaları Seç','prop.complete.random':'Rastgele Tamamla',
'prop.coord.entry':'Koordinat ile Nokta Ekle','prop.coord.x':'X','prop.coord.y':'Y',
'prop.coord.add':'Ekle','prop.coord.points':'Girilen Noktalar','prop.coord.clear':'Tumunu Temizle',
'prop.coord.none':'Henuz koordinat noktasi eklenmedi.','prop.coord.invalid':'Gecersiz koordinatlar.',
'prop.coord.duplicate':'Nokta zaten mevcut.','prop.coord.outside':'Nokta secilen bolgenin disinda.',
'prop.coord.added':'Nokta eklendi','prop.coord.removed':'Nokta kaldirildi','prop.coord.image.required':'Once goruntu yukleyin.',
'prop.scoring.basis':'Puanlama Temeli','prop.structural.match':'Yapısal','prop.pattern.unit':'Desen Birimi','prop.gradient':'Gradyan','prop.phase':'Faz',
'prop.global.thresh':'Genel Eşik','prop.illuminant':'Aydınlatma','prop.primary':'Birincil',
'prop.diff.sensitivity':'Fark Hassasiyeti','prop.grad.diff.sens':'Gradyan Fark',
'prop.phase.diff.sens':'Faz Fark','prop.grad.bound.sens':'Gradyan Siniri',
'prop.phase.bound.sens':'Faz Siniri','prop.structural.sensitivity':'Yapisal Hassasiyet',
'prop.structural.sens':'Yapisal',
'prop.test.illuminants':'Test Aydınlatmaları','prop.rpt.color':'Rapor: Renk Bölümleri',
'prop.rpt.pattern':'Rapor: Desen Bölümleri','prop.methods':'Yöntemler','prop.report':'Rapor',
'rpt.color.spaces':'Renk Uzayları','rpt.rgb':'RGB Değerleri','rpt.lab':'Lab* Değerleri',
'rpt.xyz':'XYZ Değerleri','rpt.cmyk':'CMYK Değerleri','rpt.diff':'Fark Metrikleri',
'rpt.stats':'İstatistikler','rpt.detailed.lab':'Detaylı Lab','rpt.visualizations':'Görselleştirmeler',
'rpt.spectral':'Spektral Vekil','rpt.histograms':'RGB Histogramları','rpt.visual.diff':'Görsel Fark','rpt.illuminant':'Aydınlatma Analizi',
'rpt.exec.summary':'Yonetici Ozeti','rpt.visual.compare.section':'Gorsel Karsilastirma',
'rpt.recommendations':'Öneriler','rpt.ssim':'Yapısal SSIM','rpt.gradient':'Gradyan Benzerliği',
'rpt.phase':'Faz Korelasyonu','rpt.structural':'Yapısal Fark','rpt.fourier':'Fourier Alan Analizi',
'rpt.glcm':'GLCM Doku Analizi',
'rpt.grad.bound':'Gradyan Sınırı','rpt.phase.bound':'Faz Sınırı',
'prop.boundary.sensitivity':'Sınır Tespit Hassasiyeti','prop.gradient.sens':'Gradyan Hassasiyeti','prop.phase.sens':'Faz Hassasiyeti',
'rpt.summary':'Özet','rpt.conclusion':'Sonuç','rpt.pattern.rec':'Öneriler',
'btab.console':'Konsol','btab.results':'Sonuçlar','btab.clear':'Temizle',
'results.empty':'Sonuçları görmek için bir analiz çalıştırın.','sb.ready':'Hazır',
'sb.mode':'Mod','sb.region':'Bölge','sb.images':'Görüntüler','sb.processing':'İşleniyor...','sb.custom':'Özel',
'log.init':'SpectraMatch Desktop v3.0.0 başlatıldı','log.session.restored':'Oturum geri yüklendi',
'log.theme':'Tema','log.language':'Dil','log.region':'Bölge','log.shape':'Şekil',
'log.loaded':'Yüklendi','log.region.center.set':'Bölge merkezi ayarlandı','log.console.cleared':'Konsol temizlendi',
'log.panel.toggled':'Panel değiştirildi','log.settings.reset':'Tüm ayarlar varsayılanlara sıfırlandı',
'log.starting.analysis':'Analiz başlatılıyor...','log.analysis.complete':'Analiz tamamlandı!',
'log.decision':'Karar','log.points.confirmed':'Noktalar onaylandı','log.points.reset':'Bölge değişikliği nedeniyle noktalar sıfırlandı',
'log.generated.random':'Rastgele noktalar oluşturuldu','log.region.moved':'Bölge taşındı',
'log.saving':'Kaydediliyor','log.saved':'Kaydedildi','log.save.cancelled':'Kaydetme iptal edildi','log.save.error':'Kaydetme hatası',
'log.download.error':'İndirme hatası',
'loading.title':'Analiz İşleniyor','loading.text':'Lütfen bekleyin...','loading.running':'Analiz motoru çalıştırılıyor...',
'feedback.fail':'Gönderilemedi. Lütfen tekrar deneyin.','feedback.network':'Ağ hatası. Bağlantınızı kontrol edin.',
'region.changed':'Bölge Değişti','region.points.outside.msg':' nokta(lar) yeni bölgenin dışında. Tüm noktalar sıfırlansın mı?',
'sampling.all.selected':'Tüm noktalar zaten seçildi.',
'about.title':'SpectraMatch Hakkında','ds.title':'Teknik Dokümantasyon',
'ds.desc':'Teknik dokümantasyon PDF formatında mevcuttur.',
'ds.available':'İngilizce ve Türkçe olarak mevcuttur',
'fb.title':'Geri Bildirim Gönder','fb.note':'Tüm alanlar isteğe bağlıdır.',
'fb.name':'Ad','fb.email':'E-posta','fb.type':'Tür','fb.message':'Mesaj',
'fb.type.note':'Not','fb.type.suggestion':'Öneri','fb.type.complaint':'Şikayet',
'fb.type.question':'Soru','fb.type.other':'Diğer',
'fb.anonymous':'Anonim olarak gönder','fb.email.note':'Ek göndermek için lütfen e-posta gönderin','btn.cancel':'İptal','btn.send':'Gönder',
'contact.title':'İletişim','ps.title':'Örnek Noktaları Seç',
'ps.hint':'Ölçüm noktaları yerleştirmek için görüntüye tıklayın.',
'ps.undo':'Geri Al','ps.clear':'Tümünü Temizle','ps.random.fill':'Rastgele Tamamla',
'ps.confirm':'Seçimi Onayla','random':'Rastgele','manual':'Manuel',
'about.desc':'SpectraMatch, tekstil kalite kontrolü için profesyonel bir masaüstü uygulamasıdır. Renk farkı analizi (Delta E 2000), desen eşleştirme (SSIM, Gradyan, Faz) yapar ve kapsamlı PDF raporları oluşturur.',
'about.tagline':'Profesyonel Tekstil Renk ve Desen Kalite Kontrolü',
'about.feat1':'Delta E 2000 Renk Analizi',
'about.feat2':'SSIM, Gradyan ve Faz Desen Eşleştirme',
'about.feat3':'Kapsamlı PDF Raporları',
'about.feat4':'CIE Standart Aydınlatmalar (D65, D50, TL84)',
'menu.shortcuts':'Klavye Kısayolları','menu.documentation':'Dokümantasyon','menu.release.notes':'Sürüm Notları','menu.check.updates':'Güncellemeleri Kontrol Et',
'menu.export.results':'Sonuçları Dışa Aktar','menu.generate.report':'Rapor Oluştur',
'sc.close.dialogs':'Tüm diyalogları kapat',
'confirm.delete.title':'Tüm Görüntüleri Sil','confirm.delete.msg':'Tüm görüntüleri silmek istediğinizden emin misiniz?',
'tb.reset':'Sıfırla','reset.title':'Varsayılana Sıfırla','reset.msg':'Bu işlem TÜM ayarları sıfırlayacak, tüm görüntüleri temizleyecek ve uygulamayı ilk açılış durumuna döndürecektir. Emin misiniz?','reset.done':'Uygulama varsayılan duruma sıfırlandı',
'error.no.sample':'Lütfen önce bir örnek görüntü yükleyin.','error.no.both':'Lütfen önce her iki görüntüyü de yükleyin.',
'error.no.results':'Dışa aktarılacak sonuç yok. Lütfen önce bir analiz çalıştırın.',
'feedback.sent':'Geri bildirim gönderildi!','feedback.empty':'Lütfen bir mesaj girin.',
'mode.single':'Tek Görüntü','mode.dual':'Çift Görüntü','color.score':'Renk Skoru','pattern.score':'Desen Skoru','overall.score':'Genel Skor',
'region.click.hint':'Bölge merkezini yerleştirmek için görüntüye tıklayın','region.outside':'Nokta seçili bölgenin dışında',
'updates.current':'Güncelsiniz!',
'rn.item1':'Tüm arayüz öğeleri için tam Türkçe dil desteği','rn.item2':'Tüm analiz ve yardım seçenekleriyle eksiksiz araç çubuğu','rn.item3':'Serbest çizim (Kalem) bölge seçim aracı','rn.item4':'Teste hazır yerleşik örnek görüntüler','rn.item5':'Oturum kalıcılığı ve durum geri yükleme','rn.item6':'PDF raporları için yerel Farklı Kaydet diyaloğu','rn.item7':'Manuel ve rastgele örnekleme noktası seçimi','rn.item8':'GLCM doku ve Fourier frekans analizi','rn.item9':'Görselleştirmelerle kapsamlı PDF raporları','rn.item10':'Panel yeniden boyutlandırma ve düzen özelleştirme',
'tb.title.open.ref':'Referans Görüntü Aç (Ctrl+O)','tb.title.open.sample':'Örnek Görüntü Aç (Ctrl+Shift+O)','tb.title.run':'Analizi Çalıştır (F5)','tb.title.delete':'Görüntüleri Sil (Ctrl+D)','tb.title.full.image':'Tüm görüntüyü işle','tb.title.single.mode':'Tek görüntü analiz modu','tb.title.ready.test':'Teste Hazır Görüntüler','tb.title.datasheet':'Teknik Veri Sayfası','tb.title.feedback':'Geri Bildirim Gönder','tb.title.thesis.test':'Tez Testi','tb.title.reset':'Varsayılana Sıfırla','tb.title.lang.switch':'Dil değiştir','tb.title.theme':'Tema değiştir','tb.title.hide.panel':'Paneli gizle','tb.title.clear.console':'Konsolu temizle',
'desktop.alignment.mode':'Hizalama Modu','desktop.alignment.studio':'SPACTRA Studio','desktop.open.studio':'Stüdyoyu Aç',
'thesis.delete.title':'Tez Veritabanını Sil','thesis.delete.msg':'Tüm tez test veritabanını silmek istediğinizden emin misiniz?','thesis.delete.confirm':'Onayla','thesis.delete.success':'Tez veritabanı başarıyla silindi','thesis.delete.error':'Tez veritabanı silinemedi',
'rpt.report.summary':'Rapor Özeti','rpt.color.analysis':'Renk Analizi Detayları','rpt.pattern.analysis':'Desen Analizi Detayları',
'rpt.texture.frequency':'Doku ve Frekans Analizi','rpt.single.image.analysis':'Tek Görüntü Analizi',
'rpt.color.scoring.label':'Renk Puanlama','rpt.pattern.scoring.label':'Desen Puanlama',
'rpt.csi.label':'CSI (Tam g\u00f6r\u00fcnt\u00fc \u0394E2000)','rpt.mean.de2000':'Ortalama \u0394E 2000','rpt.report.size.label':'Rapor Boyutu',
'rpt.deltaep2000.note':'ΔE₀₀, ham renk farkı değeri olarak raporlanır. Yüzdelik bir puana dönüştürülmez; daha düşük değerler daha yakın renk uyumunu gösterir.',
'rpt.structural.change':'Yapısal Değişim','rpt.color.comparison':'Renk Karşılaştırması',
'rpt.reference':'Referans','rpt.sample':'Numune','rpt.regional.color.metrics':'Bölgesel Renk Metrikleri',
'rpt.de.summary.stats':'\u0394E Özet İstatistikleri','rpt.illuminant.analysis':'Aydınlatıcı Analizi',
'rpt.individual.method.scores':'Bireysel Yöntem Puanları','rpt.structural.difference':'Yapısal Fark',
'rpt.similarity.score':'Benzerlik Puanı','rpt.change.percentage':'Değişim Yüzdesi','rpt.verdict':'Karar',
'rpt.difference.maps':'Fark Haritaları','rpt.boundary.detection':'Sınır Tespiti','rpt.structural.analysis':'Yapısal Analiz',
'rpt.mode.label':'Mod','rpt.single.image.mode':'Tek Görüntü Analizi',
'rpt.mean.de00':'Ortalama ΔE₀₀','rpt.method':'Yöntem','rpt.status':'Durum','rpt.composite':'Bileşik',
'rpt.structural.label':'Yap\u0131sal','rpt.position':'Konum','rpt.ref.lab':'Ref L*a*b*','rpt.sam.lab':'\u00d6rn L*a*b*',
'rpt.metric':'Metrik','rpt.average':'Ortalama','rpt.std.dev':'Std Sapma','rpt.min':'Min','rpt.max':'Maks',
'rpt.de.heatmap':'\u0394E Is\u0131 Haritas\u0131','rpt.de.heatmap.caption':'Referans ve numune aras\u0131ndaki piksel d\u00fczeyinde renk fark\u0131 \u0131s\u0131 haritas\u0131.',
'rpt.spectral.dist':'Spektral Da\u011f\u0131l\u0131m (Vekil)','rpt.spectral.dist.caption':'Ortalama RGB de\u011ferlerinden yakla\u015f\u0131k spektral yans\u0131tma e\u011frileri.',
'rpt.rgb.histograms':'RGB Histogramlar\u0131','rpt.rgb.histograms.caption':'Referans ve Numune i\u00e7in yan yana RGB kanal da\u011f\u0131l\u0131m\u0131.',
'rpt.lab.scatter':'a* - b* Kromatiklik Da\u011f\u0131l\u0131m\u0131','rpt.lab.scatter.caption':'a*b* d\u00fczleminde Referans ve Numune kromatiklik koordinatlar\u0131.',
'rpt.lab.bars':'Lab Bile\u015fenleri \u2013 Ortalama','rpt.lab.bars.caption':'Referans ve Numune aras\u0131nda ortalama L*, a*, b* kar\u015f\u0131la\u015ft\u0131rmas\u0131.',
'rpt.ssim.map':'SSIM Fark Haritas\u0131','rpt.ssim.map.caption':'Yap\u0131sal SSIM fark\u0131 \u2014 s\u0131cak b\u00f6lgeler yap\u0131sal farkl\u0131l\u0131\u011f\u0131 g\u00f6sterir.',
'rpt.gradient.map':'Gradyan Benzerlik Haritas\u0131','rpt.gradient.map.caption':'Gradyan b\u00fcy\u00fckl\u00fck fark\u0131 \u2014 kenar/doku uyumsuzluklar\u0131n\u0131 vurgular.',
'rpt.phase.map':'Faz Korelasyon Haritas\u0131','rpt.phase.map.caption':'Faz tabanl\u0131 fark \u2014 uzamsal kaymalar\u0131 ve hizalama bozukluklar\u0131n\u0131 tespit eder.',
'rpt.gradient.boundary':'Gradyan S\u0131n\u0131r\u0131','rpt.gradient.boundary.caption':'Numune \u00fczerinde \u00f6nemli gradyan fark b\u00f6lgeleri.',
'rpt.gradient.filled':'Gradyan Dolgulu','rpt.gradient.filled.caption':'K\u0131rm\u0131z\u0131 dolgulu gradyan fark b\u00f6lgeleri.',
'rpt.phase.boundary':'Faz S\u0131n\u0131r\u0131','rpt.phase.boundary.caption':'Numune \u00fczerinde \u00f6nemli faz fark b\u00f6lgeleri.',
'rpt.phase.filled':'Faz Dolgulu','rpt.phase.filled.caption':'K\u0131rm\u0131z\u0131 dolgulu faz fark b\u00f6lgeleri.',
'rpt.multi.method':'\u00c7oklu Y\u00f6ntem Kar\u015f\u0131la\u015ft\u0131rmas\u0131','rpt.multi.method.caption':'Gradyan b\u00fcy\u00fckl\u00fc\u011f\u00fc, birle\u015fik y\u00f6ntemler ve g\u00fcr\u00fclt\u00fc filtrelenmi\u015f fark haritalar\u0131.',
'rpt.pure.diff':'Saf Farklar','rpt.pure.diff.caption':'\u0130zole edilmi\u015f saf fark b\u00f6lgeleri (siyah \u00fczerine k\u0131rm\u0131z\u0131).',
'rpt.fourier.fft':'Fourier Spektrumu (FFT)','rpt.fourier.fft.caption':'Frekans alan\u0131 \u00f6zelliklerini g\u00f6steren 2D FFT b\u00fcy\u00fckl\u00fck spektrumu.',
'rpt.glcm.heatmap':'GLCM Doku Is\u0131 Haritas\u0131','rpt.glcm.heatmap.caption':'Gri Seviye E\u015f-olu\u015fum Matrisi doku \u00f6zelli\u011fi kar\u015f\u0131la\u015ft\u0131rma \u0131s\u0131 haritalar\u0131.',
'rpt.histogram.single':'RGB Histogram\u0131','rpt.histogram.single.caption':'Numune g\u00f6r\u00fcnt\u00fcs\u00fcn\u00fcn RGB kanal da\u011f\u0131l\u0131m\u0131.',
'rpt.spectral.single':'Spektral Da\u011f\u0131l\u0131m (Vekil)','rpt.spectral.single.caption':'Ortalama RGB de\u011ferlerinden yakla\u015f\u0131k spektral yans\u0131tma e\u011frisi.',
'rpt.fourier.single':'Fourier Spektrumu','rpt.fourier.single.caption':'Frekans alan\u0131 \u00f6zelliklerini g\u00f6steren 2D FFT b\u00fcy\u00fckl\u00fck spektrumu.',
'rpt.score.color':'Renk','rpt.score.pattern':'Desen','rpt.score.overall':'Genel',
'rpt.dl.full':'Tam Rapor','rpt.dl.color':'Renk Raporu','rpt.dl.pattern':'Desen Raporu','rpt.dl.receipt':'Ayar Makbuzu',
'rpt.decision.accept':'KABUL','rpt.decision.reject':'RED','rpt.decision.conditional':'KOŞULLU','rpt.decision.complete':'TAMAMLANDI',
'exit.title':'SpectraMatch Kapatılsın mı?','exit.warning':'Kaydedilmemiş veriler ve raporlar kaybolabilir.','exit.cancel':'İptal','exit.close':'Kapat',
'btn.ok':'Tamam',
'loading.thesis.title':'Tez Testleri Çalıştırılıyor',
'loading.thesis.stage.init':'Test ortamı hazırlanıyor...',
'loading.thesis.stage.direct':'Direkt Piksel analizi çalıştırılıyor (1/3)...',
'loading.thesis.stage.ai':'AI SmartMatch analizi çalıştırılıyor (2/3)...',
'loading.thesis.stage.bestch':'BESTCH analizi çalıştırılıyor (3/3)...',
'loading.thesis.stage.compiling':'Sonuçlar derleniyor ve raporlar kaydediliyor...',
'thesis.rtt.autoload':'Çalışma alanı görüntüsü yok — Teste Hazır Çift 1 yükleniyor...',
'thesis.rtt.loading':'Test görüntüleri yükleniyor...',
'thesis.rtt.autoloaded':'Teste Hazır Çift 1 yüklendi.',
'thesis.rtt.starting':'Görüntüler yüklendi — tez testi başlatılıyor...',
'alignment.no.images.title':'Görüntü Gerekli',
'alignment.no.images.msg':'SPACTRA Studio\'yu açmadan önce lütfen hem referans hem de örnek görüntü yükleyin.',
'tb.align.label':'Hizala:',
'tb.title.align.mode':'Hizalama Modu — ön işlem yöntemini seçin',
'tb.title.open.studio':'SPACTRA Studio\'yu Aç',
'tb.title.sampling.count':'Örnekleme Sayısı — renk ölçüm noktası sayısı'
,'cam.import.computer':'Bilgisayardan \u0130\u00e7e Aktar','cam.import.camera':'Kameradan \u0130\u00e7e Aktar',
'cam.studio.title':'Kamera Yakalama St\u00fcdyosu','cam.select.camera':'Kamera Se\u00e7in',
'cam.no.cameras':'Kamera alg\u0131lanmad\u0131','cam.requesting':'Kamera eri\u015fimi isteniyor...',
'cam.permission.denied':'Kamera izni reddedildi. L\u00fctfen ayarlardan eri\u015fime izin verin.',
'cam.not.supported':'Bu ortamda kamera desteklenmiyor.','cam.capture':'Yakala',
'cam.retake':'Yeniden \u00c7ek','cam.use.image':'G\u00f6r\u00fcnt\u00fcy\u00fc Kullan','cam.cancel':'\u0130ptal','cam.close':'Kapat',
'cam.rotate.left':'Sola D\u00f6nd\u00fcr','cam.rotate.right':'Sa\u011fa D\u00f6nd\u00fcr','cam.flip.h':'Yatay \u00c7evir',
'cam.brightness':'Parlakl\u0131k','cam.contrast':'Kontrast','cam.mirror':'Ayna',
'cam.captured':'G\u00f6r\u00fcnt\u00fc ba\u015far\u0131yla yakaland\u0131','cam.assigned.ref':'Yakalanan g\u00f6r\u00fcnt\u00fc Referans olarak ayarland\u0131',
'cam.assigned.sample':'Yakalanan g\u00f6r\u00fcnt\u00fc Numune olarak ayarland\u0131',
'cam.file.build.error':'Yakalanan g\u00f6r\u00fcnt\u00fc dosyas\u0131 olu\u015fturulamad\u0131.',
'cam.access.error':'Kamera eri\u015fim hatas\u0131','cam.stream.error':'Kamera ak\u0131\u015f hatas\u0131'
}};

function t(k){return(T[State.lang]||T.en)[k]||(T.en)[k]||k;}
function formatColorMethodLabel(label){return label==='DELTAE2000'?'ΔE₀₀':label;}
function translatePage(){
    document.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(function(el){
        var k=el.getAttribute('data-i18n')||el.getAttribute('data-i18n-html'),v=t(k);
        if(el.hasAttribute('data-i18n-html')) el.innerHTML=v;
        else el.textContent=v;
    });
    /* Translate title (tooltip) attributes — use data-tooltip for CSS tooltips, remove native title */
    document.querySelectorAll('[data-i18n-title]').forEach(function(el){
        var k=el.getAttribute('data-i18n-title'),v=t(k);
        if(v&&v!==k){
            el.setAttribute('data-tooltip',v);
            el.setAttribute('aria-label',v);
            el.removeAttribute('title');
        }
    });
    /* About dialog dynamic elements */
    if($('aboutDesc'))$('aboutDesc').textContent=t('about.desc');
    if($('aboutTagline'))$('aboutTagline').textContent=t('about.tagline');
    if($('aboutFeatText1'))$('aboutFeatText1').textContent=t('about.feat1');
    if($('aboutFeatText2'))$('aboutFeatText2').textContent=t('about.feat2');
    if($('aboutFeatText3'))$('aboutFeatText3').textContent=t('about.feat3');
    if($('aboutFeatText4'))$('aboutFeatText4').textContent=t('about.feat4');
    if($('scCloseDialogs'))$('scCloseDialogs').textContent=t('sc.close.dialogs');
    refreshDesktopCameraTranslations();
}

/* ═══ Console ═══ */
function log(msg,cls){
    var out=$('consoleOut'),line=document.createElement('div');
    line.className='console-line'+(cls?' '+cls:'');
    var ts=new Date(),s=('0'+ts.getHours()).slice(-2)+':'+('0'+ts.getMinutes()).slice(-2)+':'+('0'+ts.getSeconds()).slice(-2);
    var d=document.createElement('div');d.textContent=msg;
    line.innerHTML='<span class="ts">['+s+']</span>'+d.innerHTML;
    out.appendChild(line);var tc=$('tabConsole');if(tc)tc.scrollTop=tc.scrollHeight;
}

/* ═══ Init ═══ */
document.addEventListener('DOMContentLoaded',function(){
    State.lang=localStorage.getItem('desk_lang')||'tr';
    State.theme=localStorage.getItem('desk_theme')||'light';
    document.body.setAttribute('data-theme',State.theme);
    $('langCode').textContent=State.lang.toUpperCase();
    updateLangFlag();
    translatePage();
    log(t('log.init'),'info');
    log(t('sb.ready'),'');
    initMenuBar();initToolbar();initFileInputs();initReadyToTest();initPropertySections();
    initBottomTabs();initKeyboard();initTheme();initLang();
    initDialogs();initSampling();initPointSelector();initDesktopCameraStudio();
    initRegionOverlays();initRegionDrag();initPanelControls();initPanelResize();
    /* Restore persisted state (after all UI is initialized) */
    var restored=restoreState();
    if(restored){log(t('log.session.restored'),'info');}
    updateUI();updateRegionOverlays();updateSamplingUI();
    /* Sync View menu checkmarks with actual panel visibility */
    _syncViewMenuChecks();
    /* Wire auto-save to property inputs */
    document.querySelectorAll('#panelProperties input, #panelProperties select').forEach(function(el){
        el.addEventListener('change',scheduleSave);
    });
});

/* ═══ Theme ═══ */
function initTheme(){
    $('themeToggle').addEventListener('click',function(){
        State.theme=State.theme==='dark'?'light':'dark';
        document.body.setAttribute('data-theme',State.theme);
        localStorage.setItem('desk_theme',State.theme);
        log(t('log.theme')+': '+State.theme,'info');
        scheduleSave();
    });
}

/* ═══ Language ═══ */
function updateLangFlag(){
    var flag=$('langFlag');
    if(flag){
        flag.src=State.lang==='tr'?'/static/images/tr.svg':'/static/images/uk.svg';
        flag.alt=State.lang.toUpperCase();
    }
}
function initLang(){
    $('langSwitch').addEventListener('click',function(){
        State.lang=State.lang==='en'?'tr':'en';
        $('langCode').textContent=State.lang.toUpperCase();
        updateLangFlag();
        localStorage.setItem('desk_lang',State.lang);
        translatePage();updateUI();
        log(t('log.language')+': '+(State.lang==='en'?'English':'Türkçe'),'info');
        scheduleSave();
    });
}

/* ═══ Menu Bar ═══ */
function initMenuBar(){
    var items=document.querySelectorAll('.menu-item'),openMenu=null;
    items.forEach(function(item){
        item.querySelector('.menu-label').addEventListener('mousedown',function(e){
            e.stopPropagation();
            if(item.classList.contains('open')){closeAll();}
            else{closeAll();item.classList.add('open');openMenu=item;}
        });
        item.addEventListener('mouseenter',function(){
            if(openMenu&&openMenu!==item){closeAll();item.classList.add('open');openMenu=item;}
        });
    });
    /* Prevent mousedown inside dropdowns from bubbling to document (which would close the menu before click fires) */
    document.querySelectorAll('.menu-dropdown').forEach(function(dd){
        dd.addEventListener('mousedown',function(e){e.stopPropagation();});
    });
    document.addEventListener('mousedown',function(){closeAll();});
    document.querySelectorAll('.menu-action').forEach(function(a){
        a.addEventListener('click',function(e){e.stopPropagation();closeAll();handleMenu(this.getAttribute('data-action'));});
    });
    function closeAll(){items.forEach(function(i){i.classList.remove('open');});openMenu=null;}
}

function handleMenu(cmd){
    switch(cmd){
        case 'open-ref':$('refFileInput').click();break;
        case 'open-sample':$('sampleFileInput').click();break;
        case 'delete-images':confirmDelete();break;
        case 'run':runAnalysis();break;
        case 'reset-settings':resetSettings();break;
        case 'reset-default':resetToDefault();break;
        case 'toggle-workspace':togglePanel('panelWorkspace');break;
        case 'toggle-properties':togglePanel('panelProperties');break;
        case 'toggle-console':togglePanel('bottomPanel');break;
        case 'about':$('aboutDialog').style.display='';break;
        case 'shortcuts':$('shortcutsDialog').style.display='';break;
        case 'datasheet':$('datasheetDialog').style.display='';break;
        case 'feedback':$('feedbackDialog').style.display='';break;
        case 'contact':$('contactDialog').style.display='';break;
        case 'export-results':exportResults();break;
        case 'generate-report':runAnalysis();break;
        case 'documentation':$('datasheetDialog').style.display='';break;
        case 'release-notes':$('releaseNotesDialog').style.display='';break;
        case 'check-updates':$('checkUpdatesDialog').style.display='';break;
        case 'exit':$('exitDialog').style.display='';break;
    }
}

function exportResults(){
    if(!State.lastResult){showAlert(t('menu.export.results'),t('error.no.results'),'\u26a0\ufe0f');return;}
    /* If there's a PDF, trigger download of the full report */
    if(State.lastResult.pdf_url){
        var fn=State.lastResult.fn_full||'Report.pdf';
        saveAsDownload(State.lastResult.pdf_url+'?fn='+encodeURIComponent(fn),fn);
    }else{
        showAlert(t('menu.export.results'),t('error.no.results'),'\u26a0\ufe0f');
    }
}

/* Map panel id → data-action value on the View menu item */
var _panelActionMap={'bottomPanel':'toggle-console','panelWorkspace':'toggle-workspace','panelProperties':'toggle-properties'};

function _syncViewMenuChecks(){
    Object.keys(_panelActionMap).forEach(function(panelId){
        var action=_panelActionMap[panelId];
        var el=$(panelId);
        var menuEl=document.querySelector('.menu-action[data-action="'+action+'"]');
        if(!menuEl)return;
        var visible=el&&!el.classList.contains('hidden');
        menuEl.classList.toggle('checked',!!visible);
    });
}

function togglePanel(id){
    var el=$(id);el.classList.toggle('hidden');
    var isHidden=el.classList.contains('hidden');
    if(id==='bottomPanel'){
        document.body.classList.toggle('no-bottom',isHidden);
        if($('resizeBottom'))$('resizeBottom').style.display=isHidden?'none':'';
    }
    if(id==='panelWorkspace'&&$('resizeWorkspace'))$('resizeWorkspace').style.display=isHidden?'none':'';
    if(id==='panelProperties'&&$('resizeProperties'))$('resizeProperties').style.display=isHidden?'none':'';
    /* Sync View menu checkmarks */
    var action=_panelActionMap[id];
    if(action){
        var menuEl=document.querySelector('.menu-action[data-action="'+action+'"]');
        if(menuEl)menuEl.classList.toggle('checked',!isHidden);
    }
    /* Redraw region overlays after layout change */
    setTimeout(function(){if(!State.fullImage)updateRegionOverlays();},50);
    scheduleSave();
}

/* ═══ Toolbar ═══ */
function initToolbar(){
    bindToolbarImportDropdown('tbOpenRef','tbRefDropdown','ref');
    bindToolbarImportDropdown('tbOpenSample','tbSampleDropdown','sample');
    $('tbRun').addEventListener('click',runAnalysis);
    $('tbDelete').addEventListener('click',confirmDelete);
    $('tbDatasheet').addEventListener('click',function(){$('datasheetDialog').style.display='';});
    $('tbFeedback').addEventListener('click',function(){$('feedbackDialog').style.display='';});
    $('tbThesisTest').addEventListener('click',runThesisTest);
    $('tbThesisTest').addEventListener('contextmenu',function(e){
        e.preventDefault();
        confirmDeleteThesisDatabase();
    });

    $('tbSingleMode').addEventListener('change',function(){
        State.singleMode=this.checked;
        /* Preserve Full Image state — single mode must NOT alter it */
        var savedFullImage=State.fullImage;
        updateSliderMax();
        resetRegionCenter();updateRegionOverlays();
        log('Mode: '+t(State.singleMode?'mode.single':'mode.dual'),'info');
        /* Restore in case anything changed it */
        State.fullImage=savedFullImage;
        $('tbFullImage').checked=savedFullImage;
        $('tbRegionControls').classList.toggle('hidden',State.fullImage);
        updateUI();scheduleSave();
    });
    $('tbFullImage').addEventListener('change',function(){
        State.fullImage=this.checked;
        $('tbRegionControls').classList.toggle('hidden',State.fullImage);
        updateRightToolsCollapsed();
        log(t('log.region')+': '+(State.fullImage?t('tb.full.image'):t('sb.custom')),'info');
        updateRegionOverlays();updateUI();scheduleSave();
    });
    $('tbShape').addEventListener('change',function(){
        var v=this.value, isRect=v==='rectangle', isPen=v==='pen';
        $('tbRectGroup').style.display=isRect?'':'none';
        /* Disable / dim size controls when Pen is active */
        var sizeEls=[$('tbSizeSlider'),$('tbSizeValue'),$('tbHeightSlider'),$('tbHeightValue')];
        sizeEls.forEach(function(el){if(el){el.disabled=isPen;el.style.opacity=isPen?'0.35':'';el.style.pointerEvents=isPen?'none':'';}});
        var sizeLabels=$('tbRegionControls').querySelectorAll('.tb-label');
        sizeLabels.forEach(function(lbl){lbl.style.opacity=isPen?'0.35':'';});
        /* Clear pen state when switching away */
        if(!isPen){State.penPoints=[];State.penDrawing=false;State.penClosed=false;}
        else{State.penPoints=[];State.penDrawing=false;State.penClosed=false;log(t('pen.draw.hint'),'info');}
        updateSliderMax();
        if(!isPen){resetRegionCenter();}
        updateRegionOverlays();
        checkPointsAfterRegionChange();
        log(t('log.shape')+': '+t(v),'info');
        scheduleSave();
    });
    var sync=function(sId,nId){
        $(sId).addEventListener('input',function(){$(nId).value=this.value;updateRegionOverlays();checkPointsAfterRegionChange();});
        /* Let user type freely; only clamp on blur/Enter */
        $(nId).addEventListener('blur',function(){clampAndSyncInput(sId,nId);});
        $(nId).addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();clampAndSyncInput(sId,nId);this.blur();}});
    };
    sync('tbSizeSlider','tbSizeValue');
    sync('tbHeightSlider','tbHeightValue');
    $('tbRegionControls').classList.toggle('hidden',State.fullImage);

    /* ── Right toolbar collapse: when Full Image is OFF, group right-side
         tools (Ready-to-Test, Datasheet, Feedback, Thesis Test, Reset) into
         a clean dropdown anchored on a "more" button to keep the toolbar
         tidy. When Full Image is ON, restore the inline layout. ── */
    var moreBtn=$('tbMoreBtn');
    var rightTools=$('tbRightTools');
    if(moreBtn&&rightTools){
        moreBtn.addEventListener('click',function(e){
            e.stopPropagation();
            rightTools.classList.toggle('show');
        });
        document.addEventListener('click',function(e){
            if(!rightTools.contains(e.target))rightTools.classList.remove('show');
        });
        document.addEventListener('keydown',function(e){
            if(e.key==='Escape')rightTools.classList.remove('show');
        });
    }
    updateRightToolsCollapsed();

    /* ── Toolbar ⇔ Properties bidirectional sync: Alignment Mode ── */
    $('tbAlignmentMode').addEventListener('change',function(){
        if($('propAlignmentMode'))$('propAlignmentMode').value=this.value;
        applyAlignmentToWorkspace(this.value);
        scheduleSave();
    });
    if($('propAlignmentMode'))$('propAlignmentMode').addEventListener('change',function(){
        $('tbAlignmentMode').value=this.value;
        applyAlignmentToWorkspace(this.value);
    });

    /* ── Toolbar ⇔ Properties bidirectional sync: Sampling Count ── */
    $('tbSamplingCount').addEventListener('change',function(){
        var v=Math.max(1,Math.min(100,parseInt(this.value)||5));
        this.value=v;
        if($('propRegionCount'))$('propRegionCount').value=v;
        if($('propPointsCount'))$('propPointsCount').value=v;
        scheduleSave();
    });
    $('tbSamplingCount').addEventListener('blur',function(){
        var v=Math.max(1,Math.min(100,parseInt(this.value)||5));
        this.value=v;
    });
    if($('propRegionCount'))$('propRegionCount').addEventListener('change',function(){
        $('tbSamplingCount').value=this.value;
    });
    document.addEventListener('click',function(e){
        if(!e.target.closest('.tb-dropdown-wrap'))closeToolbarImportDropdowns();
    });
    document.addEventListener('keydown',function(e){
        if(e.key==='Escape')closeToolbarImportDropdowns();
    });
}

function bindToolbarImportDropdown(buttonId,menuId,target){
    var btn=$(buttonId),menu=$(menuId);
    if(!btn||!menu)return;
    btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        var isOpen=menu.classList.contains('show');
        closeToolbarImportDropdowns(menuId);
        menu.classList.toggle('show',!isOpen);
    });
    menu.querySelectorAll('.tb-dropdown-item').forEach(function(item){
        item.addEventListener('click',function(e){
            e.preventDefault();
            e.stopPropagation();
            closeToolbarImportDropdowns();
            var action=this.getAttribute('data-action');
            if(action===target+'-file'){
                $(target==='ref'?'refFileInput':'sampleFileInput').click();
                return;
            }
            if(action===target+'-camera')openDesktopCameraStudio(target);
        });
    });
}

function closeToolbarImportDropdowns(exceptId){
    document.querySelectorAll('.tb-dropdown-menu.show').forEach(function(menu){
        if(exceptId&&menu.id===exceptId)return;
        menu.classList.remove('show');
    });
}

/* ═══ Ready-to-Test ═══ */
function initReadyToTest(){
    var btn=$('tbReadyTest'),dd=$('tbReadyDropdown');
    if(!btn||!dd)return;
    btn.addEventListener('click',function(e){e.stopPropagation();dd.classList.toggle('show');});
    document.addEventListener('click',function(e){if(!btn.contains(e.target)&&!dd.contains(e.target))dd.classList.remove('show');});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')dd.classList.remove('show');});
    dd.querySelectorAll('.tb-ready-item').forEach(function(item){
        item.addEventListener('click',function(){
            dd.classList.remove('show');
            var refName=this.getAttribute('data-ref');
            var sampleName=this.getAttribute('data-sample');
            var singleName=this.getAttribute('data-single');
            if(refName&&sampleName){
                /* Dual mode pair */
                if(State.singleMode){$('tbSingleMode').checked=false;State.singleMode=false;updateUI();}
                log(t('rtt.loading'),'info');
                fetchReadyImage(refName,function(file){loadImage('ref',file);
                    fetchReadyImage(sampleName,function(file2){loadImage('sample',file2);log(t('rtt.loaded.pair'),'success');});
                });
            }else if(singleName){
                /* Single image */
                if(!State.singleMode){$('tbSingleMode').checked=true;State.singleMode=true;updateUI();}
                log(t('rtt.loading'),'info');
                fetchReadyImage(singleName,function(file){loadImage('sample',file);log(t('rtt.loaded'),'success');});
            }
        });
    });
}
function fetchReadyImage(filename,cb){
    fetch('/static/READYTOTEST/'+filename)
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.blob();})
    .then(function(blob){var file=new File([blob],'Test'+filename,{type:blob.type||'image/png'});cb(file);})
    .catch(function(err){log('Error loading '+filename+': '+err.message,'error');});
}

/* ═══ File Inputs ═══ */
function initFileInputs(){
    $('refFileInput').addEventListener('change',function(){if(this.files.length)loadImage('ref',this.files[0]);this.value='';});
    $('sampleFileInput').addEventListener('change',function(){if(this.files.length)loadImage('sample',this.files[0]);this.value='';});
}

function loadImage(which,file){
    var reader=new FileReader();
    reader.onload=function(e){
        var img=new Image();
        img.onload=function(){
            var w=img.naturalWidth,h=img.naturalHeight;
            if(which==='ref'){
                State.refFile=file;State.refDataUrl=e.target.result;State.refW=w;State.refH=h;
                /* Track the original — used to restore when alignment mode is reset to Direct */
                State.refDataUrlOriginal=e.target.result;State.refWOriginal=w;State.refHOriginal=h;
            } else {
                State.sampleFile=file;State.sampleDataUrl=e.target.result;State.sampleW=w;State.sampleH=h;
                State.sampleDataUrlOriginal=e.target.result;State.sampleWOriginal=w;State.sampleHOriginal=h;
            }
            /* Reset cached alignment so next mode change re-applies on fresh image */
            _alignAutoApply.lastMode=null;
            showPreview(which,e.target.result,w,h,file.name);
            updateSliderMax();
            resetRegionCenter();
            updateRegionOverlays();
            updateUI();
            log(t('log.loaded')+' '+which+': '+file.name+' ('+w+'x'+h+')','success');
            scheduleSave();
        };img.src=e.target.result;
    };reader.readAsDataURL(file);
}

function showPreview(which,url,w,h,name){
    var pre=which==='ref'?'ref':'sample',cap=pre.charAt(0).toUpperCase()+pre.slice(1);
    $(pre+'Preview').src=url;$(pre+'Preview').style.display='';
    $(pre+'Empty').style.display='none';
    $('ws'+cap+'Name').textContent=name;
    $('ws'+cap+'Dims').textContent=w+' × '+h+' px';
    $('ws'+cap+'Thumb').innerHTML='<img src="'+url+'">';
    $('ws'+cap+'Card').classList.add('loaded');
}

/* ═══ Slider Max Updates ═══ */
function updateSliderMax(){
    var imgW=0,imgH=0;
    if(State.singleMode){imgW=State.sampleW;imgH=State.sampleH;}
    else if(State.refW){imgW=State.refW;imgH=State.refH;}
    else if(State.sampleW){imgW=State.sampleW;imgH=State.sampleH;}
    if(imgW>0){
        var shape=$('tbShape').value||'circle';
        var maxW=(shape==='rectangle')?imgW:Math.min(imgW,imgH);
        $('tbSizeSlider').max=maxW;
        $('tbHeightSlider').max=imgH;
        $('tbSizeValue').max=maxW;
        $('tbHeightValue').max=imgH;
        if(parseInt($('tbSizeValue').value)>maxW){
            $('tbSizeSlider').value=maxW;$('tbSizeValue').value=maxW;
        }
        if(parseInt($('tbHeightValue').value)>imgH){
            $('tbHeightSlider').value=imgH;$('tbHeightValue').value=imgH;
        }
    }
}

/* ═══ Clamp number input on blur and sync slider ═══ */
function clampAndSyncInput(sliderId,inputId){
    var inp=$(inputId),slider=$(sliderId);
    var v=parseInt(inp.value);
    var mn=parseInt(inp.min)||20;
    var mx=parseInt(inp.max)||500;
    if(isNaN(v)||v<mn)v=mn;
    if(v>mx)v=mx;
    inp.value=v;slider.value=v;
    updateRegionOverlays();checkPointsAfterRegionChange();
    scheduleSave();
}

/* ═══ Region Center Management ═══ */
function resetRegionCenter(){
    var imgW=0,imgH=0;
    if(State.singleMode){imgW=State.sampleW;imgH=State.sampleH;}
    else{imgW=State.refW||State.sampleW;imgH=State.refH||State.sampleH;}
    State.regionCenterX=Math.round(imgW/2);
    State.regionCenterY=Math.round(imgH/2);
}

function getRegionBounds(){
    var shape=$('tbShape').value||'circle';
    var w=parseInt($('tbSizeValue').value)||100;
    var h=shape==='rectangle'?(parseInt($('tbHeightValue').value)||100):w;
    var cx=State.regionCenterX,cy=State.regionCenterY;
    return {shape:shape,cx:cx,cy:cy,w:w,h:h,
            x:Math.round(cx-w/2),y:Math.round(cy-h/2),
            radius:Math.round(w/2)};
}

/* ═══ Region Overlays on Viewer Images ═══ */
function initRegionOverlays(){
    /* Create canvas overlays on top of each viewer pane */
    createOverlayCanvas('refCanvas','refOverlay');
    createOverlayCanvas('sampleCanvas','sampleOverlay');

    /* Click on viewer canvas to set region center */
    $('refCanvas').addEventListener('mousedown',function(e){onViewerMouseDown(e,'ref');});
    $('sampleCanvas').addEventListener('mousedown',function(e){onViewerMouseDown(e,'sample');});

    /* Global pen drawing handlers */
    document.addEventListener('mousemove',_penMouseMove);
    document.addEventListener('mouseup',_penMouseUp);
}

function createOverlayCanvas(parentId,canvasId){
    var parent=$(parentId);
    var cv=document.createElement('canvas');
    cv.id=canvasId;
    cv.className='region-overlay-canvas';
    cv.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    parent.style.position='relative';
    parent.appendChild(cv);
}

function onViewerMouseDown(e,which){
    var imgEl=$(which+'Preview');
    var hasImage=imgEl&&imgEl.style.display!=='none';

    /* If no image loaded or fullImage mode, open file dialog */
    if(!hasImage||State.fullImage){
        $(which+'FileInput').click();
        return;
    }

    var shape=$('tbShape').value||'circle';

    /* ── Pen (freehand) mode ── */
    if(shape==='pen'){
        e.stopPropagation();e.preventDefault();
        var rect=imgEl.getBoundingClientRect();
        var scaleX=imgEl.naturalWidth/rect.width;
        var scaleY=imgEl.naturalHeight/rect.height;
        var px=Math.round((e.clientX-rect.left)*scaleX);
        var py=Math.round((e.clientY-rect.top)*scaleY);
        /* Start new drawing (clear previous) */
        State.penPoints=[{x:px,y:py}];
        State.penDrawing=true;State.penClosed=false;
        _penWhich=which;
        updateRegionOverlays();
        return;
    }

    /* If region drag is active, don't interfere */
    if(_regionDragging)return;

    /* Region mode — click outside the region to reposition center (drag inside handled by initRegionDrag) */
    var rect=imgEl.getBoundingClientRect();
    var scaleX=imgEl.naturalWidth/rect.width;
    var scaleY=imgEl.naturalHeight/rect.height;
    var px=(e.clientX-rect.left)*scaleX;
    var py=(e.clientY-rect.top)*scaleY;

    /* If click is inside region, let initRegionDrag handle it (drag mode) */
    if(isPointInRegion(Math.round(px),Math.round(py)))return;

    /* Click outside region → move center to this position */
    e.stopPropagation();e.preventDefault();
    State.regionCenterX=Math.round(Math.max(0,Math.min(imgEl.naturalWidth,px)));
    State.regionCenterY=Math.round(Math.max(0,Math.min(imgEl.naturalHeight,py)));
    clampRegionCenter();
    updateRegionOverlays();
    log(t('log.region.center.set')+': ('+State.regionCenterX+', '+State.regionCenterY+')','info');
    scheduleSave();
}
var _penWhich=null;
var PEN_CLOSE_DIST=15; /* pixel distance to auto-close the loop */

/* Global pen move/up handlers (attached once in initRegionOverlays) */
function _penMouseMove(e){
    if(!State.penDrawing||!_penWhich)return;
    var imgEl=$(_penWhich+'Preview');
    if(!imgEl)return;
    var rect=imgEl.getBoundingClientRect();
    var scaleX=imgEl.naturalWidth/rect.width;
    var scaleY=imgEl.naturalHeight/rect.height;
    var px=Math.round((e.clientX-rect.left)*scaleX);
    var py=Math.round((e.clientY-rect.top)*scaleY);
    /* Clamp to image bounds */
    px=Math.max(0,Math.min(imgEl.naturalWidth,px));
    py=Math.max(0,Math.min(imgEl.naturalHeight,py));
    State.penPoints.push({x:px,y:py});
    updateRegionOverlays();
}
function _penMouseUp(e){
    if(!State.penDrawing)return;
    State.penDrawing=false;
    if(State.penPoints.length<10){State.penPoints=[];State.penClosed=false;updateRegionOverlays();return;}
    /* Check if the path is closed (last point near first point) */
    var first=State.penPoints[0],last=State.penPoints[State.penPoints.length-1];
    var dx=first.x-last.x,dy=first.y-last.y;
    var dist=Math.sqrt(dx*dx+dy*dy);
    /* Use a threshold relative to image size */
    var imgW=State.refW||State.sampleW||1000;
    var threshold=Math.max(PEN_CLOSE_DIST,imgW*0.02);
    if(dist<=threshold){
        /* Close the path */
        State.penPoints.push({x:first.x,y:first.y});
        State.penClosed=true;
        updateRegionOverlays();
        log(t('pen.complete'),'success');
        scheduleSave();
    }else{
        /* Not closed — warn user */
        State.penClosed=false;
        showAlert(t('pen.not.closed'),t('pen.close.warning'),'✏️');
        /* Keep the drawing so user can see it, but mark as not closed */
        updateRegionOverlays();
    }
}

function clampRegionCenter(){
    var rb=getRegionBounds();
    var imgW=State.refW||State.sampleW, imgH=State.refH||State.sampleH;
    if(State.singleMode){imgW=State.sampleW;imgH=State.sampleH;}
    if(!imgW)return;
    var halfW=Math.round(rb.w/2),halfH=Math.round(rb.h/2);
    State.regionCenterX=Math.max(halfW,Math.min(imgW-halfW,State.regionCenterX));
    State.regionCenterY=Math.max(halfH,Math.min(imgH-halfH,State.regionCenterY));
}

function updateRegionOverlays(){
    drawOverlay('refCanvas','refOverlay','refPreview');
    drawOverlay('sampleCanvas','sampleOverlay','samplePreview');
}

function drawOverlay(parentId,canvasId,imgId){
    var cv=$(canvasId);
    if(!cv)return;
    var imgEl=$(imgId);
    if(!imgEl||imgEl.style.display==='none'||State.fullImage){
        cv.width=0;cv.height=0;return;
    }
    var rect=imgEl.getBoundingClientRect();
    var dpr=window.devicePixelRatio||1;
    cv.width=rect.width*dpr;cv.height=rect.height*dpr;
    cv.style.width=rect.width+'px';cv.style.height=rect.height+'px';
    cv.style.left=(imgEl.offsetLeft)+'px';
    cv.style.top=(imgEl.offsetTop)+'px';
    var ctx=cv.getContext('2d');
    ctx.scale(dpr,dpr);
    var scaleX=rect.width/imgEl.naturalWidth;
    var scaleY=rect.height/imgEl.naturalHeight;

    var shape=($('tbShape').value||'circle');

    /* ── Pen (freehand) mode ── */
    if(shape==='pen'){
        /* Make canvas interactive for pen drawing */
        cv.style.pointerEvents='auto';cv.style.cursor='crosshair';
        if(State.penPoints.length<2){
            /* No drawing yet — show hint overlay */
            ctx.fillStyle='rgba(0,0,0,0.15)';
            ctx.fillRect(0,0,rect.width,rect.height);
            ctx.font='bold 13px system-ui,-apple-system,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillStyle='rgba(0,120,212,0.9)';
            ctx.fillText(t('pen.draw.hint'),rect.width/2,rect.height/2);
            return;
        }
        var pts=State.penPoints;
        /* If closed, draw dimmed area outside polygon */
        if(State.penClosed&&pts.length>2){
            ctx.fillStyle='rgba(0,0,0,0.45)';
            ctx.fillRect(0,0,rect.width,rect.height);
            ctx.globalCompositeOperation='destination-out';
            ctx.fillStyle='#fff';
            ctx.beginPath();
            ctx.moveTo(pts[0].x*scaleX,pts[0].y*scaleY);
            for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i].x*scaleX,pts[i].y*scaleY);
            ctx.closePath();ctx.fill();
            ctx.globalCompositeOperation='source-over';
        }
        /* Draw the freehand path */
        ctx.strokeStyle=State.penClosed?'#0078d4':'#e74c3c';
        ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';
        if(!State.penClosed)ctx.setLineDash([6,4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x*scaleX,pts[0].y*scaleY);
        for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i].x*scaleX,pts[i].y*scaleY);
        if(State.penClosed)ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        /* Draw start point indicator (green dot) */
        ctx.fillStyle=State.penClosed?'#27ae60':'#e74c3c';
        ctx.beginPath();ctx.arc(pts[0].x*scaleX,pts[0].y*scaleY,5,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
        /* Status label */
        var statusText=State.penClosed?t('pen.complete'):(State.penDrawing?t('pen.drawing'):t('pen.not.closed'));
        ctx.font='bold 11px system-ui,-apple-system,sans-serif';
        ctx.textAlign='center';ctx.textBaseline='top';
        var tw2=ctx.measureText(statusText).width;
        var lx=rect.width/2,ly=rect.height-24;
        ctx.fillStyle=State.penClosed?'rgba(39,174,96,0.85)':'rgba(231,76,60,0.85)';
        var pd=5;
        ctx.beginPath();
        var bx=lx-tw2/2-pd,by=ly-2,bw=tw2+pd*2,bh=18;
        ctx.moveTo(bx+3,by);ctx.arcTo(bx+bw,by,bx+bw,by+bh,3);ctx.arcTo(bx+bw,by+bh,bx,by+bh,3);ctx.arcTo(bx,by+bh,bx,by,3);ctx.arcTo(bx,by,bx+bw,by,3);ctx.fill();
        ctx.fillStyle='#fff';ctx.fillText(statusText,lx,ly);
        return;
    }

    /* ── Standard shapes (circle / square / rectangle) ── */
    cv.style.pointerEvents='none';cv.style.cursor='';
    var rb=getRegionBounds();

    /* Draw dimmed area outside region */
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,rect.width,rect.height);

    /* Clear the region (make it visible) */
    ctx.globalCompositeOperation='destination-out';
    ctx.fillStyle='#fff';
    var cx=rb.cx*scaleX,cy=rb.cy*scaleY;
    var rw=rb.w*scaleX,rh=rb.h*scaleY;
    if(rb.shape==='circle'){
        var rad=rb.radius*Math.min(scaleX,scaleY);
        ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
    }else{
        ctx.fillRect(cx-rw/2,cy-rh/2,rw,rh);
    }

    /* Draw border around region */
    ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle='#0078d4';ctx.lineWidth=2;
    ctx.setLineDash([6,4]);
    if(rb.shape==='circle'){
        var rad2=rb.radius*Math.min(scaleX,scaleY);
        ctx.beginPath();ctx.arc(cx,cy,rad2,0,Math.PI*2);ctx.stroke();
    }else{
        ctx.strokeRect(cx-rw/2,cy-rh/2,rw,rh);
    }
    ctx.setLineDash([]);

    /* Draw center crosshair */
    ctx.strokeStyle='rgba(0,120,212,0.7)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(cx-8,cy);ctx.lineTo(cx+8,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,cy-8);ctx.lineTo(cx,cy+8);ctx.stroke();

    /* Draw dimension label below region */
    var dimText;
    if(rb.shape==='circle') dimText='\u2300 '+rb.w+' px';
    else if(rb.shape==='square') dimText=rb.w+' px';
    else dimText=rb.w+' \u00d7 '+rb.h+' px';
    ctx.font='bold 11px system-ui,-apple-system,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='top';
    var labelY=(rb.shape==='circle')?(cy+rb.radius*Math.min(scaleX,scaleY)+6):(cy+rh/2+6);
    var tw=ctx.measureText(dimText).width;
    ctx.fillStyle='rgba(0,102,204,0.85)';
    var pad=4;
    ctx.beginPath();
    var rx=cx-tw/2-pad,ry2=labelY-2,rw2=tw+pad*2,rh2=16;
    ctx.moveTo(rx+3,ry2);ctx.arcTo(rx+rw2,ry2,rx+rw2,ry2+rh2,3);ctx.arcTo(rx+rw2,ry2+rh2,rx,ry2+rh2,3);ctx.arcTo(rx,ry2+rh2,rx,ry2,3);ctx.arcTo(rx,ry2,rx+rw2,ry2,3);ctx.fill();
    ctx.fillStyle='#fff';
    ctx.fillText(dimText,cx,labelY);
}

/* Redraw overlays on window resize */
window.addEventListener('resize',function(){
    if(!State.fullImage)updateRegionOverlays();
});

/* ═══ Confirm / Alert Dialogs ═══ */
var _confirmCb=null;
function initDialogs(){
    $('confirmClose').addEventListener('click',function(){$('confirmDialog').style.display='none';});
    $('confirmNo').addEventListener('click',function(){$('confirmDialog').style.display='none';});
    $('confirmYes').addEventListener('click',function(){$('confirmDialog').style.display='none';if(_confirmCb)_confirmCb();});
    $('btnSendFeedback').addEventListener('click',sendFeedback);
    document.querySelectorAll('.dialog-overlay').forEach(function(ov){
        ov.addEventListener('mousedown',function(e){if(e.target===ov)ov.style.display='none';});
    });
}

function showConfirm(title,msg,icon,cb){
    $('confirmTitle').textContent=title;$('confirmMsg').textContent=msg;
    $('confirmIcon').textContent=icon||'⚠️';_confirmCb=cb;$('confirmDialog').style.display='';
}

function showAlert(title,msg,icon){
    $('alertTitle').textContent=title;$('alertMsg').textContent=msg;
    $('alertIcon').textContent=icon||'ℹ️';$('alertDialog').style.display='';
}

function confirmDelete(){
    if(!State.refFile&&!State.sampleFile)return;
    showConfirm(t('confirm.delete.title'),t('confirm.delete.msg'),'🗑️',doDeleteAll);
}

function doDeleteAll(){
    State.refFile=null;State.sampleFile=null;State.refDataUrl=null;State.sampleDataUrl=null;
    State.refW=0;State.refH=0;State.sampleW=0;State.sampleH=0;
    State.lastResult=null;State.manualPoints=[];State.randomPoints=[];
    State.penPoints=[];State.penDrawing=false;State.penClosed=false;
    $('refPreview').style.display='none';$('refEmpty').style.display='';
    $('samplePreview').style.display='none';$('sampleEmpty').style.display='';
    $('wsRefName').textContent=t('ws.ref.name');$('wsRefDims').textContent=t('ws.no.file');
    $('wsRefThumb').innerHTML=SVG_PH;$('wsRefCard').classList.remove('loaded');
    $('wsSampleName').textContent=t('ws.sample.name');$('wsSampleDims').textContent=t('ws.no.file');
    $('wsSampleThumb').innerHTML=SVG_PH;$('wsSampleCard').classList.remove('loaded');
    $('wsDownloads').innerHTML='<div class="ws-download-empty">'+t('ws.no.reports')+'</div>';
    $('resultsArea').innerHTML='<div class="results-empty">'+t('results.empty')+'</div>';
    updateRegionOverlays();updateSamplingUI();log(t('menu.delete.all'),'warn');updateUI();
    scheduleSave();
}

/* ═══ Feedback ═══ */
function sendFeedback(){
    var msg=$('fbMessage').value.trim();
    if(!msg){showAlert(t('fb.title'),t('feedback.empty'),'⚠️');return;}
    var anonCb=$('fbAnonymous');
    var isAnon=anonCb&&anonCb.checked;
    var payload={
        access_key:'5176da08-b0a1-4245-8fb0-4fbf75e8e6d0',
        subject:'SpectraMatch Feedback ('+$('fbType').value+') [Desktop]',
        message:msg,
        feedback_type:$('fbType').value,
        source:'desktop',
        anonymous:isAnon?'Yes':'No'
    };
    if(!isAnon){
        var n=$('fbName').value.trim();
        var e=$('fbEmail').value.trim();
        if(n)payload.from_name=n;
        if(e)payload.email=e;
        if(!n)payload.from_name='Anonymous User';
    }else{
        payload.from_name='Anonymous User';
    }
    var btn=$('btnSendFeedback');
    if(btn){btn.disabled=true;btn.style.opacity='0.6';}
    fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(payload)})
    .then(function(r){return r.json();})
    .then(function(data){
        if(data.success){
            showAlert(t('fb.title'),t('feedback.sent'),'✅');
            $('feedbackDialog').style.display='none';$('fbMessage').value='';
        }else{
            showAlert(t('fb.title'),t('feedback.fail'),'⚠️');
        }
    })
    .catch(function(){showAlert(t('fb.title'),t('feedback.network'),'⚠️');})
    .finally(function(){if(btn){btn.disabled=false;btn.style.opacity='';}});
}

/* ═══ Properties + Tabs ═══ */
function initPropertySections(){
    document.querySelectorAll('.prop-section-hdr').forEach(function(h){
        h.addEventListener('click',function(){this.parentElement.classList.toggle('open');});
    });
}

function initBottomTabs(){
    document.querySelectorAll('.btab').forEach(function(tab){
        tab.addEventListener('click',function(){
            document.querySelectorAll('.btab').forEach(function(t){t.classList.remove('active');});
            document.querySelectorAll('.btab-content').forEach(function(c){c.classList.remove('active');});
            this.classList.add('active');
            var tgt=this.getAttribute('data-btab');
            $('tab'+tgt.charAt(0).toUpperCase()+tgt.slice(1)).classList.add('active');
        });
    });
    $('btnClearConsole').addEventListener('click',function(){$('consoleOut').innerHTML='';log(t('log.console.cleared'),'info');});
}

/* ═══ Keyboard ═══ */
function initKeyboard(){
    document.addEventListener('keydown',function(e){
        if(e.key==='F5'){e.preventDefault();runAnalysis();}
        if(e.ctrlKey&&!e.shiftKey&&e.key==='o'){e.preventDefault();$('refFileInput').click();}
        if(e.ctrlKey&&e.shiftKey&&(e.key==='O'||e.key==='o')){e.preventDefault();$('sampleFileInput').click();}
        if(e.ctrlKey&&e.key==='d'){e.preventDefault();confirmDelete();}
        if(e.key==='Escape')document.querySelectorAll('.dialog-overlay').forEach(function(o){o.style.display='none';});
    });
}

/* ═══ Region Validation — is a point inside the current region? ═══ */
function isPointInRegion(px,py){
    if(State.fullImage)return true;
    var shape=$('tbShape').value||'circle';
    if(shape==='pen'){
        if(!State.penClosed||State.penPoints.length<4)return false;
        return _pointInPolygon(px,py,State.penPoints);
    }
    var rb=getRegionBounds();
    if(rb.shape==='circle'){
        var dx=px-rb.cx,dy=py-rb.cy;
        return(dx*dx+dy*dy)<=(rb.radius*rb.radius);
    }else{
        return px>=rb.x&&px<=(rb.x+rb.w)&&py>=rb.y&&py<=(rb.y+rb.h);
    }
}
/* Ray-casting point-in-polygon */
function _pointInPolygon(px,py,pts){
    var inside=false;
    for(var i=0,j=pts.length-1;i<pts.length;j=i++){
        var xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
        if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
}

/* ═══ Region Conflict Detection ═══ */
function checkPointsAfterRegionChange(){
    if(State.fullImage)return;
    if(State.manualPoints.length===0&&State.randomPoints.length===0)return;
    var invalid=0;
    State.manualPoints.forEach(function(p){if(!isPointInRegion(p.x,p.y))invalid++;});
    State.randomPoints.forEach(function(p){if(!isPointInRegion(p.x,p.y))invalid++;});
    if(invalid>0){
        showConfirm(t('region.changed'),
            invalid+t('region.points.outside.msg'),'⚠️',
            function(){State.manualPoints=[];State.randomPoints=[];updateSamplingUI();log(t('log.points.reset'),'warn');}
        );
    }
}

/* ═══ Sampling ═══ */
function initSampling(){
    $('btnSelectPoints').addEventListener('click',openPointSelector);
    $('btnCompleteRandom').addEventListener('click',function(){completeRandomly();});
    $('propPointsCount').addEventListener('change',function(){
        $('propRegionCount').value=this.value;
        updateSamplingUI();
    });
    $('propRegionCount').addEventListener('change',function(){
        $('propPointsCount').value=this.value;
        updateSamplingUI();
    });
    $('propSamplingMode').addEventListener('change',function(){
        State.samplingMode=this.value;
    });
    initCoordinateEntry();
}

function updateSamplingUI(){
    var total=parseInt($('propPointsCount').value)||5;
    var m=State.manualPoints.length,r=State.randomPoints.length;
    $('samplingBarManual').style.width=Math.min((m/total)*100,100)+'%';
    $('samplingBarRandom').style.width=Math.min((r/total)*100,100)+'%';
    $('samplingLabel').textContent=(m+r)+' / '+total;
    $('manualCountVal').textContent=m;$('randomCountVal').textContent=r;
    /* Keep dropdown in sync with actual state */
    $('propSamplingMode').value=State.samplingMode;
    renderCoordPointsList();
}

function syncSamplingMode(){
    var m=State.manualPoints.length;
    if(m>0){
        State.samplingMode='manual';
    }else{
        State.samplingMode='random';
    }
    $('propSamplingMode').value=State.samplingMode;
}

function completeRandomly(){
    var total=parseInt($('propPointsCount').value)||5;
    var m=State.manualPoints.length,needed=total-m;
    if(needed<=0){showAlert('Sampling','All points already selected.','ℹ️');return;}
    /* Generate random points WITHIN the region bounds (in pixel coords) */
    var imgW=State.refW||State.sampleW, imgH=State.refH||State.sampleH;
    if(State.singleMode){imgW=State.sampleW;imgH=State.sampleH;}
    if(!imgW||!imgH){showAlert('Error',t('error.no.both'),'⚠️');return;}
    State.randomPoints=[];
    var rb=getRegionBounds();
    var maxAttempts=needed*100,count=0;
    for(var i=0;i<needed&&count<maxAttempts;count++){
        var px,py;
        if(State.fullImage){
            px=Math.round(Math.random()*imgW);
            py=Math.round(Math.random()*imgH);
        }else{
            /* Generate within bounding box of region, then validate */
            px=rb.x+Math.round(Math.random()*rb.w);
            py=rb.y+Math.round(Math.random()*rb.h);
        }
        if(isPointInRegion(px,py)){
            State.randomPoints.push({x:px,y:py});i++;
        }
    }
    State.samplingMode=m>0?'hybrid':'random';
    updateSamplingUI();log(t('log.generated.random')+': '+State.randomPoints.length,'info');
    scheduleSave();
}

function initCoordinateEntry(){
    var addBtn=$('btnCoordAdd');
    var clearBtn=$('btnCoordClear');
    var xInput=$('propCoordX');
    var yInput=$('propCoordY');
    if(!addBtn||!xInput||!yInput)return;

    addBtn.addEventListener('click',function(e){
        e.preventDefault();
        addCoordPoint();
    });
    if(clearBtn){
        clearBtn.addEventListener('click',function(e){
            e.preventDefault();
            State.manualPoints=[];
            updateSamplingUI();
            showCoordFeedback(t('prop.coord.removed'),'warn');
            scheduleSave();
        });
    }
    [xInput,yInput].forEach(function(input){
        input.addEventListener('keydown',function(e){
            if(e.key==='Enter'){
                e.preventDefault();
                addCoordPoint();
            }
        });
    });
}

function showCoordFeedback(message, level){
    var el=$('propCoordFeedback');
    if(!el)return;
    el.textContent=message||'';
    el.className='prop-coord-feedback'+(level?' '+level:'');
}

function renderCoordPointsList(){
    var list=$('propCoordList');
    var clearBtn=$('btnCoordClear');
    if(!list)return;
    list.innerHTML='';
    if(clearBtn)clearBtn.style.display=State.manualPoints.length?'':'none';
    if(!State.manualPoints.length){
        list.innerHTML='<span class="prop-coord-empty">'+t('prop.coord.none')+'</span>';
        return;
    }
    State.manualPoints.forEach(function(point, index){
        var row=document.createElement('div');
        row.className='prop-coord-chip';
        row.innerHTML='<span class="prop-coord-chip-meta"><span class="prop-coord-chip-index">'+(index+1)+'</span><span class="prop-coord-chip-value">('+point.x+', '+point.y+')</span></span><button type="button" class="prop-coord-chip-remove" data-index="'+index+'" aria-label="Remove point">&times;</button>';
        var removeBtn=row.querySelector('.prop-coord-chip-remove');
        removeBtn.addEventListener('click',function(){
            var idx=parseInt(this.getAttribute('data-index'),10);
            if(isNaN(idx))return;
            State.manualPoints.splice(idx,1);
            syncSamplingMode();
            updateSamplingUI();
            showCoordFeedback(t('prop.coord.removed'),'warn');
            scheduleSave();
        });
        list.appendChild(row);
    });
}

function addCoordPoint(){
    var xInput=$('propCoordX');
    var yInput=$('propCoordY');
    if(!xInput||!yInput)return;
    if(State.singleMode){
        if(!State.sampleFile){showCoordFeedback(t('prop.coord.image.required'),'error');return;}
    }else if(!State.refFile||!State.sampleFile){
        showCoordFeedback(t('prop.coord.image.required'),'error');
        return;
    }

    var px=parseInt(xInput.value,10);
    var py=parseInt(yInput.value,10);
    var imgW=State.singleMode?State.sampleW:(State.refW||State.sampleW);
    var imgH=State.singleMode?State.sampleH:(State.refH||State.sampleH);
    if(isNaN(px)||isNaN(py)||px<0||py<0||!imgW||!imgH||px>=imgW||py>=imgH){
        showCoordFeedback(t('prop.coord.invalid'),'error');
        return;
    }
    if(!isPointInRegion(px,py)){
        showCoordFeedback(t('prop.coord.outside'),'error');
        return;
    }
    if(State.manualPoints.some(function(point){return point.x===px&&point.y===py;})){
        showCoordFeedback(t('prop.coord.duplicate'),'warn');
        return;
    }

    var total=parseInt($('propPointsCount').value)||5;
    if(State.manualPoints.length>=total)State.manualPoints.shift();
    State.manualPoints.push({x:px,y:py});
    var excess=(State.manualPoints.length+State.randomPoints.length)-total;
    while(excess>0&&State.randomPoints.length>0){State.randomPoints.pop();excess--;}
    State.samplingMode='manual';
    $('propSamplingMode').value='manual';
    xInput.value='';
    yInput.value='';
    updateSamplingUI();
    drawPSCanvases();
    showCoordFeedback(t('prop.coord.added'),'success');
    scheduleSave();
}

/* ═══ Point Selector ═══ */
function initPointSelector(){
    $('psClose').addEventListener('click',function(){
        $('pointSelectorDialog').style.display='none';
        syncSamplingMode();
    });
    $('psUndo').addEventListener('click',function(){
        if(State.manualPoints.length>0)State.manualPoints.pop();
        drawPSCanvases();updatePSUI();
    });
    $('psClear').addEventListener('click',function(){
        State.manualPoints=[];State.randomPoints=[];
        drawPSCanvases();updatePSUI();updateSamplingUI();
        syncSamplingMode();
    });
    $('psRandomFill').addEventListener('click',function(){
        completeRandomly();drawPSCanvases();updatePSUI();
    });
    $('psConfirm').addEventListener('click',function(){
        $('pointSelectorDialog').style.display='none';
        syncSamplingMode();
        updateSamplingUI();
        log(t('log.points.confirmed')+': '+(State.manualPoints.length+State.randomPoints.length),'success');
    });
    $('psRefCanvas').addEventListener('click',psClick);
    $('psSampleCanvas').addEventListener('click',psClick);
}

function openPointSelector(){
    if(State.singleMode&&!State.sampleFile){showAlert('Error',t('error.no.sample'),'⚠️');return;}
    if(!State.singleMode&&(!State.refFile||!State.sampleFile)){showAlert('Error',t('error.no.both'),'⚠️');return;}
    $('pointSelectorDialog').style.display='';
    /* Small delay to ensure dialog is rendered before measuring canvas */
    setTimeout(function(){drawPSCanvases();updatePSUI();},50);
}

function drawPSCanvases(){
    drawPC('psRefCanvas',State.refDataUrl);
    drawPC('psSampleCanvas',State.sampleDataUrl);
}

function drawPC(cid,dataUrl){
    if(!dataUrl)return;
    var c=$(cid),ctx=c.getContext('2d'),img=new Image();
    img.onload=function(){
        c.width=img.naturalWidth;c.height=img.naturalHeight;c.style.maxWidth='100%';
        ctx.drawImage(img,0,0);

        /* Draw region overlay on point selector canvas */
        if(!State.fullImage){
            var rb=getRegionBounds();

            /* Dim area OUTSIDE region using evenodd compound path */
            ctx.save();
            ctx.beginPath();
            ctx.rect(0,0,c.width,c.height);
            if(rb.shape==='circle'){
                ctx.moveTo(rb.cx+rb.radius,rb.cy);
                ctx.arc(rb.cx,rb.cy,rb.radius,0,Math.PI*2,true);
            }else{
                ctx.rect(rb.x+rb.w,rb.y,-rb.w,rb.h);
            }
            ctx.fillStyle='rgba(0,0,0,0.55)';
            ctx.fill('evenodd');
            ctx.restore();

            /* Glow + border around the active region */
            ctx.save();
            ctx.shadowColor='rgba(0,120,212,0.6)';
            ctx.shadowBlur=16;
            ctx.strokeStyle='#0078d4';
            ctx.lineWidth=2.5;
            if(rb.shape==='circle'){
                ctx.beginPath();ctx.arc(rb.cx,rb.cy,rb.radius,0,Math.PI*2);ctx.stroke();
            }else{
                ctx.strokeRect(rb.x,rb.y,rb.w,rb.h);
            }
            ctx.restore();

            /* Dashed inner accent */
            ctx.save();
            ctx.strokeStyle='rgba(255,255,255,0.35)';
            ctx.lineWidth=1;
            ctx.setLineDash([6,4]);
            if(rb.shape==='circle'){
                ctx.beginPath();ctx.arc(rb.cx,rb.cy,rb.radius-2,0,Math.PI*2);ctx.stroke();
            }else{
                ctx.strokeRect(rb.x+2,rb.y+2,rb.w-4,rb.h-4);
            }
            ctx.restore();
        }

        /* Draw manual points (green) */
        var pointRadius=Math.max(6,Math.min(12,c.width/80));
        State.manualPoints.forEach(function(p){
            ctx.beginPath();ctx.arc(p.x,p.y,pointRadius,0,Math.PI*2);
            ctx.fillStyle='#4ec9b0';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
            /* Point number label */
            ctx.fillStyle='#fff';ctx.font='bold '+Math.round(pointRadius)+'px sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(String(State.manualPoints.indexOf(p)+1),p.x,p.y);
        });
        /* Draw random points (blue) */
        State.randomPoints.forEach(function(p){
            ctx.beginPath();ctx.arc(p.x,p.y,pointRadius,0,Math.PI*2);
            ctx.fillStyle='#0078d4';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
        });
    };img.src=dataUrl;
}

function psClick(e){
    var c=e.target,rect=c.getBoundingClientRect();
    /* Convert display coords to natural image pixel coords */
    var scaleX=c.width/rect.width;
    var scaleY=c.height/rect.height;
    var px=Math.round((e.clientX-rect.left)*scaleX);
    var py=Math.round((e.clientY-rect.top)*scaleY);

    /* Validate point is within region */
    if(!isPointInRegion(px,py)){
        showAlert('Sampling',t('region.outside'),'⚠️');
        return;
    }

    var total=parseInt($('propPointsCount').value)||5;
    if(State.manualPoints.length>=total)State.manualPoints.shift();
    State.manualPoints.push({x:px,y:py});
    /* Remove random points if total exceeded */
    var excess=(State.manualPoints.length+State.randomPoints.length)-total;
    while(excess>0&&State.randomPoints.length>0){State.randomPoints.pop();excess--;}
    State.samplingMode='manual';
    $('propSamplingMode').value='manual';
    drawPSCanvases();updatePSUI();
}

function updatePSUI(){
    var total=parseInt($('propPointsCount').value)||5;
    var m=State.manualPoints.length,r=State.randomPoints.length;
    $('psBarManual').style.width=((m/total)*100)+'%';
    $('psBarRandom').style.width=((r/total)*100)+'%';
    $('psLabel').textContent=(m+r)+' / '+total;
    $('psManualCount').textContent=m;$('psRandomCount').textContent=r;
    updateSamplingUI();
}

/* ═══ Right Toolbar Collapse Helper ═══
   Toggles the .collapsed class on #tbRightTools so the right-side icons
   (Ready-to-Test → Reset) become a single "more" dropdown when Full Image
   mode is OFF (which expands the region controls and crowds the toolbar). */
function updateRightToolsCollapsed(){
    var rt=$('tbRightTools');if(!rt)return;
    /* Collapse only when Full Image is OFF */
    rt.classList.toggle('collapsed',!State.fullImage);
    /* Always close the popover when the layout flips */
    rt.classList.remove('show');
}

/* ═══ UI State ═══ */
function updateUI(){
    var hasRef=!!State.refFile,hasSample=!!State.sampleFile;
    var canRun=State.singleMode?hasSample:(hasRef&&hasSample);
    $('tbRun').disabled=!canRun||State.isProcessing;
    $('tbDelete').disabled=(!hasRef&&!hasSample)||State.isProcessing;
    $('sbMode').textContent=t('sb.mode')+': '+t(State.singleMode?'mode.single':'mode.dual');
    $('sbRegion').textContent=t('sb.region')+': '+(State.fullImage?t('tb.full.image'):t('sb.custom'));
    var ic=(hasRef?1:0)+(hasSample?1:0),it=State.singleMode?1:2;
    $('sbImages').textContent=t('sb.images')+': '+ic+'/'+it;
    if(State.isProcessing){
        $('wsStatusDot').className='ws-status-dot running';$('wsStatusText').textContent=t('sb.processing');
        $('sbIndicator').className='sb-indicator busy';$('sbStatus').textContent=t('sb.processing');
    }else if(canRun){
        $('wsStatusDot').className='ws-status-dot ready';$('wsStatusText').textContent=t('sb.ready');
        $('sbIndicator').className='sb-indicator ready';$('sbStatus').textContent=t('sb.ready');
    }else{
        $('wsStatusDot').className='ws-status-dot';$('wsStatusText').textContent=t('ws.idle');
        $('sbIndicator').className='sb-indicator';$('sbStatus').textContent=t('sb.ready');
    }
    $('refPane').style.display=State.singleMode?'none':'';
    /* Toggle crosshair cursor on viewer canvases when region mode active */
    var regionActive=!State.fullImage;
    $('refCanvas').classList.toggle('region-active',regionActive&&hasRef);
    $('sampleCanvas').classList.toggle('region-active',regionActive&&hasSample);
    updateReportSectionsForMode();
}

/* ═══ Disable report sections not available in Single Image mode ═══ */
var _savedDualChecks={};
var _savedTestIllChecks={};
function updateReportSectionsForMode(){
    /* Color sections NOT in Single Image report (require two images) */
    var colorOnlyIds=['rptColorSpaces','rptDiffMetrics','rptStats','rptVisualDiff'];
    /* All Pattern sections NOT in Single Image report */
    var patternIds=['rptEnableSsim','rptEnableGradient','rptEnablePhase','rptEnableStructural',
        'rptEnableFourier','rptEnableGlcm','rptGradBound','rptPhaseBound','rptSummary','rptConclusion','rptPatternRec'];
    var ids=colorOnlyIds.concat(patternIds);
    var isSingle=State.singleMode;
    ids.forEach(function(id){
        var el=$(id);
        if(!el)return;
        if(isSingle){
            if(!(id in _savedDualChecks)) _savedDualChecks[id]=el.checked;
            el.checked=false;
            el.disabled=true;
        }else{
            el.disabled=false;
            if(id in _savedDualChecks){el.checked=_savedDualChecks[id];delete _savedDualChecks[id];}
            else el.checked=true;
        }
        var lbl=el.closest('label');
        if(lbl) lbl.classList.toggle('disabled',isSingle);
    });
    /* Disable Test Illuminant checkboxes in Single Image mode */
    document.querySelectorAll('input[name="propTestIll"]').forEach(function(el){
        if(isSingle){
            if(!(el.value in _savedTestIllChecks)) _savedTestIllChecks[el.value]=el.checked;
            el.checked=false;
            el.disabled=true;
        }else{
            el.disabled=false;
            if(el.value in _savedTestIllChecks){el.checked=_savedTestIllChecks[el.value];delete _savedTestIllChecks[el.value];}
        }
        var lbl=el.closest('label');
        if(lbl) lbl.classList.toggle('disabled',isSingle);
    });
    /* Visually dim the Test Illuminants label */
    var tiLabel=document.querySelector('.prop-label-row[data-i18n="prop.test.illuminants"]');
    if(tiLabel) tiLabel.classList.toggle('disabled',isSingle);
}

/* ═══ Settings Collection ═══ */
function collectSettings(){
    function num(id,d){var e=$(id);if(!e)return d;var v=parseFloat(e.value);return isNaN(v)?d:v;}
    function val(id,d){var e=$(id);return e?e.value:d;}
    function chk(id,d){var e=$(id);return e?e.checked:d;}
    var ti=[];
    if(State.singleMode){
        ti=[val('propIlluminant','D65')];
    }else{
        document.querySelectorAll('input[name="propTestIll"]:checked').forEach(function(e){ti.push(e.value);});
    }
    /* Points are already in pixel coordinates */
    var pts=State.manualPoints.concat(State.randomPoints);
    return {
        operator:val('propOperator','Operator'),timezone_offset:num('propTimezone',3),
        report_lang:val('propReportLang','tr'),alignment_mode:val('propAlignmentMode','direct'),
        enable_color_unit:true,enable_pattern_unit:true,enable_pattern_repetition:false,
        color_scoring_method:val('propColorScoringMethod','delta_e'),
        color_threshold_pass:num('propColorPass',2.0),color_threshold_conditional:num('propColorCond',5.0),
        global_threshold_de:num('propColorGlobal',5.0),region_count:num('propRegionCount',5),
        csi_good:num('propCsiGood',2.0),csi_warn:num('propCsiWarn',5.0),
        primary_illuminant:val('propIlluminant','D65'),test_illuminants:ti,
        pattern_scoring_method:val('propPatternScoringMethod','all'),
        ssim_pass:num('propSsimPass',85.0),ssim_cond:num('propSsimCond',70.0),
        grad_pass:num('propGradPass',85.0),grad_cond:num('propGradCond',70.0),
        phase_pass:num('propPhasePass',85.0),phase_cond:num('propPhaseCond',70.0),
        structural_pass:num('propStructuralPass',85.0),structural_cond:num('propStructuralCond',70.0),
        global_pattern_threshold:num('propPatternGlobal',75.0),
        gradient_diff_sensitivity:num('propGradDiffSens',7),
        phase_diff_sensitivity:num('propPhaseDiffSens',7),
        gradient_boundary_sensitivity:num('propGradBoundSens',4),
        phase_boundary_sensitivity:num('propPhaseBoundSens',8),
        structural_sensitivity:num('propStructuralSens',10),
        section_color_spaces:chk('rptColorSpaces',true),section_rgb:chk('rptRgb',true),
        section_exec_summary:chk('rptExecSummary',true),section_visual_comparison:chk('rptVisualCompare',true),
        section_lab:chk('rptLab',true),section_xyz:chk('rptXyz',true),section_cmyk:chk('rptCmyk',true),
        section_diff_metrics:chk('rptDiffMetrics',true),section_stats:chk('rptStats',true),
        section_detailed_lab:chk('rptDetailedLab',true),section_visualizations:chk('rptVisualizations',true),
        section_spectral:chk('rptSpectral',true),section_visual_diff:chk('rptVisualDiff',true),
        enable_ssim:chk('rptEnableSsim',true),enable_gradient:chk('rptEnableGradient',true),
        enable_phase:chk('rptEnablePhase',true),enable_structural:chk('rptEnableStructural',true),
        enable_fourier:chk('rptEnableFourier',true),
        enable_glcm:chk('rptEnableGlcm',true),
        enable_grad_bound:chk('rptGradBound',true),enable_phase_bound:chk('rptPhaseBound',true),
        enable_summary:chk('rptSummary',true),enable_concl:chk('rptConclusion',true),enable_rec:chk('rptPatternRec',true),
        thresholds:{'pass':num('propColorPass',2.0),'conditional':num('propColorCond',5.0),
            'Structural SSIM':{'pass':num('propSsimPass',85.0),'conditional':num('propSsimCond',70.0)},
            'Gradient Similarity':{'pass':num('propGradPass',85.0),'conditional':num('propGradCond',70.0)},
            'Phase Correlation':{'pass':num('propPhasePass',85.0),'conditional':num('propPhaseCond',70.0)},
            'Structural Match':{'pass':num('propStructuralPass',85.0),'conditional':num('propStructuralCond',70.0)}},
        csi_thresholds:{'good':num('propCsiGood',2.0),'warn':num('propCsiWarn',5.0)},
        global_threshold:num('propPatternGlobal',75.0),
        sections:{'color_spaces':chk('rptColorSpaces',true),'rgb':chk('rptRgb',true),'lab':chk('rptLab',true),
            'exec_summary':chk('rptExecSummary',true),'visual_comparison':chk('rptVisualCompare',true),
            'xyz':chk('rptXyz',true),'cmyk':chk('rptCmyk',true),'diff_metrics':chk('rptDiffMetrics',true),
            'stats':chk('rptStats',true),'detailed_lab':chk('rptDetailedLab',true),
            'visualizations':chk('rptVisualizations',true),'spectral':chk('rptSpectral',true),
            'histograms':chk('rptHistograms',true),
            'visual_diff':chk('rptVisualDiff',true),'csi_under_heatmap':false,
            'illuminant_analysis':State.singleMode?false:chk('rptIlluminant',true),'recommendations_color':chk('rptRecommendations',true),
            'ssim':chk('rptEnableSsim',true),'gradient':chk('rptEnableGradient',true),
            'phase':chk('rptEnablePhase',true),'structural':chk('rptEnableStructural',true),
            'fourier':State.singleMode?true:chk('rptEnableFourier',true),
            'glcm':chk('rptEnableGlcm',true),
            'gradient_boundary':chk('rptGradBound',true),'phase_boundary':chk('rptPhaseBound',true),
            'recommendations_pattern':chk('rptPatternRec',true)},
        sampling_points:pts,sampling_mode:State.samplingMode,
        lab_thresholds:{dl:num('propLabDL',1.0),da:num('propLabDA',1.0),db:num('propLabDB',1.0),magnitude:num('propLabMag',2.0)}
    };
}

/* ═══ Region Data ═══ */
function buildRegionData(){
    if(State.fullImage)return{type:'full'};
    var shape=$('tbShape').value||'circle';
    /* Pen (freehand) mode */
    if(shape==='pen'){
        if(!State.penClosed||State.penPoints.length<10)return{type:'full'};
        /* Compute bounding box of polygon */
        var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        State.penPoints.forEach(function(p){
            if(p.x<minX)minX=p.x;if(p.y<minY)minY=p.y;
            if(p.x>maxX)maxX=p.x;if(p.y>maxY)maxY=p.y;
        });
        return{type:'polygon',use_crop:true,
               polygon:State.penPoints.map(function(p){return[p.x,p.y];}),
               x:Math.max(0,Math.round(minX)),y:Math.max(0,Math.round(minY)),
               width:Math.round(maxX-minX),height:Math.round(maxY-minY)};
    }
    var rb=getRegionBounds();
    var imgW=State.singleMode?State.sampleW:(State.refW||State.sampleW);
    if(!imgW)return{type:'full'};
    return{type:rb.shape==='circle'?'circle':'rect',
           x:Math.max(0,rb.x),y:Math.max(0,rb.y),
           width:rb.w,height:rb.h,use_crop:true};
}

/* ═══ Run Analysis ═══ */
function runAnalysis(){
    if(State.isProcessing)return;
    if(State.singleMode){
        if(!State.sampleFile){showAlert('Error',t('error.no.sample'),'⚠️');return;}
    }else{
        if(!State.refFile||!State.sampleFile){showAlert('Error',t('error.no.both'),'⚠️');return;}
    }
    State.isProcessing=true;updateUI();
    $('loadingTitle').textContent=t('loading.title');$('loadingText').textContent=t('loading.text');$('loadingOverlay').style.display='';
    log(t('log.starting.analysis'),'info');

    var settings=collectSettings(),regionData=buildRegionData();
    /* Log settings being sent to backend */
    var tzOff=settings.timezone_offset||0;
    var tzNow=new Date(Date.now()+(tzOff*3600000)+(new Date().getTimezoneOffset()*60000));
    var rid='SPEC_'+tzNow.getFullYear().toString().slice(-2)+('0'+(tzNow.getMonth()+1)).slice(-2)+('0'+tzNow.getDate()).slice(-2)+'_'+('0'+tzNow.getHours()).slice(-2)+('0'+tzNow.getMinutes()).slice(-2)+('0'+tzNow.getSeconds()).slice(-2);
    log('Report ID: '+rid+' | Operator: '+settings.operator+' | TZ: UTC'+(tzOff>=0?'+':'')+tzOff+' | Lang: '+settings.report_lang,'info');

    var fd=new FormData();
    if(State.singleMode){fd.append('sample_image',State.sampleFile);fd.append('single_image_mode','true');}
    else{fd.append('ref_image',State.refFile);fd.append('sample_image',State.sampleFile);fd.append('single_image_mode','false');}
    fd.append('settings',JSON.stringify(settings));fd.append('region_data',JSON.stringify(regionData));

    $('loadingText').textContent=t('loading.running');

    fetch('/api/analyze',{method:'POST',body:fd})
    .then(function(r){if(!r.ok)return r.json().then(function(d){throw new Error(d.error||'Server error');});return r.json();})
    .then(function(result){
        State.isProcessing=false;State.lastResult=result;$('loadingOverlay').style.display='none';updateUI();
        if(result.success){
            log(t('log.analysis.complete'),'success');
            if(!result.single_image_mode){
                log(t('color.score')+': '+(result.color_score||0).toFixed(1)+' | '+t('pattern.score')+': '+(result.pattern_score||0).toFixed(1)+' | '+t('overall.score')+': '+(result.overall_score||0).toFixed(1),'info');
                log(t('log.decision')+': '+(result.decision||'—'),result.decision==='ACCEPT'?'success':(result.decision==='REJECT'?'error':'warn'));
            }
            displayResults(result);switchToResultsTab();
        }else{log('Error: '+(result.error||'Unknown'),'error');}
    })
    .catch(function(err){State.isProcessing=false;$('loadingOverlay').style.display='none';updateUI();showAlert('Error',err.message,'❌');log('ERROR: '+err.message,'error');});
}

/* ═══ Display Results ═══ */
function displayResults(result){
    var area=$('resultsArea'),isSingle=!!result.single_image_mode;
    var imgs=result.images||{};
    var html='';

    /* ── Cover / Header ── */
    html+='<div class="rpt-cover">';
    html+='<div class="rpt-cover-brand"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><span>SpectraMatch</span></div>';
    if(result.report_id)html+='<div class="rpt-cover-id">'+result.report_id+'</div>';
    html+='<div class="rpt-cover-meta">';
    if(result.report_date)html+='<span>'+result.report_date+'</span>';
    if(result.report_time)html+='<span>'+result.report_time+'</span>';
    if(result.operator)html+='<span>'+result.operator+'</span>';
    html+='</div></div>';

    /* ── Collect active section flags from checkboxes ── */
    var sec={};
    function schk(id,d){var e=$(id);return e?e.checked:d;}
    sec.color_spaces=schk('rptColorSpaces',true);sec.rgb=schk('rptRgb',true);sec.lab=schk('rptLab',true);
    sec.xyz=schk('rptXyz',true);sec.cmyk=schk('rptCmyk',true);sec.diff_metrics=schk('rptDiffMetrics',true);
    sec.stats=schk('rptStats',true);sec.detailed_lab=schk('rptDetailedLab',true);
    sec.visualizations=schk('rptVisualizations',true);sec.spectral=schk('rptSpectral',true);
    sec.histograms=schk('rptHistograms',true);sec.visual_diff=schk('rptVisualDiff',true);
    sec.illuminant_analysis=schk('rptIlluminant',true);sec.recommendations=schk('rptRecommendations',true);
    sec.ssim=schk('rptEnableSsim',true);sec.gradient=schk('rptEnableGradient',true);
    sec.phase=schk('rptEnablePhase',true);sec.structural=schk('rptEnableStructural',true);
    sec.fourier=schk('rptEnableFourier',true);sec.glcm=schk('rptEnableGlcm',true);
    sec.grad_bound=schk('rptGradBound',true);sec.phase_bound=schk('rptPhaseBound',true);
    sec.summary=schk('rptSummary',true);sec.conclusion=schk('rptConclusion',true);sec.pattern_rec=schk('rptPatternRec',true);

    /* ── Score Cards ── */
    if(!isSingle){
        html+='<div class="rpt-scores">';
        var colorLabel=result.color_method_label?t('rpt.score.color')+' ('+formatColorMethodLabel(result.color_method_label)+')':t('rpt.score.color');
        var patternLabel=result.pattern_method_label?t('rpt.score.pattern')+' ('+result.pattern_method_label+')':t('rpt.score.pattern');
        var colorScoreOptions=result.color_score_format==='raw_value'
            ? {raw:true,displayValue:result.color_score,visualPct:result.color_score_visual_pct,status:result.color_status}
            : null;
        html+=scoreCard(colorLabel,result.color_score,'color',colorScoreOptions);
        html+=scoreCard(patternLabel,result.pattern_score,'pattern');
        html+=scoreCard(t('rpt.score.overall'),result.overall_score,'overall');
        html+='</div>';
    }

    /* ── Decision Badge ── */
    var dec=(result.decision||'COMPLETE').toUpperCase();
    var dc=dec==='ACCEPT'?'accept':(dec==='REJECT'?'reject':(dec==='COMPLETE'?'complete':'conditional'));
    var decKey='rpt.decision.'+dec.toLowerCase();
    var decLabel=t(decKey)!==decKey?t(decKey):dec;
    html+='<div class="rpt-decision-row"><span class="result-decision '+dc+'">'+decLabel+'</span></div>';

    /* ── Download Buttons ── */
    html+='<div class="rpt-downloads">';
    if(result.pdf_url)html+=dlLink(result.pdf_url+'?fn='+encodeURIComponent(result.fn_full||'Report.pdf'),t('rpt.dl.full'),result.fn_full||'Report.pdf');
    if(result.color_report_url)html+=dlLink(result.color_report_url+'?fn='+encodeURIComponent(result.fn_color||'Color.pdf'),t('rpt.dl.color'),result.fn_color||'Color.pdf');
    if(result.pattern_report_url)html+=dlLink(result.pattern_report_url+'?fn='+encodeURIComponent(result.fn_pattern||'Pattern.pdf'),t('rpt.dl.pattern'),result.fn_pattern||'Pattern.pdf');
    if(result.receipt_url)html+=dlLink(result.receipt_url+'?fn='+encodeURIComponent(result.fn_receipt||'Receipt.pdf'),t('rpt.dl.receipt'),result.fn_receipt||'Receipt.pdf');
    html+='</div>';

    /* ── Detailed Results (collapsible) ── */
    html+='<div class="rpt-details">';

    if(!isSingle){

        /* ══════════════════════════════════════
           REPORT SUMMARY — expanded by default
           ══════════════════════════════════════ */
        html+=collapsibleStart('summary-detail',t('rpt.report.summary'),iconSvg('summary'));
        html+='<div class="rpt-summary-grid">';
        /* Scoring methods */
        html+='<div class="rpt-summary-card">';
        html+='<div class="rpt-summary-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div>';
        html+='<div class="rpt-summary-body"><div class="rpt-summary-title">'+t('rpt.color.scoring.label')+'</div>';
        html+='<div class="rpt-summary-val">'+formatColorMethodLabel(result.color_method_label||'DELTAE2000')+'</div></div></div>';
        html+='<div class="rpt-summary-card">';
        html+='<div class="rpt-summary-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>';
        html+='<div class="rpt-summary-body"><div class="rpt-summary-title">'+t('rpt.pattern.scoring.label')+'</div>';
        html+='<div class="rpt-summary-val">'+(result.pattern_method_label||'All (Average)')+'</div></div></div>';
        /* CSI */
        if(result.csi_value!==undefined){
            var csiStatus=(result.csi_details&&result.csi_details.status)||'';
            var csiCls=csiStatus==='PASS'?'good':(csiStatus==='CONDITIONAL'?'warn':'bad');
            html+='<div class="rpt-summary-card">';
            html+='<div class="rpt-summary-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>';
            html+='<div class="rpt-summary-body"><div class="rpt-summary-title">'+t('rpt.csi.label')+'</div>';
            html+='<div class="rpt-summary-val '+csiCls+'">'+result.csi_value.toFixed(4)+'</div></div></div>';
        }
        /* Mean ΔE */
        if(result.mean_de00!==undefined){
            var deCls=result.mean_de00<=2?'good':(result.mean_de00<=5?'warn':'bad');
            html+='<div class="rpt-summary-card">';
            html+='<div class="rpt-summary-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>';
            html+='<div class="rpt-summary-body"><div class="rpt-summary-title">'+t('rpt.mean.de2000')+'</div>';
            html+='<div class="rpt-summary-val '+deCls+'">'+result.mean_de00.toFixed(4)+'</div></div></div>';
        }
        /* Report sizes */
        if(result.report_size){
            html+='<div class="rpt-summary-card">';
            html+='<div class="rpt-summary-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
            html+='<div class="rpt-summary-body"><div class="rpt-summary-title">'+t('rpt.report.size.label')+'</div>';
            html+='<div class="rpt-summary-val">'+result.report_size+'</div></div></div>';
        }
        /* Structural change */
        var sm=result.structural_meta;
        if(sm&&sm.change_percentage!==undefined){
            var chCls=sm.change_percentage<=1?'good':(sm.change_percentage<=5?'warn':'bad');
            html+='<div class="rpt-summary-card">';
            html+='<div class="rpt-summary-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>';
            html+='<div class="rpt-summary-body"><div class="rpt-summary-title">'+t('rpt.structural.change')+'</div>';
            html+='<div class="rpt-summary-val '+chCls+'">'+sm.change_percentage.toFixed(2)+'%</div></div></div>';
        }
        html+='</div>';

        /* Color Averages comparison */
        var ca=result.color_averages;
        if(ca&&ca.ref_rgb&&ca.sam_rgb){
            html+='<div class="rpt-section-title">'+t('rpt.color.comparison')+'</div>';
            html+='<div class="rpt-color-compare">';
            html+='<div class="rpt-swatch-block">';
            html+='<div class="rpt-swatch" style="background:rgb('+ca.ref_rgb[0]+','+ca.ref_rgb[1]+','+ca.ref_rgb[2]+')"></div>';
            html+='<div class="rpt-swatch-label">'+t('rpt.reference')+'</div>';
            html+='<div class="rpt-swatch-info">RGB: '+ca.ref_rgb[0]+', '+ca.ref_rgb[1]+', '+ca.ref_rgb[2]+'</div>';
            if(ca.ref_lab)html+='<div class="rpt-swatch-info">L*a*b*: '+ca.ref_lab[0]+', '+ca.ref_lab[1]+', '+ca.ref_lab[2]+'</div>';
            html+='</div>';
            html+='<div class="rpt-color-arrow">\u2194</div>';
            html+='<div class="rpt-swatch-block">';
            html+='<div class="rpt-swatch" style="background:rgb('+ca.sam_rgb[0]+','+ca.sam_rgb[1]+','+ca.sam_rgb[2]+')"></div>';
            html+='<div class="rpt-swatch-label">'+t('rpt.sample')+'</div>';
            html+='<div class="rpt-swatch-info">RGB: '+ca.sam_rgb[0]+', '+ca.sam_rgb[1]+', '+ca.sam_rgb[2]+'</div>';
            if(ca.sam_lab)html+='<div class="rpt-swatch-info">L*a*b*: '+ca.sam_lab[0]+', '+ca.sam_lab[1]+', '+ca.sam_lab[2]+'</div>';
            html+='</div>';
            html+='</div>';
        }

        html+=collapsibleEnd();

        /* ══════════════════════════════════════
           COLOR ANALYSIS SECTION — expanded
           ══════════════════════════════════════ */
        html+=collapsibleStart('color-detail',t('rpt.color.analysis'),iconSvg('color'));

        /* Color key metrics row */
        html+='<div class="rpt-kpi-row">';
        if(result.mean_de00!==undefined){
            var mde=result.mean_de00,cSt=result.color_status||'';
            var cStCls=cSt==='PASS'?'good':(cSt==='FAIL'?'bad':'warn');
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.mean.de00')+'</span><span class="rpt-kpi-value">'+mde.toFixed(4)+'</span></div>';
            if(result.csi_value!==undefined){
                var csiStatus2=(result.csi_details&&result.csi_details.status)||'';
                var csiCls2=csiStatus2==='PASS'?'good':(csiStatus2==='CONDITIONAL'?'warn':'bad');
                html+='<div class="rpt-kpi"><span class="rpt-kpi-label">CSI</span><span class="rpt-kpi-value '+csiCls2+'">'+result.csi_value.toFixed(4)+'</span></div>';
            }
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.method')+'</span><span class="rpt-kpi-value">'+formatColorMethodLabel(result.color_method_label||'DELTAE2000')+'</span></div>';
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.status')+'</span><span class="rpt-status-badge '+cStCls+'">'+cSt+'</span></div>';
        }
        html+='</div>';
        if(result.color_method_label==='DELTAE2000'){
            html+='<div class="rpt-info-note">ℹ️ '+t('rpt.deltaep2000.note')+'</div>';
        }

        if(sec.diff_metrics&&result.color_regions&&result.color_regions.length){
            html+='<div class="rpt-section-title">'+t('rpt.regional.color.metrics')+'</div>';
            html+='<table class="rpt-table"><thead><tr><th>#</th><th>'+t('rpt.position')+'</th><th>\u0394E76</th><th>\u0394E94</th><th>\u0394E00</th><th>'+t('rpt.status')+'</th><th>'+t('rpt.ref.lab')+'</th><th>'+t('rpt.sam.lab')+'</th></tr></thead><tbody>';
            result.color_regions.forEach(function(r){
                var sc=r.status==='PASS'?'good':(r.status==='FAIL'?'bad':'warn');
                var refC='rgb('+r.ref_rgb[0]+','+r.ref_rgb[1]+','+r.ref_rgb[2]+')';
                var samC='rgb('+r.sam_rgb[0]+','+r.sam_rgb[1]+','+r.sam_rgb[2]+')';
                html+='<tr><td>'+r.id+'</td><td>('+r.pos[0]+', '+r.pos[1]+')</td>';
                html+='<td>'+r.de76.toFixed(2)+'</td><td>'+r.de94.toFixed(2)+'</td>';
                html+='<td class="'+sc+'">'+r.de00.toFixed(2)+'</td>';
                html+='<td><span class="rpt-status-badge '+sc+'">'+r.status+'</span></td>';
                html+='<td><span class="rpt-color-chip" style="background:'+refC+'"></span>'+r.ref_lab[0].toFixed(1)+', '+r.ref_lab[1].toFixed(1)+', '+r.ref_lab[2].toFixed(1)+'</td>';
                html+='<td><span class="rpt-color-chip" style="background:'+samC+'"></span>'+r.sam_lab[0].toFixed(1)+', '+r.sam_lab[1].toFixed(1)+', '+r.sam_lab[2].toFixed(1)+'</td></tr>';
            });
            html+='</tbody></table>';
        }

        /* ΔE Summary Statistics */
        if(sec.stats){
            var deStats=result.de_statistics;
            if(deStats&&(deStats.de76||deStats.de94||deStats.de00)){
                html+='<div class="rpt-section-title">'+t('rpt.de.summary.stats')+'</div>';
                html+='<table class="rpt-table"><thead><tr><th>'+t('rpt.metric')+'</th><th>'+t('rpt.average')+'</th><th>'+t('rpt.std.dev')+'</th><th>'+t('rpt.min')+'</th><th>'+t('rpt.max')+'</th></tr></thead><tbody>';
                if(deStats.de76)html+='<tr><td>\u0394E76</td><td>'+deStats.de76.mean.toFixed(4)+'</td><td>'+deStats.de76.std.toFixed(4)+'</td><td>'+deStats.de76.min.toFixed(4)+'</td><td>'+deStats.de76.max.toFixed(4)+'</td></tr>';
                if(deStats.de94)html+='<tr><td>\u0394E94</td><td>'+deStats.de94.mean.toFixed(4)+'</td><td>'+deStats.de94.std.toFixed(4)+'</td><td>'+deStats.de94.min.toFixed(4)+'</td><td>'+deStats.de94.max.toFixed(4)+'</td></tr>';
                if(deStats.de00){
                    var de00C=deStats.de00.mean<=2?'good':(deStats.de00.mean<=5?'warn':'bad');
                    html+='<tr style="background:#f0fdf4"><td><strong>\u0394E2000</strong></td><td class="'+de00C+'"><strong>'+deStats.de00.mean.toFixed(4)+'</strong></td><td>'+deStats.de00.std.toFixed(4)+'</td><td>'+deStats.de00.min.toFixed(4)+'</td><td>'+deStats.de00.max.toFixed(4)+'</td></tr>';
                }
                html+='</tbody></table>';
            }
        }

        /* Illuminant Analysis */
        if(sec.illuminant_analysis&&result.illuminant_data&&result.illuminant_data.length){
            html+='<div class="rpt-section-title">'+t('rpt.illuminant.analysis')+'</div>';
            html+='<table class="rpt-table"><thead><tr><th>'+t('rpt.illuminant.analysis')+'</th><th>'+t('rpt.mean.de00')+'</th><th>CSI</th><th>'+t('rpt.status')+'</th></tr></thead><tbody>';
            result.illuminant_data.forEach(function(ill){
                var iSc=ill.status==='PASS'?'good':(ill.status==='FAIL'?'bad':'warn');
                html+='<tr><td>'+ill.illuminant+'</td><td>'+ill.mean_de00.toFixed(4)+'</td><td>'+ill.csi.toFixed(2)+'%</td>';
                html+='<td><span class="rpt-status-badge '+iSc+'">'+ill.status+'</span></td></tr>';
            });
            html+='</tbody></table>';
        }

        /* Color Visualization Images */
        if(sec.visualizations){
            var colorImgs=[];
            if(sec.visual_diff)colorImgs.push({key:'heatmap',title:t('rpt.de.heatmap'),caption:t('rpt.de.heatmap.caption')});
            if(sec.spectral)colorImgs.push({key:'spectral',title:t('rpt.spectral.dist'),caption:t('rpt.spectral.dist.caption')});
            if(sec.histograms)colorImgs.push({key:'histograms',title:t('rpt.rgb.histograms'),caption:t('rpt.rgb.histograms.caption')});
            if(sec.detailed_lab)colorImgs.push({key:'lab_scatter',title:t('rpt.lab.scatter'),caption:t('rpt.lab.scatter.caption')});
            if(sec.detailed_lab)colorImgs.push({key:'lab_bars',title:t('rpt.lab.bars'),caption:t('rpt.lab.bars.caption')});
            if(colorImgs.length)html+=renderImageGallery(imgs,colorImgs);
        }

        html+=collapsibleEnd();

        /* ══════════════════════════════════════
           PATTERN ANALYSIS SECTION — only if any pattern method enabled
           ══════════════════════════════════════ */
        var anyPattern=sec.ssim||sec.gradient||sec.phase||sec.structural;
        if(anyPattern){
        html+=collapsibleStart('pattern-detail',t('rpt.pattern.analysis'),iconSvg('pattern'));

        /* Pattern key metrics row */
        html+='<div class="rpt-kpi-row">';
        if(result.pattern_composite!==undefined){
            var pComp=result.pattern_composite,pSt=result.pattern_final_status||'';
            var pStCls=pSt==='PASS'?'good':(pSt==='FAIL'?'bad':'warn');
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.composite')+'</span><span class="rpt-kpi-value">'+pComp.toFixed(1)+'%</span></div>';
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.method')+'</span><span class="rpt-kpi-value">'+(result.pattern_method_label||'All')+'</span></div>';
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.status')+'</span><span class="rpt-status-badge '+pStCls+'">'+pSt+'</span></div>';
        }
        var sm2=result.structural_meta;
        if(sec.structural&&sm2&&sm2.verdict){
            var svCls=sm2.similarity_score>=99?'good':(sm2.similarity_score>=95?'warn':'bad');
            html+='<div class="rpt-kpi"><span class="rpt-kpi-label">'+t('rpt.structural.label')+'</span><span class="rpt-kpi-value '+svCls+'">'+sm2.similarity_score.toFixed(1)+'%</span></div>';
        }
        html+='</div>';

        if(result.pattern_scores){
            html+='<div class="rpt-section-title">'+t('rpt.individual.method.scores')+'</div>';
            var ps=result.pattern_scores;
            html+='<div class="rpt-pattern-grid">';
            for(var k in ps){
                var pv=ps[k],pc=pv>=75?'good':(pv>=50?'warn':'bad');
                html+='<div class="rpt-pattern-card"><div class="rpt-pattern-name">'+k+'</div><div class="rpt-pattern-val '+pc+'">'+pv.toFixed(1)+'%</div><div class="rpt-mini-bar"><div class="rpt-mini-fill '+pc+'" style="width:'+Math.min(100,pv)+'%"></div></div></div>';
            }
            html+='</div>';
        }

        /* Structural diff metadata */
        if(sec.structural&&sm2&&sm2.verdict){
            html+='<div class="rpt-section-title">'+t('rpt.structural.difference')+'</div>';
            html+='<div class="rpt-stat-row"><span class="rpt-stat-label">'+t('rpt.similarity.score')+'</span><span class="rpt-stat-value">'+sm2.similarity_score.toFixed(2)+'%</span></div>';
            html+='<div class="rpt-stat-row"><span class="rpt-stat-label">'+t('rpt.change.percentage')+'</span><span class="rpt-stat-value">'+(sm2.change_percentage!==undefined?sm2.change_percentage.toFixed(4)+'%':'\u2014')+'</span></div>';
            html+='<div class="rpt-stat-row"><span class="rpt-stat-label">'+t('rpt.verdict')+'</span><span class="rpt-status-badge '+(sm2.similarity_score>=99?'good':(sm2.similarity_score>=95?'warn':'bad'))+'">'+sm2.verdict+'</span></div>';
        }

        /* Pattern Visualization Images — filtered by enabled methods */
        var diffMaps=[];
        if(sec.ssim)diffMaps.push({key:'structural_ssim',title:t('rpt.ssim.map'),caption:t('rpt.ssim.map.caption')});
        if(sec.gradient)diffMaps.push({key:'gradient_similarity',title:t('rpt.gradient.map'),caption:t('rpt.gradient.map.caption')});
        if(sec.phase)diffMaps.push({key:'phase_correlation',title:t('rpt.phase.map'),caption:t('rpt.phase.map.caption')});
        if(diffMaps.length){
            html+='<div class="rpt-section-title">'+t('rpt.difference.maps')+'</div>';
            html+=renderImageGallery(imgs,diffMaps);
        }

        var boundImgs=[];
        if(sec.grad_bound){
            boundImgs.push({key:'gradient_boundary',title:t('rpt.gradient.boundary'),caption:t('rpt.gradient.boundary.caption')});
            boundImgs.push({key:'gradient_filled',title:t('rpt.gradient.filled'),caption:t('rpt.gradient.filled.caption')});
        }
        if(sec.phase_bound){
            boundImgs.push({key:'phase_boundary',title:t('rpt.phase.boundary'),caption:t('rpt.phase.boundary.caption')});
            boundImgs.push({key:'phase_filled',title:t('rpt.phase.filled'),caption:t('rpt.phase.filled.caption')});
        }
        if(boundImgs.length){
            html+='<div class="rpt-section-title">'+t('rpt.boundary.detection')+'</div>';
            html+=renderImageGallery(imgs,boundImgs);
        }

        if(sec.structural){
            html+='<div class="rpt-section-title">'+t('rpt.structural.analysis')+'</div>';
            html+=renderImageGallery(imgs,[
                {key:'structural_subplot',title:t('rpt.multi.method'),caption:t('rpt.multi.method.caption')},
                {key:'structural_pure',title:t('rpt.pure.diff'),caption:t('rpt.pure.diff.caption')}
            ]);
        }

        html+=collapsibleEnd();
        } /* end anyPattern */

        /* ══════════════════════════════════════
           TEXTURE & FREQUENCY ANALYSIS — filtered
           ══════════════════════════════════════ */
        var textureImgs=[];
        if(sec.fourier&&imgs.fourier_spectrum)textureImgs.push({key:'fourier_spectrum',title:t('rpt.fourier.fft'),caption:t('rpt.fourier.fft.caption')});
        if(sec.glcm&&imgs.glcm_heatmap)textureImgs.push({key:'glcm_heatmap',title:t('rpt.glcm.heatmap'),caption:t('rpt.glcm.heatmap.caption')});
        if(textureImgs.length){
            html+=collapsibleStart('texture-detail',t('rpt.texture.frequency'),iconSvg('texture'));
            html+=renderImageGallery(imgs,textureImgs);
            html+=collapsibleEnd();
        }

    } else {
        /* ══════════════════════════════════════
           SINGLE IMAGE SECTION — expanded
           ══════════════════════════════════════ */
        html+=collapsibleStart('single-detail',t('rpt.single.image.analysis'),iconSvg('single'));
        html+='<div class="rpt-stat-row"><span class="rpt-stat-label">'+t('rpt.mode.label')+'</span><span class="rpt-stat-value">'+t('rpt.single.image.mode')+'</span></div>';

        var singleImgs=[];
        if(sec.histograms)singleImgs.push({key:'histogram_single',title:t('rpt.histogram.single'),caption:t('rpt.histogram.single.caption')});
        if(sec.spectral)singleImgs.push({key:'spectral_single',title:t('rpt.spectral.single'),caption:t('rpt.spectral.single.caption')});
        if(sec.fourier)singleImgs.push({key:'fourier_single',title:t('rpt.fourier.single'),caption:t('rpt.fourier.single.caption')});
        if(singleImgs.length)html+=renderImageGallery(imgs,singleImgs);
        html+=collapsibleEnd();
    }

    html+='</div>'; /* close rpt-details */

    area.innerHTML=html;

    /* Wire collapsible toggles */
    area.querySelectorAll('.rpt-collapse-hdr').forEach(function(hdr){
        hdr.addEventListener('click',function(){
            var body=this.nextElementSibling;
            var icon=this.querySelector('.rpt-collapse-icon');
            var isOpen=body.style.display!=='none';
            body.style.display=isOpen?'none':'';
            if(icon)icon.style.transform=isOpen?'rotate(0deg)':'rotate(90deg)';
            this.classList.toggle('open',!isOpen);
        });
    });

    /* Wire image lightbox */
    area.querySelectorAll('.rpt-img-thumb').forEach(function(img){
        img.addEventListener('click',function(){openLightbox(this.src,this.alt);});
    });

    /* Workspace downloads */
    var dl=$('wsDownloads'),dh='';
    if(result.pdf_url)dh+=wsLink(result.pdf_url+'?fn='+encodeURIComponent(result.fn_full||'Report.pdf'),result.fn_full||'Full Report');
    if(result.color_report_url)dh+=wsLink(result.color_report_url+'?fn='+encodeURIComponent(result.fn_color||'Color.pdf'),result.fn_color||'Color Report');
    if(result.pattern_report_url)dh+=wsLink(result.pattern_report_url+'?fn='+encodeURIComponent(result.fn_pattern||'Pattern.pdf'),result.fn_pattern||'Pattern Report');
    if(result.receipt_url)dh+=wsLink(result.receipt_url+'?fn='+encodeURIComponent(result.fn_receipt||'Receipt.pdf'),result.fn_receipt||'Receipt');
    dl.innerHTML=dh||'<div class="ws-download-empty">'+t('ws.no.reports')+'</div>';
}

/* ── Render a gallery of images from URLs ── */
function renderImageGallery(imgs,defs){
    var hasAny=false;
    for(var i=0;i<defs.length;i++){if(imgs[defs[i].key]){hasAny=true;break;}}
    if(!hasAny)return '';
    var h='<div class="rpt-gallery">';
    for(var i=0;i<defs.length;i++){
        var d=defs[i],url=imgs[d.key];
        if(!url)continue;
        h+='<div class="rpt-gallery-item">';
        h+='<div class="rpt-gallery-title">'+d.title+'</div>';
        h+='<img class="rpt-img-thumb" src="'+url+'" alt="'+d.title+'" loading="lazy">';
        h+='<div class="rpt-gallery-caption">'+d.caption+'</div>';
        h+='</div>';
    }
    h+='</div>';
    return h;
}

/* ── Lightbox ── */
function openLightbox(src,alt){
    var existing=document.getElementById('rptLightbox');
    if(existing)existing.remove();
    var lb=document.createElement('div');
    lb.id='rptLightbox';lb.className='rpt-lightbox';
    lb.innerHTML='<div class="rpt-lb-backdrop"></div><div class="rpt-lb-content"><div class="rpt-lb-close">&times;</div><img src="'+src+'" alt="'+(alt||'')+'">'+(alt?'<div class="rpt-lb-label">'+alt+'</div>':'')+'</div>';
    document.body.appendChild(lb);
    lb.querySelector('.rpt-lb-backdrop').addEventListener('click',function(){lb.remove();});
    lb.querySelector('.rpt-lb-close').addEventListener('click',function(){lb.remove();});
    document.addEventListener('keydown',function onEsc(e){if(e.key==='Escape'){lb.remove();document.removeEventListener('keydown',onEsc);}});
}

/* ── Helper icons ── */
function iconSvg(type){
    if(type==='color')return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>';
    if(type==='pattern')return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>';
    if(type==='summary')return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    if(type==='texture')return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 3l18 18"/><path d="M21 3L3 21"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
}

function scoreCard(label,score,type,options){
    options=options||{};
    var displayValue=Number(options.displayValue!==undefined?options.displayValue:(score||0));
    var pct=Number(options.visualPct!==undefined?options.visualPct:(score||0));
    var decimals=options.raw?2:1;
    if(!isFinite(displayValue))displayValue=0;
    if(!isFinite(pct))pct=0;
    pct=Math.min(100,Math.max(0,pct));
    var status=String(options.status||'').toUpperCase();
    var cls=status==='PASS'?'good':(status==='CONDITIONAL'?'warn':(status==='FAIL'?'bad':(pct>=75?'good':(pct>=50?'warn':'bad'))));
    var s=displayValue.toFixed(decimals);
    return '<div class="rpt-score-card '+type+'"><div class="rpt-score-label">'+label+'</div><div class="rpt-score-value '+cls+'">'+s+'</div><div class="rpt-score-bar"><div class="rpt-score-fill '+cls+'" style="width:'+pct+'%"></div></div></div>';
}

function dlLink(url,label,fileName){
    return '<a class="rpt-dl-btn" href="javascript:void(0)" onclick="Desktop.saveAs(\x27'+url+'\x27,\x27'+fileName+'\x27)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'+label+'</a>';
}

function wsLink(url,label){
    var fn=label.indexOf('.pdf')>=0?label:label.replace(/\s+/g,'_')+'.pdf';
    return '<a class="ws-dl-btn" href="javascript:void(0)" onclick="Desktop.saveAs(\x27'+url+'\x27,\x27'+fn+'\x27)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'+label+'</a>';
}

function collapsibleStart(id,title,icon){
    return '<div class="rpt-collapse" id="'+id+'"><div class="rpt-collapse-hdr">'+
        '<svg class="rpt-collapse-icon" width="10" height="10" viewBox="0 0 10 10"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'+
        (icon||'')+' <span>'+title+'</span></div><div class="rpt-collapse-body" style="display:none">';
}
function collapsibleStartOpen(id,title,icon){
    return '<div class="rpt-collapse" id="'+id+'"><div class="rpt-collapse-hdr open">'+
        '<svg class="rpt-collapse-icon" width="10" height="10" viewBox="0 0 10 10" style="transform:rotate(90deg)"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'+
        (icon||'')+' <span>'+title+'</span></div><div class="rpt-collapse-body">';
}
function collapsibleEnd(){
    return '</div></div>';
}


function switchToResultsTab(){
    document.querySelectorAll('.btab').forEach(function(t){t.classList.remove('active');});
    document.querySelectorAll('.btab-content').forEach(function(c){c.classList.remove('active');});
    document.querySelector('.btab[data-btab="results"]').classList.add('active');
    $('tabResults').classList.add('active');
}

/* ═══ Reset Settings ═══ */
function resetSettings(){
    $('propOperator').value='Operator';$('propTimezone').value='3';$('propReportLang').value='tr';
    $('tbShape').value='circle';$('tbSizeValue').value='100';$('tbSizeSlider').value='100';
    $('tbHeightValue').value='100';$('tbHeightSlider').value='100';$('tbRectGroup').style.display='none';
    $('propColorPass').value='2.0';$('propColorCond').value='5.0';$('propColorGlobal').value='5.0';
    $('propCsiGood').value='2.0';$('propCsiWarn').value='5.0';$('propRegionCount').value='5';
    $('propPointsCount').value='5';$('propSamplingMode').value='random';
    $('propSsimPass').value='85.0';$('propSsimCond').value='70.0';$('propGradPass').value='85.0';$('propGradCond').value='70.0';
    $('propPhasePass').value='85.0';$('propPhaseCond').value='70.0';$('propStructuralPass').value='85.0';$('propStructuralCond').value='70.0';$('propPatternGlobal').value='75.0';
    if($('propGradDiffSens')){$('propGradDiffSens').value='7';if($('propGradDiffSensVal'))$('propGradDiffSensVal').textContent='7';}
    if($('propPhaseDiffSens')){$('propPhaseDiffSens').value='7';if($('propPhaseDiffSensVal'))$('propPhaseDiffSensVal').textContent='7';}
    if($('propGradBoundSens')){$('propGradBoundSens').value='4';if($('propGradBoundSensVal'))$('propGradBoundSensVal').textContent='4';}
    if($('propPhaseBoundSens')){$('propPhaseBoundSens').value='8';if($('propPhaseBoundSensVal'))$('propPhaseBoundSensVal').textContent='8';}
    if($('propStructuralSens')){$('propStructuralSens').value='10';if($('propStructuralSensVal'))$('propStructuralSensVal').textContent='10';}
    $('propLabDL').value='1.0';$('propLabDA').value='1.0';$('propLabDB').value='1.0';$('propLabMag').value='2.0';
    $('propIlluminant').value='D65';
    document.querySelectorAll('.prop-check-list input[type="checkbox"],.prop-check-grid input[type="checkbox"]').forEach(function(cb){
        if(cb.name==='propTestIll')cb.checked=['D65','D50','TL84'].indexOf(cb.value)>=0;
        else cb.checked=true;
    });
    State.manualPoints=[];State.randomPoints=[];
    State.fullImage=true;$('tbFullImage').checked=true;
    $('tbRegionControls').classList.add('hidden');
    updateRightToolsCollapsed();
    resetRegionCenter();updateRegionOverlays();updateSamplingUI();
    log(t('log.settings.reset'),'warn');
    scheduleSave();
}

/* ═══ Panel Hide Buttons ═══ */
function initPanelControls(){
    document.querySelectorAll('.panel-hide-btn').forEach(function(btn){
        btn.addEventListener('click',function(e){
            e.stopPropagation();
            var pid=this.getAttribute('data-hide-panel');
            togglePanel(pid);
            log(t('log.panel.toggled')+': '+pid,'info');
        });
    });
}

/* ═══ Panel Resize (Drag Handles) ═══ */
function initPanelResize(){
    var handles=document.querySelectorAll('.panel-resize-handle');
    handles.forEach(function(handle){
        var targetId=handle.getAttribute('data-resize');
        var dir=handle.getAttribute('data-dir');
        var startPos=0,startSize=0,target=null;

        handle.addEventListener('mousedown',function(e){
            e.preventDefault();
            target=$(targetId);
            if(!target||target.classList.contains('hidden'))return;
            handle.classList.add('active');
            if(dir==='col'){
                startPos=e.clientX;
                startSize=target.getBoundingClientRect().width;
            }else{
                startPos=e.clientY;
                startSize=target.getBoundingClientRect().height;
            }
            document.addEventListener('mousemove',onMove);
            document.addEventListener('mouseup',onUp);
            document.body.style.cursor=dir==='col'?'col-resize':'row-resize';
            document.body.style.userSelect='none';
        });

        function onMove(e){
            if(!target)return;
            if(dir==='col'){
                var isLeft=(targetId==='panelWorkspace');
                var delta=isLeft?(e.clientX-startPos):(startPos-e.clientX);
                var newW=Math.max(140,Math.min(500,startSize+delta));
                target.style.width=newW+'px';
            }else{
                var maxH=Math.floor(window.innerHeight*0.75);
                var delta=startPos-e.clientY;
                var newH=Math.max(80,Math.min(maxH,startSize+delta));
                target.style.height=newH+'px';
            }
            /* Redraw overlays after resize */
            if(!State.fullImage)updateRegionOverlays();
        }

        function onUp(){
            handle.classList.remove('active');
            document.removeEventListener('mousemove',onMove);
            document.removeEventListener('mouseup',onUp);
            document.body.style.cursor='';
            document.body.style.userSelect='';
            target=null;
            scheduleSave();
        }
    });
}

/* ═══ Save As Download (pywebview native → browser blob fallback) ═══ */
function saveAsDownload(url,defaultName){
    /* Prefer native Save-As via pywebview bridge (desktop app) */
    if(window.pywebview&&window.pywebview.api&&window.pywebview.api.save_report){
        log(t('log.saving')+': '+defaultName+'...','info');
        window.pywebview.api.save_report(url,defaultName||'report.pdf').then(function(r){
            if(r&&r.ok){log(t('log.saved')+': '+r.path,'success');}
            else if(r&&r.reason==='cancelled'){log(t('log.save.cancelled'),'info');}
            else{log(t('log.save.error')+': '+(r&&r.reason||'unknown'),'error');showAlert(t('log.download.error'),r&&r.reason||'Unknown error','❌');}
        }).catch(function(err){log(t('log.save.error')+': '+err,'error');showAlert(t('log.download.error'),String(err),'❌');});
        return;
    }
    /* Browser fallback: fetch blob → object URL → programmatic click */
    fetch(url).then(function(resp){
        if(!resp.ok)throw new Error('Download failed');
        return resp.blob();
    }).then(function(blob){
        var a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download=defaultName||'report.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(a.href);},200);
        log(t('log.saved')+': '+defaultName,'success');
    }).catch(function(err){
        showAlert(t('log.download.error'),err.message,'❌');
        log(t('log.download.error')+': '+err.message,'error');
    });
}

/* ═══ Region Drag (move region by dragging inside it) ═══ */
var _regionDragging=false;
function initRegionDrag(){
    ['refCanvas','sampleCanvas'].forEach(function(parentId){
        var parent=$(parentId);
        if(!parent)return;
        var lastX=0,lastY=0,myDrag=false;

        parent.addEventListener('mousedown',function(e){
            if(State.fullImage)return;
            if(($('tbShape').value||'circle')==='pen')return;
            var imgEl=$(parentId==='refCanvas'?'refPreview':'samplePreview');
            if(!imgEl||imgEl.style.display==='none')return;

            var rect=imgEl.getBoundingClientRect();
            var scaleX=imgEl.naturalWidth/rect.width;
            var scaleY=imgEl.naturalHeight/rect.height;
            var px=(e.clientX-rect.left)*scaleX;
            var py=(e.clientY-rect.top)*scaleY;

            /* Check if click is inside region → start drag */
            if(isPointInRegion(Math.round(px),Math.round(py))){
                e.preventDefault();
                _regionDragging=true;myDrag=true;
                lastX=e.clientX;lastY=e.clientY;
                parent.style.cursor='grabbing';
                document.body.style.userSelect='none';
            }
        });

        document.addEventListener('mousemove',function(e){
            if(!myDrag)return;
            var imgEl=$(parentId==='refCanvas'?'refPreview':'samplePreview');
            if(!imgEl)return;
            var rect=imgEl.getBoundingClientRect();
            var scaleX=imgEl.naturalWidth/rect.width;
            var scaleY=imgEl.naturalHeight/rect.height;

            var dx=(e.clientX-lastX)*scaleX;
            var dy=(e.clientY-lastY)*scaleY;
            lastX=e.clientX;lastY=e.clientY;

            State.regionCenterX+=Math.round(dx);
            State.regionCenterY+=Math.round(dy);
            clampRegionCenter();
            updateRegionOverlays();
        });

        document.addEventListener('mouseup',function(){
            if(myDrag){
                myDrag=false;_regionDragging=false;
                parent.style.cursor='';
                document.body.style.userSelect='';
                log(t('log.region.moved')+' ('+State.regionCenterX+', '+State.regionCenterY+')','info');
                scheduleSave();
            }
        });
    });
}

/* ═══ Persistence — save/restore full app state to localStorage ═══ */
var PERSIST_KEY='spectramatch_desktop_state';

function saveState(){
    try{
        var s={
            /* Language & Theme */
            lang:State.lang, theme:State.theme,
            /* Mode & Region */
            singleMode:State.singleMode, fullImage:State.fullImage,
            shape:$('tbShape')?$('tbShape').value:'circle',
            sizeVal:$('tbSizeValue')?$('tbSizeValue').value:'100',
            heightVal:$('tbHeightValue')?$('tbHeightValue').value:'100',
            regionCenterX:State.regionCenterX, regionCenterY:State.regionCenterY,
            samplingMode:State.samplingMode,
            manualPoints:State.manualPoints, randomPoints:State.randomPoints,
            penPoints:State.penPoints, penClosed:State.penClosed,
            /* Images (dataURL) */
            refDataUrl:State.refDataUrl, sampleDataUrl:State.sampleDataUrl,
            refW:State.refW, refH:State.refH, sampleW:State.sampleW, sampleH:State.sampleH,
            refName:State.refFile?State.refFile.name:null,
            sampleName:State.sampleFile?State.sampleFile.name:null,
            /* Panel visibility */
            panelWorkspaceHidden:$('panelWorkspace')?$('panelWorkspace').classList.contains('hidden'):false,
            panelPropertiesHidden:$('panelProperties')?$('panelProperties').classList.contains('hidden'):false,
            bottomPanelHidden:$('bottomPanel')?$('bottomPanel').classList.contains('hidden'):false,
            /* Panel sizes */
            panelWorkspaceW:$('panelWorkspace')?$('panelWorkspace').style.width:'',
            panelPropertiesW:$('panelProperties')?$('panelProperties').style.width:'',
            bottomPanelH:$('bottomPanel')?$('bottomPanel').style.height:'',
            /* Properties / Settings */
            propOperator:$('propOperator')?$('propOperator').value:'Operator',
            propTimezone:$('propTimezone')?$('propTimezone').value:'3',
            propReportLang:$('propReportLang')?$('propReportLang').value:'tr',
            propAlignmentMode:$('propAlignmentMode')?$('propAlignmentMode').value:'direct',
            propColorPass:$('propColorPass')?$('propColorPass').value:'2.0',
            propColorCond:$('propColorCond')?$('propColorCond').value:'5.0',
            propColorGlobal:$('propColorGlobal')?$('propColorGlobal').value:'5.0',
            propCsiGood:$('propCsiGood')?$('propCsiGood').value:'2.0',
            propCsiWarn:$('propCsiWarn')?$('propCsiWarn').value:'5.0',
            propRegionCount:$('propRegionCount')?$('propRegionCount').value:'5',
            propPointsCount:$('propPointsCount')?$('propPointsCount').value:'5',
            propSamplingMode:$('propSamplingMode')?$('propSamplingMode').value:'random',
            propIlluminant:$('propIlluminant')?$('propIlluminant').value:'D65',
            propSsimPass:$('propSsimPass')?$('propSsimPass').value:'85.0',
            propSsimCond:$('propSsimCond')?$('propSsimCond').value:'70.0',
            propGradPass:$('propGradPass')?$('propGradPass').value:'85.0',
            propGradCond:$('propGradCond')?$('propGradCond').value:'70.0',
            propPhasePass:$('propPhasePass')?$('propPhasePass').value:'85.0',
            propPhaseCond:$('propPhaseCond')?$('propPhaseCond').value:'70.0',
            propPatternGlobal:$('propPatternGlobal')?$('propPatternGlobal').value:'75.0',
            propGradDiffSens:$('propGradDiffSens')?$('propGradDiffSens').value:'7',
            propPhaseDiffSens:$('propPhaseDiffSens')?$('propPhaseDiffSens').value:'7',
            propGradBoundSens:$('propGradBoundSens')?$('propGradBoundSens').value:'4',
            propPhaseBoundSens:$('propPhaseBoundSens')?$('propPhaseBoundSens').value:'8',
            propStructuralSens:$('propStructuralSens')?$('propStructuralSens').value:'10',
            propLabDL:$('propLabDL')?$('propLabDL').value:'1.0',
            propLabDA:$('propLabDA')?$('propLabDA').value:'1.0',
            propLabDB:$('propLabDB')?$('propLabDB').value:'1.0',
            propLabMag:$('propLabMag')?$('propLabMag').value:'2.0',
            propColorScoringMethod:$('propColorScoringMethod')?$('propColorScoringMethod').value:'delta_e',
            propPatternScoringMethod:$('propPatternScoringMethod')?$('propPatternScoringMethod').value:'all',
            propStructuralPass:$('propStructuralPass')?$('propStructuralPass').value:'85.0',
            propStructuralCond:$('propStructuralCond')?$('propStructuralCond').value:'70.0',
            /* Checkboxes */
            checkboxes:{}
        };
        document.querySelectorAll('.prop-check-list input[type="checkbox"],.prop-check-grid input[type="checkbox"]').forEach(function(cb){
            if(cb.id)s.checkboxes[cb.id]=cb.checked;
        });
        /* Test illuminants */
        s.testIlluminants=[];
        document.querySelectorAll('input[name="propTestIll"]:checked').forEach(function(e){s.testIlluminants.push(e.value);});
        localStorage.setItem(PERSIST_KEY,JSON.stringify(s));
    }catch(e){/* quota exceeded or private mode — silently ignore */}
}

function restoreState(){
    try{
        var raw=localStorage.getItem(PERSIST_KEY);
        if(!raw)return false;
        var s=JSON.parse(raw);

        /* Language & Theme */
        if(s.lang){State.lang=s.lang;localStorage.setItem('desk_lang',s.lang);}
        if(s.theme){State.theme=s.theme;localStorage.setItem('desk_theme',s.theme);}
        document.body.setAttribute('data-theme',State.theme);
        $('langCode').textContent=State.lang.toUpperCase();
        updateLangFlag();

        /* Mode */
        State.singleMode=!!s.singleMode;
        State.fullImage=s.fullImage!==false;
        if($('tbSingleMode'))$('tbSingleMode').checked=State.singleMode;
        if($('tbFullImage'))$('tbFullImage').checked=State.fullImage;
        if($('tbRegionControls'))$('tbRegionControls').classList.toggle('hidden',State.fullImage);
        updateRightToolsCollapsed();

        /* Shape & Size */
        if(s.shape&&$('tbShape')){$('tbShape').value=s.shape;$('tbRectGroup').style.display=s.shape==='rectangle'?'':'none';}
        if(s.sizeVal){$('tbSizeSlider').value=s.sizeVal;$('tbSizeValue').value=s.sizeVal;}
        if(s.heightVal){$('tbHeightSlider').value=s.heightVal;$('tbHeightValue').value=s.heightVal;}
        State.regionCenterX=s.regionCenterX||0;
        State.regionCenterY=s.regionCenterY||0;
        State.samplingMode=s.samplingMode||'random';
        State.manualPoints=s.manualPoints||[];
        State.randomPoints=s.randomPoints||[];
        State.penPoints=s.penPoints||[];
        State.penClosed=!!s.penClosed;

        /* Restore images from dataURL */
        if(s.refDataUrl){
            State.refDataUrl=s.refDataUrl;State.refW=s.refW||0;State.refH=s.refH||0;
            /* Recreate File object from dataURL */
            State.refFile=dataUrlToFile(s.refDataUrl,s.refName||'reference.png');
            showPreview('ref',s.refDataUrl,s.refW,s.refH,s.refName||'reference.png');
        }
        if(s.sampleDataUrl){
            State.sampleDataUrl=s.sampleDataUrl;State.sampleW=s.sampleW||0;State.sampleH=s.sampleH||0;
            State.sampleFile=dataUrlToFile(s.sampleDataUrl,s.sampleName||'sample.png');
            showPreview('sample',s.sampleDataUrl,s.sampleW,s.sampleH,s.sampleName||'sample.png');
        }

        /* Panel visibility */
        if(s.panelWorkspaceHidden)togglePanel('panelWorkspace');
        if(s.panelPropertiesHidden)togglePanel('panelProperties');
        if(s.bottomPanelHidden)togglePanel('bottomPanel');

        /* Panel sizes */
        if(s.panelWorkspaceW&&$('panelWorkspace'))$('panelWorkspace').style.width=s.panelWorkspaceW;
        if(s.panelPropertiesW&&$('panelProperties'))$('panelProperties').style.width=s.panelPropertiesW;
        if(s.bottomPanelH&&$('bottomPanel'))$('bottomPanel').style.height=s.bottomPanelH;

        /* Properties / Settings */
        var fields=['propOperator','propTimezone','propReportLang','propAlignmentMode',
            'propColorPass','propColorCond',
            'propColorGlobal','propCsiGood','propCsiWarn','propRegionCount','propPointsCount',
            'propSamplingMode','propIlluminant','propSsimPass','propSsimCond','propGradPass',
            'propGradCond','propPhasePass','propPhaseCond','propPatternGlobal',
            'propGradDiffSens','propPhaseDiffSens','propGradBoundSens','propPhaseBoundSens','propStructuralSens',
            'propLabDL','propLabDA','propLabDB','propLabMag',
            'propColorScoringMethod','propPatternScoringMethod',
            'propStructuralPass','propStructuralCond'];
        fields.forEach(function(f){if(s[f]!==undefined&&$(f))$(f).value=s[f];});
        if($('propCsiGood')&&$('propCsiWarn')){
            var savedCsiGood=parseFloat($('propCsiGood').value);
            var savedCsiWarn=parseFloat($('propCsiWarn').value);
            if(isFinite(savedCsiGood)&&isFinite(savedCsiWarn)&&savedCsiGood>savedCsiWarn){
                $('propCsiGood').value='2.0';
                $('propCsiWarn').value='5.0';
            }
        }
        /* Sync slider value labels after restoring */
        if($('propGradDiffSens')&&$('propGradDiffSensVal'))$('propGradDiffSensVal').textContent=$('propGradDiffSens').value;
        if($('propPhaseDiffSens')&&$('propPhaseDiffSensVal'))$('propPhaseDiffSensVal').textContent=$('propPhaseDiffSens').value;
        if($('propGradBoundSens')&&$('propGradBoundSensVal'))$('propGradBoundSensVal').textContent=$('propGradBoundSens').value;
        if($('propPhaseBoundSens')&&$('propPhaseBoundSensVal'))$('propPhaseBoundSensVal').textContent=$('propPhaseBoundSens').value;
        if($('propStructuralSens')&&$('propStructuralSensVal'))$('propStructuralSensVal').textContent=$('propStructuralSens').value;
        /* Sync toolbar quick-access controls from restored property values */
        if($('tbAlignmentMode')&&$('propAlignmentMode'))$('tbAlignmentMode').value=$('propAlignmentMode').value;
        if($('tbSamplingCount')&&$('propRegionCount'))$('tbSamplingCount').value=$('propRegionCount').value;

        /* Checkboxes */
        if(s.checkboxes){
            for(var id in s.checkboxes){if($(id))$(id).checked=s.checkboxes[id];}
        }
        /* Test illuminants */
        if(s.testIlluminants){
            document.querySelectorAll('input[name="propTestIll"]').forEach(function(cb){
                cb.checked=s.testIlluminants.indexOf(cb.value)>=0;
            });
        }

        return true;
    }catch(e){return false;}
}

function dataUrlToFile(dataUrl,name){
    try{
        var arr=dataUrl.split(','),mime=arr[0].match(/:(.*?);/)[1];
        var bstr=atob(arr[1]),n=bstr.length,u8=new Uint8Array(n);
        while(n--)u8[n]=bstr.charCodeAt(n);
        return new File([u8],name||'image.png',{type:mime});
    }catch(e){return null;}
}

/* ═══════ Desktop Camera Studio ═══════ */
var DesktopCamera={
    stream:null,target:null,mirrored:false,rotation:0,flipH:false,
    brightness:0,contrast:0,capturedDataUrl:null,devices:[],cropCleanup:null,statusKey:'cam.requesting'
};

function setDesktopCameraStatus(key,visible){
    var statusEl=$('dCamStatus');
    if(!statusEl)return;
    if(key){
        DesktopCamera.statusKey=key;
        statusEl.textContent=t(key);
    }
    if(typeof visible!=='undefined'){
        statusEl.style.display=visible?'':'none';
    }
}

function refreshDesktopCameraTranslations(){
    var overlay=$('dCamOverlay');
    if(!overlay||!overlay.classList.contains('active'))return;
    if($('dCamBadge'))$('dCamBadge').textContent=DesktopCamera.target==='ref'?t('rpt.reference'):t('rpt.sample');
    if($('dCamStatus'))setDesktopCameraStatus(DesktopCamera.statusKey,$('dCamStatus').style.display!=='none');
    var select=$('dCamDeviceSelect');
    if(!select)return;
    if(!DesktopCamera.devices.length&&select.options.length){
        select.options[0].textContent=t('cam.no.cameras');
        return;
    }
    Array.prototype.forEach.call(select.options,function(opt){
        var fallbackIndex=opt.getAttribute('data-fallback-index');
        if(fallbackIndex){
            opt.textContent=t('cam.select.camera')+' '+fallbackIndex;
        }
    });
}

function initDesktopCameraStudio(){
    var overlay=$('dCamOverlay');
    if(!overlay)return;
    $('dCamClose').addEventListener('click',closeDesktopCameraStudio);
    $('dCamCancel').addEventListener('click',closeDesktopCameraStudio);
    $('dCamCapture').addEventListener('click',captureDesktopCameraFrame);
    $('dCamRetake').addEventListener('click',retakeDesktopCameraCapture);
    $('dCamUse').addEventListener('click',useDesktopCameraCapture);
    $('dCamMirror').addEventListener('click',function(){
        DesktopCamera.mirrored=!DesktopCamera.mirrored;
        $('dCamVideo').classList.toggle('mirrored',DesktopCamera.mirrored);
    });
    $('dCamDeviceSelect').addEventListener('change',function(){
        if(this.value)startDesktopCameraStream(this.value);
    });
    $('dCamRotL').addEventListener('click',function(){
        DesktopCamera.rotation=(DesktopCamera.rotation-90+360)%360;
        updateDesktopCapturedPreview();
    });
    $('dCamRotR').addEventListener('click',function(){
        DesktopCamera.rotation=(DesktopCamera.rotation+90)%360;
        updateDesktopCapturedPreview();
    });
    $('dCamFlipH').addEventListener('click',function(){
        DesktopCamera.flipH=!DesktopCamera.flipH;
        updateDesktopCapturedPreview();
    });
    $('dCamBright').addEventListener('input',function(){
        DesktopCamera.brightness=parseInt(this.value,10)||0;
        updateDesktopCapturedPreview();
    });
    $('dCamContrast').addEventListener('input',function(){
        DesktopCamera.contrast=parseInt(this.value,10)||0;
        updateDesktopCapturedPreview();
    });
    overlay.addEventListener('click',function(e){
        if(e.target===overlay)closeDesktopCameraStudio();
    });
}

function openDesktopCameraStudio(target){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        showAlert('Camera',t('cam.not.supported'),'⚠️');
        return;
    }
    DesktopCamera.target=target||'sample';
    DesktopCamera.mirrored=false;
    DesktopCamera.rotation=0;
    DesktopCamera.flipH=false;
    DesktopCamera.brightness=0;
    DesktopCamera.contrast=0;
    DesktopCamera.capturedDataUrl=null;
    if(DesktopCamera.cropCleanup){DesktopCamera.cropCleanup();DesktopCamera.cropCleanup=null;}
    $('dCamOverlay').classList.add('active');
    $('dCamBadge').textContent=DesktopCamera.target==='ref'?t('rpt.reference'):t('rpt.sample');
    $('dCamStatus').textContent=t('cam.requesting');
    $('dCamStatus').style.display='';
    $('dCamVideo').classList.remove('active');
    $('dCamVideo').classList.remove('mirrored');
    $('dCamVideo').style.filter='';
    $('dCamImg').style.display='none';
    $('dCamCropOverlay').style.display='none';
    $('dCamAdjust').style.display='none';
    $('dCamCapture').style.display='';
    $('dCamRetake').style.display='none';
    $('dCamUse').style.display='none';
    $('dCamBright').value='0';
    $('dCamContrast').value='0';
    enumerateDesktopCameras();
}

function closeDesktopCameraStudio(){
    stopDesktopCameraStream();
    if(DesktopCamera.cropCleanup){DesktopCamera.cropCleanup();DesktopCamera.cropCleanup=null;}
    $('dCamOverlay').classList.remove('active');
    $('dCamImg').src='';
    $('dCamVideo').style.filter='';
    DesktopCamera.capturedDataUrl=null;
}

function stopDesktopCameraStream(){
    if(DesktopCamera.stream){
        DesktopCamera.stream.getTracks().forEach(function(track){track.stop();});
        DesktopCamera.stream=null;
    }
    var video=$('dCamVideo');
    if(video){
        video.srcObject=null;
        video.classList.remove('active');
    }
}

function enumerateDesktopCameras(){
    navigator.mediaDevices.getUserMedia({video:true})
    .then(function(stream){
        stream.getTracks().forEach(function(track){track.stop();});
        return navigator.mediaDevices.enumerateDevices();
    })
    .then(function(devices){
        DesktopCamera.devices=devices.filter(function(device){return device.kind==='videoinput';});
        var select=$('dCamDeviceSelect');
        select.innerHTML='';
        if(!DesktopCamera.devices.length){
            var noneOpt=document.createElement('option');
            noneOpt.textContent=t('cam.no.cameras');
            select.appendChild(noneOpt);
            $('dCamStatus').textContent=t('cam.no.cameras');
            $('dCamStatus').style.display='';
            return;
        }
        DesktopCamera.devices.forEach(function(device,index){
            var opt=document.createElement('option');
            opt.value=device.deviceId;
            opt.textContent=device.label||(t('cam.select.camera')+' '+(index+1));
            select.appendChild(opt);
        });
        startDesktopCameraStream(DesktopCamera.devices[0].deviceId);
    })
    .catch(function(err){
        $('dCamStatus').textContent=t('cam.permission.denied');
        $('dCamStatus').style.display='';
        log('Camera access error: '+(err&&err.message||err),'error');
    });
}

function startDesktopCameraStream(deviceId){
    stopDesktopCameraStream();
    $('dCamStatus').textContent=t('cam.requesting');
    $('dCamStatus').style.display='';
    var videoSettings={width:{ideal:1920},height:{ideal:1080}};
    if(deviceId)videoSettings.deviceId={exact:deviceId};
    navigator.mediaDevices.getUserMedia({video:videoSettings})
    .then(function(stream){
        DesktopCamera.stream=stream;
        var video=$('dCamVideo');
        video.srcObject=stream;
        video.classList.add('active');
        video.classList.toggle('mirrored',DesktopCamera.mirrored);
        if(video.play)video.play().catch(function(){});
        $('dCamStatus').style.display='none';
    })
    .catch(function(err){
        $('dCamStatus').textContent=t('cam.permission.denied');
        $('dCamStatus').style.display='';
        log('Camera stream error: '+(err&&err.message||err),'error');
    });
}

function captureDesktopCameraFrame(){
    var video=$('dCamVideo');
    if(!video||!video.videoWidth){
        showAlert('Camera',t('cam.requesting'),'⚠️');
        return;
    }
    var canvas=$('dCamCanvas');
    var ctx=canvas.getContext('2d');
    if(!ctx)return;
    canvas.width=video.videoWidth;
    canvas.height=video.videoHeight;
    if(DesktopCamera.mirrored){
        ctx.translate(canvas.width,0);
        ctx.scale(-1,1);
    }
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    ctx.setTransform(1,0,0,1,0,0);
    DesktopCamera.capturedDataUrl=canvas.toDataURL('image/png');
    stopDesktopCameraStream();
    var img=$('dCamImg');
    img.src=DesktopCamera.capturedDataUrl;
    img.style.display='';
    $('dCamCapture').style.display='none';
    $('dCamRetake').style.display='';
    $('dCamUse').style.display='';
    $('dCamAdjust').style.display='flex';
    $('dCamStatus').style.display='none';
    initDesktopCameraCrop();
    log(t('cam.captured'),'success');
}

function retakeDesktopCameraCapture(){
    DesktopCamera.capturedDataUrl=null;
    DesktopCamera.rotation=0;
    DesktopCamera.flipH=false;
    DesktopCamera.brightness=0;
    DesktopCamera.contrast=0;
    $('dCamBright').value='0';
    $('dCamContrast').value='0';
    $('dCamImg').style.display='none';
    $('dCamCropOverlay').style.display='none';
    $('dCamAdjust').style.display='none';
    $('dCamCapture').style.display='';
    $('dCamRetake').style.display='none';
    $('dCamUse').style.display='none';
    if(DesktopCamera.cropCleanup){DesktopCamera.cropCleanup();DesktopCamera.cropCleanup=null;}
    var deviceSelect=$('dCamDeviceSelect');
    if(deviceSelect&&deviceSelect.value)startDesktopCameraStream(deviceSelect.value);
    else enumerateDesktopCameras();
}

function initDesktopCameraCrop(){
    var overlay=$('dCamCropOverlay');
    var box=$('dCamCropBox');
    var area=$('dCamPreview');
    if(!overlay||!box||!area)return;
    if(DesktopCamera.cropCleanup){DesktopCamera.cropCleanup();}
    overlay.style.display='block';
    overlay.style.touchAction='none';
    box.style.touchAction='none';
    var pad=30;
    box.style.left=pad+'px';
    box.style.top=pad+'px';
    box.style.width=Math.max(120,area.clientWidth-pad*2)+'px';
    box.style.height=Math.max(120,area.clientHeight-pad*2)+'px';
    var cropState={dragging:false,resizing:null,sx:0,sy:0,ox:0,oy:0,ow:0,oh:0};
    function clampRect(rect){
        var minSize=40;
        var areaW=area.clientWidth,areaH=area.clientHeight;
        rect.width=Math.max(minSize,rect.width);
        rect.height=Math.max(minSize,rect.height);
        rect.left=Math.max(0,Math.min(rect.left,areaW-rect.width));
        rect.top=Math.max(0,Math.min(rect.top,areaH-rect.height));
        if(rect.left+rect.width>areaW)rect.width=areaW-rect.left;
        if(rect.top+rect.height>areaH)rect.height=areaH-rect.top;
        rect.width=Math.max(minSize,rect.width);
        rect.height=Math.max(minSize,rect.height);
        return rect;
    }
    function applyRect(rect){
        box.style.left=rect.left+'px';
        box.style.top=rect.top+'px';
        box.style.width=rect.width+'px';
        box.style.height=rect.height+'px';
    }
    function beginInteraction(e,resizeDir){
        if(e.target.classList.contains('cam-crop-handle'))return;
        e.preventDefault();
        e.stopPropagation();
        cropState.dragging=!resizeDir;
        cropState.resizing=resizeDir||null;
        cropState.sx=e.clientX;cropState.sy=e.clientY;
        cropState.ox=box.offsetLeft;cropState.oy=box.offsetTop;
        cropState.ow=box.offsetWidth;cropState.oh=box.offsetHeight;
    }
    function onBoxDown(e){beginInteraction(e,null);}
    function onHandleDown(e){
        var resizeDir=(this.className.match(/cam-crop-(nw|ne|sw|se|n|e|s|w)\b/)||[])[1]||null;
        beginInteraction(e,resizeDir);
    }
    function onMove(e){
        if(cropState.dragging){
            var dx=e.clientX-cropState.sx,dy=e.clientY-cropState.sy;
            applyRect(clampRect({
                left:cropState.ox+dx,
                top:cropState.oy+dy,
                width:cropState.ow,
                height:cropState.oh
            }));
            return;
        }
        if(!cropState.resizing)return;
        var dx2=e.clientX-cropState.sx,dy2=e.clientY-cropState.sy;
        var rect={left:cropState.ox,top:cropState.oy,width:cropState.ow,height:cropState.oh};
        if(cropState.resizing.indexOf('e')>=0)rect.width=cropState.ow+dx2;
        if(cropState.resizing.indexOf('s')>=0)rect.height=cropState.oh+dy2;
        if(cropState.resizing.indexOf('w')>=0){
            rect.left=cropState.ox+dx2;
            rect.width=cropState.ow-dx2;
        }
        if(cropState.resizing.indexOf('n')>=0){
            rect.top=cropState.oy+dy2;
            rect.height=cropState.oh-dy2;
        }
        applyRect(clampRect(rect));
    }
    function onUp(){
        cropState.dragging=false;
        cropState.resizing=null;
    }
    box.addEventListener('mousedown',onBoxDown);
    box.querySelectorAll('.cam-crop-handle').forEach(function(handle){
        handle.addEventListener('mousedown',onHandleDown);
    });
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    DesktopCamera.cropCleanup=function(){
        box.removeEventListener('mousedown',onBoxDown);
        box.querySelectorAll('.cam-crop-handle').forEach(function(handle){
            handle.removeEventListener('mousedown',onHandleDown);
        });
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
    };
}

function applyDesktopCameraAdjustments(srcDataUrl,callback){
    var img=new Image();
    img.onload=function(){
        var w=img.naturalWidth,h=img.naturalHeight;
        var canvas=document.createElement('canvas');
        var ctx=canvas.getContext('2d');
        if(!ctx)return;
        var radians=DesktopCamera.rotation*Math.PI/180;
        var canvasW=(DesktopCamera.rotation%180===0)?w:h;
        var canvasH=(DesktopCamera.rotation%180===0)?h:w;
        canvas.width=canvasW;
        canvas.height=canvasH;
        ctx.translate(canvasW/2,canvasH/2);
        ctx.rotate(radians);
        if(DesktopCamera.flipH)ctx.scale(-1,1);
        ctx.drawImage(img,-w/2,-h/2,w,h);
        ctx.setTransform(1,0,0,1,0,0);
        if(DesktopCamera.brightness!==0||DesktopCamera.contrast!==0){
            var imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
            var data=imageData.data;
            var brightnessFactor=DesktopCamera.brightness*2.55;
            var contrastFactor=(DesktopCamera.contrast+100)/100;
            contrastFactor*=contrastFactor;
            for(var i=0;i<data.length;i+=4){
                for(var channel=0;channel<3;channel++){
                    var value=data[i+channel]+brightnessFactor;
                    value=((value/255-0.5)*contrastFactor+0.5)*255;
                    data[i+channel]=Math.max(0,Math.min(255,value));
                }
            }
            ctx.putImageData(imageData,0,0);
        }
        callback(canvas.toDataURL('image/png'),canvas.width,canvas.height);
    };
    img.src=srcDataUrl;
}

function updateDesktopCapturedPreview(){
    if(!DesktopCamera.capturedDataUrl)return;
    applyDesktopCameraAdjustments(DesktopCamera.capturedDataUrl,function(url){
        var img=$('dCamImg');
        img.onload=function(){
            if(DesktopCamera.cropCleanup)initDesktopCameraCrop();
            img.onload=null;
        };
        img.src=url;
    });
}

function useDesktopCameraCapture(){
    if(!DesktopCamera.capturedDataUrl)return;
    applyDesktopCameraAdjustments(DesktopCamera.capturedDataUrl,function(adjustedUrl,fullW,fullH){
        var area=$('dCamPreview');
        var box=$('dCamCropBox');
        var imgEl=$('dCamImg');
        var sx=0,sy=0,sw=fullW,sh=fullH;
        if(imgEl&&imgEl.style.display!=='none'&&box&&$('dCamCropOverlay').style.display!=='none'){
            var imgRect=imgEl.getBoundingClientRect();
            var areaRect=area.getBoundingClientRect();
            var dispW=imgRect.width,dispH=imgRect.height;
            if(dispW>0&&dispH>0){
                var dispX=imgRect.left-areaRect.left;
                var dispY=imgRect.top-areaRect.top;
                var bx=box.offsetLeft-dispX;
                var by=box.offsetTop-dispY;
                var bw=box.offsetWidth;
                var bh=box.offsetHeight;
                var scaleX=fullW/dispW,scaleY=fullH/dispH;
                sx=Math.max(0,Math.round(bx*scaleX));
                sy=Math.max(0,Math.round(by*scaleY));
                sw=Math.min(fullW-sx,Math.round(bw*scaleX));
                sh=Math.min(fullH-sy,Math.round(bh*scaleY));
                if(sw<10||sh<10){sx=0;sy=0;sw=fullW;sh=fullH;}
            }
        }
        var cropCanvas=document.createElement('canvas');
        cropCanvas.width=sw;
        cropCanvas.height=sh;
        var cropCtx=cropCanvas.getContext('2d');
        if(!cropCtx)return;
        var adjustedImg=new Image();
        adjustedImg.onload=function(){
            cropCtx.drawImage(adjustedImg,sx,sy,sw,sh,0,0,sw,sh);
            var file=dataUrlToFile(cropCanvas.toDataURL('image/png'),'camera_capture.png');
            if(!file){
                showAlert('Camera','Could not build captured image file.','❌');
                return;
            }
            loadImage(DesktopCamera.target==='ref'?'ref':'sample',file);
            log(DesktopCamera.target==='ref'?t('cam.assigned.ref'):t('cam.assigned.sample'),'success');
            closeDesktopCameraStudio();
        };
        adjustedImg.src=adjustedUrl;
    });
}

/* Auto-save on any meaningful change — debounced */
function openDesktopCameraStudio(target){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        showAlert(t('cam.studio.title'),t('cam.not.supported'),'\u26a0\ufe0f');
        return;
    }
    DesktopCamera.target=target||'sample';
    DesktopCamera.mirrored=false;
    DesktopCamera.rotation=0;
    DesktopCamera.flipH=false;
    DesktopCamera.brightness=0;
    DesktopCamera.contrast=0;
    DesktopCamera.capturedDataUrl=null;
    DesktopCamera.statusKey='cam.requesting';
    if(DesktopCamera.cropCleanup){DesktopCamera.cropCleanup();DesktopCamera.cropCleanup=null;}
    $('dCamOverlay').classList.add('active');
    $('dCamBadge').textContent=DesktopCamera.target==='ref'?t('rpt.reference'):t('rpt.sample');
    setDesktopCameraStatus('cam.requesting',true);
    $('dCamVideo').classList.remove('active');
    $('dCamVideo').classList.remove('mirrored');
    $('dCamVideo').style.filter='';
    $('dCamImg').style.display='none';
    $('dCamCropOverlay').style.display='none';
    $('dCamAdjust').style.display='none';
    $('dCamCapture').style.display='';
    $('dCamRetake').style.display='none';
    $('dCamUse').style.display='none';
    $('dCamBright').value='0';
    $('dCamContrast').value='0';
    enumerateDesktopCameras();
}

function enumerateDesktopCameras(){
    navigator.mediaDevices.getUserMedia({video:true})
    .then(function(stream){
        stream.getTracks().forEach(function(track){track.stop();});
        return navigator.mediaDevices.enumerateDevices();
    })
    .then(function(devices){
        DesktopCamera.devices=devices.filter(function(device){return device.kind==='videoinput';});
        var select=$('dCamDeviceSelect');
        select.innerHTML='';
        if(!DesktopCamera.devices.length){
            var noneOpt=document.createElement('option');
            noneOpt.textContent=t('cam.no.cameras');
            select.appendChild(noneOpt);
            setDesktopCameraStatus('cam.no.cameras',true);
            return;
        }
        DesktopCamera.devices.forEach(function(device,index){
            var opt=document.createElement('option');
            opt.value=device.deviceId;
            if(device.label){
                opt.textContent=device.label;
            }else{
                opt.setAttribute('data-fallback-index',String(index+1));
                opt.textContent=t('cam.select.camera')+' '+(index+1);
            }
            select.appendChild(opt);
        });
        startDesktopCameraStream(DesktopCamera.devices[0].deviceId);
    })
    .catch(function(err){
        setDesktopCameraStatus('cam.permission.denied',true);
        log(t('cam.access.error')+': '+(err&&err.message||err),'error');
    });
}

function startDesktopCameraStream(deviceId){
    stopDesktopCameraStream();
    setDesktopCameraStatus('cam.requesting',true);
    var videoSettings={width:{ideal:1920},height:{ideal:1080}};
    if(deviceId)videoSettings.deviceId={exact:deviceId};
    navigator.mediaDevices.getUserMedia({video:videoSettings})
    .then(function(stream){
        DesktopCamera.stream=stream;
        var video=$('dCamVideo');
        video.srcObject=stream;
        video.classList.add('active');
        video.classList.toggle('mirrored',DesktopCamera.mirrored);
        if(video.play)video.play().catch(function(){});
        setDesktopCameraStatus('cam.requesting',false);
    })
    .catch(function(err){
        setDesktopCameraStatus('cam.permission.denied',true);
        log(t('cam.stream.error')+': '+(err&&err.message||err),'error');
    });
}

function captureDesktopCameraFrame(){
    var video=$('dCamVideo');
    if(!video||!video.videoWidth){
        showAlert(t('cam.studio.title'),t('cam.requesting'),'\u26a0\ufe0f');
        return;
    }
    var canvas=$('dCamCanvas');
    var ctx=canvas.getContext('2d');
    if(!ctx)return;
    canvas.width=video.videoWidth;
    canvas.height=video.videoHeight;
    if(DesktopCamera.mirrored){
        ctx.translate(canvas.width,0);
        ctx.scale(-1,1);
    }
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    ctx.setTransform(1,0,0,1,0,0);
    DesktopCamera.capturedDataUrl=canvas.toDataURL('image/png');
    stopDesktopCameraStream();
    var img=$('dCamImg');
    img.src=DesktopCamera.capturedDataUrl;
    img.style.display='';
    $('dCamCapture').style.display='none';
    $('dCamRetake').style.display='';
    $('dCamUse').style.display='';
    $('dCamAdjust').style.display='flex';
    setDesktopCameraStatus(DesktopCamera.statusKey,false);
    initDesktopCameraCrop();
    log(t('cam.captured'),'success');
}

function useDesktopCameraCapture(){
    if(!DesktopCamera.capturedDataUrl)return;
    applyDesktopCameraAdjustments(DesktopCamera.capturedDataUrl,function(adjustedUrl,fullW,fullH){
        var area=$('dCamPreview');
        var box=$('dCamCropBox');
        var imgEl=$('dCamImg');
        var sx=0,sy=0,sw=fullW,sh=fullH;
        if(imgEl&&imgEl.style.display!=='none'&&box&&$('dCamCropOverlay').style.display!=='none'){
            var imgRect=imgEl.getBoundingClientRect();
            var areaRect=area.getBoundingClientRect();
            var dispW=imgRect.width,dispH=imgRect.height;
            if(dispW>0&&dispH>0){
                var dispX=imgRect.left-areaRect.left;
                var dispY=imgRect.top-areaRect.top;
                var bx=box.offsetLeft-dispX;
                var by=box.offsetTop-dispY;
                var bw=box.offsetWidth;
                var bh=box.offsetHeight;
                var scaleX=fullW/dispW,scaleY=fullH/dispH;
                sx=Math.max(0,Math.round(bx*scaleX));
                sy=Math.max(0,Math.round(by*scaleY));
                sw=Math.min(fullW-sx,Math.round(bw*scaleX));
                sh=Math.min(fullH-sy,Math.round(bh*scaleY));
                if(sw<10||sh<10){sx=0;sy=0;sw=fullW;sh=fullH;}
            }
        }
        var cropCanvas=document.createElement('canvas');
        cropCanvas.width=sw;
        cropCanvas.height=sh;
        var cropCtx=cropCanvas.getContext('2d');
        if(!cropCtx)return;
        var adjustedImg=new Image();
        adjustedImg.onload=function(){
            cropCtx.drawImage(adjustedImg,sx,sy,sw,sh,0,0,sw,sh);
            var file=dataUrlToFile(cropCanvas.toDataURL('image/png'),'camera_capture.png');
            if(!file){
                showAlert(t('cam.studio.title'),t('cam.file.build.error'),'\u274c');
                return;
            }
            loadImage(DesktopCamera.target==='ref'?'ref':'sample',file);
            log(DesktopCamera.target==='ref'?t('cam.assigned.ref'):t('cam.assigned.sample'),'success');
            closeDesktopCameraStudio();
        };
        adjustedImg.src=adjustedUrl;
    });
}

var _saveTimer=null;
function scheduleSave(){
    if(_saveTimer)clearTimeout(_saveTimer);
    _saveTimer=setTimeout(saveState,500);
}

/* ═══ Reset to Default ═══ */
function resetToDefault(){
    showConfirm(t('reset.title'),t('reset.msg'),'🔄',function(){
        /* Clear all persisted state */
        localStorage.removeItem(PERSIST_KEY);
        localStorage.removeItem('desk_lang');
        localStorage.removeItem('desk_theme');
        /* Reload the page — returns to first-run state */
        window.location.reload();
    });
}

/* ═══ Settings Input Validation ═══ */
document.addEventListener('change',function(e){
    var el=e.target;
    if(el.tagName!=='INPUT'||el.type!=='number')return;
    var mn=parseFloat(el.min),mx=parseFloat(el.max),v=parseFloat(el.value);
    if(isNaN(v)){el.value=el.defaultValue;return;}
    if(!isNaN(mn)&&v<mn)el.value=mn;
    if(!isNaN(mx)&&v>mx)el.value=mx;
});

/* ═══ Thesis Test Automation ═══ */
function confirmDeleteThesisDatabase(){
    if(!window.pywebview||!window.pywebview.api){
        showAlert('Error','Desktop API not available','⚠️');
        return;
    }
    var msg=t('thesis.delete.msg');
    var title=t('thesis.delete.title');
    var confirmText=t('thesis.delete.confirm');
    var cancelText=t('btn.cancel');
    
    var overlay=document.createElement('div');
    overlay.className='modal-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    var dialog=document.createElement('div');
    dialog.style.cssText='background:var(--bg-panel);border:1px solid var(--border);border-radius:8px;padding:24px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
    
    var titleEl=document.createElement('h3');
    titleEl.textContent=title;
    titleEl.style.cssText='font-size:15px;font-weight:600;color:var(--text);margin:0 0 12px 0;';
    
    var msgEl=document.createElement('p');
    msgEl.textContent=msg;
    msgEl.style.cssText='font-size:13px;color:var(--text-dim);margin:0 0 20px 0;line-height:1.5;';
    
    var btnRow=document.createElement('div');
    btnRow.style.cssText='display:flex;gap:10px;justify-content:flex-end;';
    
    var cancelBtn=document.createElement('button');
    cancelBtn.textContent=cancelText;
    cancelBtn.style.cssText='padding:6px 16px;border-radius:3px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    cancelBtn.addEventListener('click',function(){document.body.removeChild(overlay);});
    
    var confirmBtn=document.createElement('button');
    confirmBtn.textContent=confirmText;
    confirmBtn.style.cssText='padding:6px 16px;border-radius:3px;border:1px solid var(--error);background:var(--error);color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
    confirmBtn.addEventListener('click',function(){
        document.body.removeChild(overlay);
        deleteThesisDatabase();
    });
    
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    dialog.appendChild(titleEl);
    dialog.appendChild(msgEl);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

function deleteThesisDatabase(){
    if(!window.pywebview||!window.pywebview.api){
        showAlert('Error','Desktop API not available','⚠️');
        return;
    }
    log('Deleting thesis database...','warn');
    window.pywebview.api.delete_thesis_database()
        .then(function(result){
            if(result.success){
                log(t('thesis.delete.success'),'success');
                showAlert('Success',t('thesis.delete.success'),'✓');
            }else{
                log(t('thesis.delete.error')+': '+result.error,'error');
                showAlert('Error',result.error,'❌');
            }
        })
        .catch(function(err){
            log('ERROR: '+err.message,'error');
            showAlert('Error',err.message,'❌');
        });
}

function runThesisTest(){
    if(!window.pywebview||!window.pywebview.api){
        showAlert('Error','Desktop API not available','⚠️');
        return;
    }

    log('Starting automated thesis testing...','info');
    log('Collecting current desktop settings...','info');

    var currentSettings=collectSettings();
    /* Thesis output language follows the Report Language setting in General Settings. */
    log('Thesis report language: '+currentSettings.report_lang,'info');
    var currentRegionData=buildRegionData();

    var refFileInfo=null;
    var sampleFileInfo=null;
    if(State.refDataUrl||State.refFile){
        refFileInfo={
            path:State.refFile&&State.refFile.path||null,
            name:State.refFile&&State.refFile.name||'reference.png',
            dataUrl:State.refDataUrl||null
        };
    }
    if(State.sampleDataUrl||State.sampleFile){
        sampleFileInfo={
            path:State.sampleFile&&State.sampleFile.path||null,
            name:State.sampleFile&&State.sampleFile.name||'sample.png',
            dataUrl:State.sampleDataUrl||null
        };
    }

    if(!refFileInfo||!sampleFileInfo){
        /* ── Auto-load Ready-to-Test Pair 1 into viewer slots ── */
        log(t('thesis.rtt.autoload'),'warn');
        $('loadingTitle').textContent=t('loading.thesis.title');
        $('loadingText').textContent=t('thesis.rtt.loading');
        $('loadingOverlay').style.display='';

        var loaded=0, refRTT=null, sampleRTT=null;
        function _onBothRTTLoaded(){
            if(loaded<2)return;
            /* Populate viewer slots so the layout looks clean */
            if(State.singleMode){$('tbSingleMode').checked=false;State.singleMode=false;updateUI();}
            loadImage('ref',refRTT);
            loadImage('sample',sampleRTT);
            log(t('thesis.rtt.autoloaded'),'success');
            $('loadingText').textContent=t('thesis.rtt.starting');
            /* Proceed after a brief pause so the viewer can render */
            setTimeout(function(){
                _proceedWithThesisTest(currentSettings,currentRegionData,
                    {path:null,name:'1.png',dataUrl:null},
                    {path:null,name:'2.png',dataUrl:null});
            },700);
        }
        fetchReadyImage('1.png',function(file){refRTT=file;loaded++;_onBothRTTLoaded();});
        fetchReadyImage('2.png',function(file){sampleRTT=file;loaded++;_onBothRTTLoaded();});
    }else{
        log('Using current workspace images for testing','info');
        $('loadingTitle').textContent=t('loading.thesis.title');
        $('loadingText').textContent=t('loading.thesis.stage.init');
        $('loadingOverlay').style.display='';
        _proceedWithThesisTest(currentSettings,currentRegionData,refFileInfo,sampleFileInfo);
    }
}

function _proceedWithThesisTest(currentSettings,currentRegionData,refFileInfo,sampleFileInfo){
    /* Stage-specific loading messages — update text as each technique runs */
    var _stageTimers=[];
    function _clearStageTimers(){_stageTimers.forEach(clearTimeout);_stageTimers=[];}
    _stageTimers.push(setTimeout(function(){$('loadingText').textContent=t('loading.thesis.stage.direct');},3000));
    _stageTimers.push(setTimeout(function(){$('loadingText').textContent=t('loading.thesis.stage.ai');},20000));
    _stageTimers.push(setTimeout(function(){$('loadingText').textContent=t('loading.thesis.stage.bestch');},50000));
    _stageTimers.push(setTimeout(function(){$('loadingText').textContent=t('loading.thesis.stage.compiling');},75000));

    window.pywebview.api.run_thesis_tests(currentSettings,currentRegionData,refFileInfo,sampleFileInfo)
        .then(function(result){
            _clearStageTimers();
            $('loadingOverlay').style.display='none';
            if(result.cancelled){
                log('Thesis test cancelled by user','warn');
                return;
            }
            if(result.success){
                log('═══ Thesis Test Complete ═══','success');
                log('ZIP: '+result.zip_path,'info');
                log('PDFs: '+result.total_pdfs+' | Images: '+result.total_images,'info');
                if(result.techniques&&result.techniques.length){
                    result.techniques.forEach(function(tech){
                        if(tech.success){
                            log('['+tech.label+'] Decision='+tech.decision
                                +' | Color='+parseFloat(tech.color_score||0).toFixed(1)
                                +'  Pattern='+parseFloat(tech.pattern_score||0).toFixed(1)
                                +'  PDFs='+tech.pdfs_saved+' Images='+tech.images_saved
                                +'  ('+tech.duration_seconds+'s)','success');
                        }else{
                            log('['+tech.label+'] FAILED: '+(tech.error||'unknown error'),'error');
                        }
                    });
                }
                showAlert('Thesis Tests Complete',
                    result.message+'\n\n'+result.total_pdfs+' PDFs and '+result.total_images+' images saved.\nZIP:\n'+result.zip_path,'✓');
            }else{
                log('Thesis test failed: '+(result.error||'Unknown error'),'error');
                showAlert('Error',result.error||'Thesis test failed','❌');
            }
        })
        .catch(function(err){
            _clearStageTimers();
            $('loadingOverlay').style.display='none';
            log('ERROR: '+(err.message||err),'error');
            showAlert('Error',(err.message||String(err)),'❌');
        });
}

/* ═══ Branded Image-Required Warning Dialog ═══ */
function _showImageRequiredDialog(title, msg){
    var overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(5px);z-index:10500;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;';
    var dialog=document.createElement('div');
    dialog.style.cssText='background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;padding:28px 32px 24px;max-width:400px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.6);';
    var iconRow=document.createElement('div');
    iconRow.style.cssText='display:flex;align-items:center;gap:12px;margin-bottom:14px;';
    var iconEl=document.createElement('div');
    iconEl.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    var titleEl=document.createElement('h3');
    titleEl.textContent=title;
    titleEl.style.cssText='font-size:14px;font-weight:700;color:var(--text);margin:0;';
    iconRow.appendChild(iconEl);iconRow.appendChild(titleEl);
    var msgEl=document.createElement('p');
    msgEl.textContent=msg;
    msgEl.style.cssText='font-size:12.5px;color:var(--text-dim);margin:0 0 22px 0;line-height:1.55;';
    var btnRow=document.createElement('div');
    btnRow.style.cssText='display:flex;justify-content:flex-end;';
    var okBtn=document.createElement('button');
    okBtn.textContent=t('btn.ok');
    okBtn.style.cssText='padding:7px 24px;border-radius:4px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:0.02em;transition:opacity 0.15s;';
    okBtn.addEventListener('mouseenter',function(){okBtn.style.opacity='0.85';});
    okBtn.addEventListener('mouseleave',function(){okBtn.style.opacity='1';});
    okBtn.addEventListener('click',function(){document.body.removeChild(overlay);});
    btnRow.appendChild(okBtn);
    dialog.appendChild(iconRow);dialog.appendChild(msgEl);dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
}

/* ═══ Alignment Auto-Apply to Workspace (v3.0.0) ═══
   When the user picks an alignment technique from the toolbar / properties
   dropdown OR confirms one inside SPACTRA Studio, run it on the current
   workspace images and swap the displayed previews so points can be placed
   on the processed result. Switching back to "direct" restores originals. */
var _alignAutoApply={inFlight:null,lastMode:null,loaderTimer:null};

/* ─── Loader UI for the alignment auto-apply ────────────────────────────
   Appears anchored to #panelViewer after a short delay so instant
   operations (e.g. "direct" restore) never flash a loader. Theme-aware
   via CSS vars; no percentage — only animated rings and a status line. */
function _showAlignLoader(mode){
    var host=document.getElementById('panelViewer');if(!host)return;
    var ov=document.getElementById('alignLoaderOverlay');
    if(!ov){
        ov=document.createElement('div');
        ov.id='alignLoaderOverlay';
        ov.className='align-loader-overlay';
        ov.innerHTML=''
            +'<div class="align-loader-card">'
            +'<div class="align-loader-ring"><i></i><i></i><i></i></div>'
            +'<div class="align-loader-title" id="alignLoaderTitle"></div>'
            +'<div class="align-loader-sub" id="alignLoaderSub"></div>'
            +'</div>';
        host.appendChild(ov);
    }
    var labelMap={ai_smart_match:'AI SmartMatch',bestch:'BESTCH',direct:'Direct Pixel'};
    var title=(typeof t==='function'?t('align.applying'):'')||'Applying alignment';
    var sub=(typeof t==='function'?t('align.processing'):'')||'Processing images, please wait…';
    document.getElementById('alignLoaderTitle').textContent=title+' — '+(labelMap[mode]||mode);
    document.getElementById('alignLoaderSub').textContent=sub;
    ov.classList.add('show');
}
function _hideAlignLoader(){
    var ov=document.getElementById('alignLoaderOverlay');
    if(ov)ov.classList.remove('show');
}
function _scheduleAlignLoader(mode){
    /* Wait 180ms before showing — fast operations don't flash a loader. */
    if(_alignAutoApply.loaderTimer){clearTimeout(_alignAutoApply.loaderTimer);}
    _alignAutoApply.loaderTimer=setTimeout(function(){_showAlignLoader(mode);},180);
}
function _clearAlignLoader(){
    if(_alignAutoApply.loaderTimer){
        clearTimeout(_alignAutoApply.loaderTimer);
        _alignAutoApply.loaderTimer=null;
    }
    _hideAlignLoader();
}

function _restoreOriginalWorkspace(){
    if(State.refDataUrlOriginal){
        State.refDataUrl=State.refDataUrlOriginal;
        State.refW=State.refWOriginal||State.refW;
        State.refH=State.refHOriginal||State.refH;
        var rname=State.refFile?State.refFile.name:'reference.png';
        showPreview('ref',State.refDataUrl,State.refW,State.refH,rname);
    }
    if(State.sampleDataUrlOriginal){
        State.sampleDataUrl=State.sampleDataUrlOriginal;
        State.sampleW=State.sampleWOriginal||State.sampleW;
        State.sampleH=State.sampleHOriginal||State.sampleH;
        var sname=State.sampleFile?State.sampleFile.name:'sample.png';
        showPreview('sample',State.sampleDataUrl,State.sampleW,State.sampleH,sname);
    }
    updateSliderMax();updateRegionOverlays();
}

function applyAlignmentToWorkspace(mode){
    mode=mode||'direct';
    if(_alignAutoApply.lastMode===mode)return;
    _alignAutoApply.lastMode=mode;

    if(mode==='direct'){_restoreOriginalWorkspace();_clearAlignLoader();return;}

    if(!State.refFile||!State.sampleFile){
        log(t('log.align.need.images')||'Load both images before applying an alignment technique','warn');
        _clearAlignLoader();
        return;
    }

    /* Always run alignment from the original images, never the previously aligned result */
    var refBase=State.refDataUrlOriginal||State.refDataUrl;
    var samBase=State.sampleDataUrlOriginal||State.sampleDataUrl;
    if(!refBase||!samBase)return;

    var fd=new FormData();
    fd.append('mode',mode);
    fd.append('region_data',JSON.stringify(buildRegionData()||{}));

    function _dataUrlToBlob(dataUrl){
        var parts=dataUrl.split(',');
        var meta=parts[0];var b64=parts[1];
        var mime=(meta.match(/data:([^;]+)/)||[])[1]||'image/png';
        var bin=atob(b64);var arr=new Uint8Array(bin.length);
        for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
        return new Blob([arr],{type:mime});
    }

    try{
        fd.append('ref_image',_dataUrlToBlob(refBase),(State.refFile&&State.refFile.name)||'ref.png');
        fd.append('sample_image',_dataUrlToBlob(samBase),(State.sampleFile&&State.sampleFile.name)||'sample.png');
    }catch(err){log('Alignment auto-apply: failed to package images: '+err.message,'error');return;}

    if(_alignAutoApply.inFlight){try{_alignAutoApply.inFlight.abort();}catch(e){}}
    var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
    _alignAutoApply.inFlight=ctrl;

    log(t('log.align.applying')||('Applying alignment: '+mode),'info');
    _scheduleAlignLoader(mode);

    fetch('/api/alignment/preview',{method:'POST',body:fd,signal:ctrl?ctrl.signal:undefined})
        .then(function(r){return r.json();})
        .then(function(data){
            _alignAutoApply.inFlight=null;
            _clearAlignLoader();
            if(!data||!data.success||!data.previews){
                log((data&&data.error)||'Alignment preview failed','error');
                return;
            }
            var p=data.previews;
            var newRefSrc=p.ref_cropped?'data:image/png;base64,'+p.ref_cropped
                          :(p.ref_source?'data:image/png;base64,'+p.ref_source:null);
            var alignedSrc=p.aligned?'data:image/png;base64,'+p.aligned:null;

            function _apply(which,src,wKey,hKey,urlKey){
                if(!src)return;
                var img=new Image();
                img.onload=function(){
                    State[wKey]=img.naturalWidth;State[hKey]=img.naturalHeight;
                    State[urlKey]=src;
                    var fname=which==='ref'
                        ?(State.refFile?State.refFile.name:'reference.png')
                        :(State.sampleFile?State.sampleFile.name:'aligned_sample.png');
                    showPreview(which,src,img.naturalWidth,img.naturalHeight,fname);
                    updateSliderMax();updateRegionOverlays();
                };
                img.src=src;
            }
            _apply('ref',newRefSrc,'refW','refH','refDataUrl');
            _apply('sample',alignedSrc,'sampleW','sampleH','sampleDataUrl');
            log(t('log.align.applied')||('Alignment applied: '+mode),'success');
        })
        .catch(function(err){
            _alignAutoApply.inFlight=null;
            _clearAlignLoader();
            if(err&&err.name==='AbortError')return;
            log('Alignment preview error: '+err.message,'error');
        });
}

/* ═══ SPACTRA Studio (v3.0.0) ═══ */
function openAlignmentStudio(){
    if(typeof AlignmentStudio==='undefined'){log('AlignmentStudio module not loaded','error');return;}
    if(!State.refFile||!State.sampleFile){
        log(t('alignment.no.images.title')+': '+t('alignment.no.images.msg'),'warn');
        _showImageRequiredDialog(t('alignment.no.images.title'),t('alignment.no.images.msg'));
        return;
    }
    var refSrc=State.refDataUrl||null;
    var sampleSrc=State.sampleDataUrl||null;
    var refFile=State.refFile||null;
    var sampleFile=State.sampleFile||null;
    var regionData=buildRegionData();
    AlignmentStudio.open({
        refSrc:refSrc,sampleSrc:sampleSrc,
        refFile:refFile,sampleFile:sampleFile,
        regionData:regionData,isDesktop:true,
        onApply:function(applyData){
            var techId=applyData.techId;
            var previews=applyData.previews;
            if(!previews||techId==='direct')return;

            var alignedSrc=previews.aligned?'data:image/png;base64,'+previews.aligned:null;
            var newRefSrc=previews.ref_cropped
                ?'data:image/png;base64,'+previews.ref_cropped
                :(previews.ref_source?'data:image/png;base64,'+previews.ref_source:null);

            function _applyPreview(which,src,stateKey,wKey,hKey){
                if(!src)return;
                var img=new Image();
                img.onload=function(){
                    var w=img.naturalWidth,h=img.naturalHeight;
                    State[stateKey]=src;
                    State[wKey]=w;State[hKey]=h;
                    var fname=which==='ref'
                        ?(State.refFile?State.refFile.name:'reference.png')
                        :(State.sampleFile?State.sampleFile.name:'aligned_sample.png');
                    showPreview(which,src,w,h,fname);
                    updateSliderMax();
                };
                img.src=src;
            }
            _applyPreview('ref',newRefSrc,'refDataUrl','refW','refH');
            _applyPreview('sample',alignedSrc,'sampleDataUrl','sampleW','sampleH');
        }
    });
}

/* ═══ Calibration ═══ */
function runCalibration(){
    if(typeof AlignmentStudio!=='undefined'&&AlignmentStudio.runCalibration){
        log('Starting calibration — testing all alignment techniques...','info');
        AlignmentStudio.runCalibration();
    } else {
        log('AlignmentStudio module not loaded — open SPACTRA Studio first','error');
    }
}
function downloadCalibrationReport(){
    if(typeof AlignmentStudio!=='undefined'&&AlignmentStudio.downloadCalibrationReport){
        log('Downloading calibration report...','info');
        AlignmentStudio.downloadCalibrationReport();
    } else {
        log('AlignmentStudio module not loaded — open SPACTRA Studio first','error');
    }
}

/* ═══ Public API (for inline onclick) ═══ */
return {closeAlert:function(){$('alertDialog').style.display='none';},
        saveAs:saveAsDownload,
        resetToDefault:resetToDefault,
        openDesktopCameraStudio:openDesktopCameraStudio,
        openAlignmentStudio:openAlignmentStudio,
        runCalibration:runCalibration,
        downloadCalibrationReport:downloadCalibrationReport,
        log:log};
})();
