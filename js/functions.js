var BrowserWindow = require("browser-window");
var fs = require("fs");
var crypto = require('crypto');
var dialog = require('dialog');

var from_taikojiro_exe_path = "";
var to_taikojiro_exe_path = "";
var copy_paths = [];


var taikojiro_path_setter = function(path, mode){
	if(mode == "from"){
		from_taikojiro_exe_path = path;
	}else{
		to_taikojiro_exe_path = path;
	}
};

var open_file_dialog = function(title, filter, callback){
	var win = BrowserWindow.getFocusedWindow();
	
	dialog.showOpenDialog(
		win,
		// どんなダイアログを出すかを指定するプロパティ
		{
			properties: [title],
			filters: [
				{
					name: 'file',
					extensions: filter
				}
			]
		},
		//ダイアログが閉じられた後のコールバック関数
		function (filenames) {
			if(typeof filenames != "undefined"){
				callback(filenames[0].replace(/\\/g, "/"));
			}else{
				callback("not_selected");
			}
		}
	);
};

//セーブデータのマッチングをする
var match_savedata = function(webContents){
	var from_jiro_path = from_taikojiro_exe_path.replace("/taikojiro.exe", "");
	var to_jiro_path = to_taikojiro_exe_path.replace("/taikojiro.exe", "");
	
	//セーブデータを列挙する
	var savedatas = get_files(from_jiro_path, ".*\.dat");
	
	//セーブデータから譜面かメドレーのMD5を求める
	savedatas.forEach(function(obj, i){
		var tja_hash = get_MD5_from_file(obj.replace(".dat", ".tja"));
		if(tja_hash != "ENOENT"){
			savedatas[i] = {path: obj, hash: tja_hash};
			return;
		}
		
		var tjc_hash = get_MD5_from_file(obj.replace(".dat", ".tjc"));
		if(tjc_hash != "ENOENT"){
			savedatas[i] = {path: obj, hash: tjc_hash};
			return;
		}
	});
	
	//譜面かメドレーを列挙する
	var tja_tjcs = get_files(to_jiro_path, ".*\.(tja|tjc)");
	
	//MD5を求める
	tja_tjcs.forEach(function(obj, i){
		tja_tjcs[i] = {path: obj, hash: get_MD5_from_file(obj)};
	});
	
	//マッチングする
	copy_paths = [];
	var err_paths = [];
	
	savedatas.forEach(function(obj){
		//ハッシュでマッチング
		var match_hash_tja_tjcs = [];
		tja_tjcs.forEach(function(obj_){
			if(obj.hash == obj_.hash){
				match_hash_tja_tjcs.push(obj_);
			}
		});
		
		//現在のセーブデータのハッシュと一致したtja_tjcsが一つか
		if(match_hash_tja_tjcs.length == 1){
			//一つなら
			//そのtja_tjcsとマッチング
			copy_paths.push({
				from: obj.path, 
				to: match_hash_tja_tjcs[0].path.replace(/\.(tja|tjc)/, ".dat")
			});
		}else if(match_hash_tja_tjcs.length >= 2){
			//二つ以上なら
			//その中からファイル名でマッチング
			var match_name_tja_tjcs = [];
			match_hash_tja_tjcs.forEach(function(obj__){
				if(obj.path.match(/^.*\/(.*)\..*?$/)[1] == obj__.path.match(/^.*\/(.*)\..*?$/)[1]){
					match_name_tja_tjcs.push(obj__);
				}
			});
			
			//現在のセーブデータのファイル名と一致したtja_tjcsが一つか
			if(match_name_tja_tjcs.length == 1){
				//一つなら
				//そのtja_tjcsとマッチング
				copy_paths.push({
					from: obj.path,
					to: match_name_tja_tjcs[0].path.replace(/\.(tja|tjc)/, ".dat")
				});
			}else if(match_name_tja_tjcs.length >= 2){
				//二つ以上なら
				//その中から相対ディレクトリ名でマッチング
				var match_dir_tja_tjcs = [];
				match_name_tja_tjcs.forEach(function(obj___){
					if(obj.path.replace(from_jiro_path, "").match(/^(.*\/).*?$/)[1] == obj___.path.replace(to_jiro_path, "").match(/^(.*\/).*?$/)[1]){
						match_dir_tja_tjcs.push(obj___);
					}
				});
				
				//現在のセーブデータの相対ディレクトリ名と一致したtja_tjcsが一つか
				if(match_dir_tja_tjcs.length == 1){
					//一つなら
					//そのtja_tjcsとマッチング
					copy_paths.push({
						from: obj.path,
						to: match_dir_tja_tjcs[0].path.replace(/\.(tja|tjc)/, ".dat")
					});
				}else{
					//一つも無いか、二つ以上なら、エラーに加える。
					err_paths.push({path: obj.path});
				}
			}else{
				//一つもないなら
				//新たに相対ディレクトリ名でマッチング
				var match_dir_tja_tjcs = [];
				match_hash_tja_tjcs.forEach(function(obj___){
					if(obj.path.replace(from_jiro_path, "").match(/^(.*\/).*?$/)[1] == obj___.path.replace(to_jiro_path, "").match(/^(.*\/).*?$/)[1]){
						match_dir_tja_tjcs.push(obj___);
					}
				});
				
				//現在のセーブデータの相対ディレクトリ名と一致したtja_tjcsが一つか
				if(match_dir_tja_tjcs.length == 1){
					//一つなら
					//そのtja_tjcsとマッチング
					copy_paths.push({
						from: obj.path, 
						to: match_dir_tja_tjcs[0].path.replace(/\.(tja|tjc)/, ".dat")
					});
				}else{
					//一つも無いか、二つ以上なら、エラーに加える。
					err_paths.push({path: obj.path});
				}
			}
		}else{
			//一つもな無いなら、エラーに加える。
			err_paths.push({path: obj.path});
		}
	});
	
	//結果を表示する
	webContents.send("change_panel", "#select_taikojiro_exe", "#check_copy");
	webContents.send("set_text_info", "<span style='font-size: 150%'>" + savedatas.length + "個中、" + copy_paths.length + "個のセーブデータが移動可能です。</span><br><span style='font-size: 80%'>※移動先に同じ名前のセーブデータが既に存在する場合、確認無しに上書きされます。</span>");
	if(copy_paths.length > 0)webContents.send("set_table", "#copy_table", [["引越し前", "from"], ["引越し先", "to"]], copy_paths);
	if(err_paths.length > 0)webContents.send("set_table", "#err_table", [["セーブデータ名", "path"]], err_paths);
};

//コピーを実行する
var start_copy = function(webContents){
	copy_paths.forEach(function(obj){
		file_copy(obj.from, obj.to);
	});
	
	webContents.send("change_panel", "#check_copy", "#done");
};

//ファイルからMD5を計算する
var get_MD5_from_file = function(path){
	var content;
	try{
		content = fs.readFileSync(path);
	}catch(e){
		return e.code;
	}
	var md5 = crypto.createHash("md5");
	
	md5.update(content);
	
	return md5.digest("hex");
};

//ファイルをコピーする
var file_copy = function(from_path, to_path){
	if(to_path[to_path.length - 1] == "/"){
		to_path += from_path.match(/^.*\/(.*?)$/)[1];
	}
	
	fs.createReadStream(from_path).pipe(fs.createWriteStream(to_path));
};

//ファイルの一覧を配列で取得する
var get_files = function(dir, grep){
	var ans = [];
	
	fs.readdirSync(dir).forEach(function(obj){
		if(fs.statSync(dir + "/" + obj).isFile()){
			if(RegExp(grep).test(obj))ans.push(dir + "/" + obj);
		}else{
			get_files(dir + "/" + obj, grep).forEach(function(obj_){
				ans.push(obj_);
			});
		}
	});
	
	return ans;
};

exports.taikojiro_path_setter = taikojiro_path_setter;
exports.open_file_dialog = open_file_dialog;
exports.match_savedata = match_savedata;
exports.start_copy = start_copy;
exports.get_MD5_from_file = get_MD5_from_file;
exports.file_copy = file_copy;
exports.get_files = get_files;
