cd..
call electron-packager move_jiro_savedata move_jiro_savedata --platform=win32 --arch=x64 --version=0.36.1 --icon=move_jiro_savedata/app.ico
move move_jiro_savedata-win32-x64 move_jiro_savedata\move_jiro_savedata-win32-x64
"C:\Program Files (x86)\Lhaplus\Lhaplus.exe" /o:C:\Users\b1015208\Documents\GitHub\move_jiro_savedata /c:zip move_jiro_savedata\move_jiro_savedata-win32-x64
cd move_jiro_savedata
rmdir /s /q move_jiro_savedata-win32-x64
