'use strict';

const {app, Menu, BrowserWindow, ipcMain} = require("electron");
var functions = require("./js/functions");
var mainWindow = null;


// 全てのウィンドウが閉じたら終了
app.on("window-all-closed", function(){
	if(process.platform != "darwin"){
		app.quit();
	}
});

// Electronの初期化完了後に実行
app.on("ready", function(){
	// メイン画面の表示。ウィンドウの幅、高さを指定できる
	mainWindow = new BrowserWindow({width: 800, height: 500, resizable: false, center: true, autoHideMenuBar: true});
	mainWindow.loadURL("file://" + __dirname + "/index.html");
	
	// ウィンドウが閉じられたらアプリも終了
	mainWindow.on("closed", function(){
		mainWindow = null;
	});
});

//ipcハンドラを定義
ipcMain.on("get_jiro_path", function(event){
	functions.open_file_dialog("太鼓さん次郎の実行ファイルを選択してください", ["exe"], function(path){
		event.returnValue = path;
	});
});

ipcMain.on("set_taikojiro_path", function(event, path, mode){
	functions.taikojiro_path_setter(path, mode);
});

ipcMain.on("match_savedata", function(event){
	functions.match_savedata(mainWindow.webContents);
});

ipcMain.on("start_copy", function(event){
	functions.start_copy(mainWindow.webContents);
});

ipcMain.on("app_quit", function(event){
	app.quit();
});

//メニューバーを定義
var menu = Menu.buildFromTemplate([
	{
		label: "File",
		submenu: [
			{
				label: "Quit",
				click: function(){
					app.quit();
				}
			}
		]
	}
]);
Menu.setApplicationMenu(menu);
	
