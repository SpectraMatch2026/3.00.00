; ============================================================
; SpectraMatch — Inno Setup Installer Script
; ============================================================
; Produces a professional Windows installer with:
;   - Welcome page with logo
;   - License agreement
;   - Installation path selection
;   - Desktop & Start Menu shortcuts
;   - Uninstaller
;
; Prerequisites:
;   1. Run  pyinstaller installer/spectramatch.spec  (creates dist/SpectraMatch/)
;   2. Open this .iss in Inno Setup Compiler and click Build
;      OR run:  iscc installer/spectramatch_setup.iss
; ============================================================

#define MyAppName "SpectraMatch"
#define MyAppVersion "3.0.0"
#define MyAppPublisher "SpectraMatch"
#define MyAppURL "https://abdelbary.com"
#define MyAppExeName "SpectraMatch.exe"

[Setup]
AppId={{B8F3A7D2-4E5C-4A1B-9D8E-6F2C1A3B5D7E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
LicenseFile=LICENSE.txt
OutputDir=output
OutputBaseFilename=SpectraMatch_Setup_{#MyAppVersion}
SetupIconFile=spectramatch.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=110,110
DisableWelcomePage=no
DisableProgramGroupPage=yes
ShowLanguageDialog=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Branding colors (Inno Setup modern style)
WizardImageFile=wizard_image.bmp
WizardSmallImageFile=wizard_small.bmp

; Minimum Windows version (Windows 10+)
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[CustomMessages]
english.CreateStartMenuShortcut=Create a Start Menu shortcut
turkish.CreateStartMenuShortcut=Başlat Menüsü kısayolu oluştur

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startmenuicon"; Description: "{cm:CreateStartMenuShortcut}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Include the entire PyInstaller output folder
Source: "..\dist\SpectraMatch\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; High-quality icon file for shortcuts (avoids pixelation from EXE-embedded icon)
Source: "spectramatch.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\spectramatch.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\spectramatch.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\__pycache__"
Type: filesandordirs; Name: "{app}\uploads"

[Code]
// Custom welcome message
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
