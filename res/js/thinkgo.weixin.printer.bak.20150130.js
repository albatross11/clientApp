/*主应用js by www.nowthinkgo.com aggic */
function b64enc(data) {
	var b = new Buffer(data, 'binary');
	return b.toString('base64');
}
if (typeof(printer) == "undefined")
	printer = {};
printer = {
	'os' : require('os'), //系统库
	'fs' : require('fs'), //文件读写库
	'qs' : require('querystring'),
	'path' : require('path'), //path库
	'exec' : require('child_process').exec, //子进程执行库
	'appConfig' : require('./configs'), //应用配置文件
	'log4js' : require('log4js'), //日志库
	'log' : {}, //日志对象
	'crypto' : require('crypto'), //加密解密对象
	'upDateInit' : function (callnext) { //自动升级
		var appPath = printer.fs.realpathSync('.');
		var _upUrl = printer.appConfig.api.server;
		_upUrl += '/api/update?' + new Date().getTime();

		var updateDown = function (file, callback) {
			var upCmd = 'wget -O ../' + file + '  ' + printer.appConfig.api.server + '/update/' + file;
			var opt = {
				encoding : 'utf8',
				timeout : 0,
				maxBuffer : 200 * 1024,
				killSignal : 'SIGTERM',
				cwd : 'cmd',
				env : null
			};
			printer.exec(upCmd, opt, function (err, stdout, stderr) {
				if (err) {
					printer.log.wget.fatal('下载升级文件' + file + '失败' + err);
				} else {
					printer.log.wget.info('下载升级文件' + file + '成功' + stderr);
				}
				callback(err, stdout, stderr);
			});
		};
		var execUpdate = function (file, callback) {
			var opt = {
				encoding : 'utf8',
				timeout : 0,
				maxBuffer : 200 * 1024,
				killSignal : 'SIGTERM',
				cwd : '',
				env : null
			};
			printer.exec(file, opt, function (err, stdout, stderr) {
				if (err) {
					printer.log.other.fatal('升级' + file + '失败' + err);
				} else {
					printer.log.other.info('升级' + file + '成功' + stderr);
				}
				callback(err, stdout, stderr);
			});
		};
		var maskUpdate = function () {
			$('body div.sysUpdate').remove();
			var str = '<div class="sysUpdate">';
			str += '<div class="loading"><div class="progress"><span></span><p>系统自动升级中，请稍候。。。</p></div></div>';
			str += '</div>';
			$('body').append(str);
		};
		$.get(_upUrl, function (_upData) {
			var doUpdateDown = function (name) {
				maskUpdate();
				updateDown(name, function (err, stdout, stderr) {
					if (!err) {
						execUpdate(name, function (err1, stdout1, stderr1) {
							//console.log(err1,stdout1,stderr1);
							printer.updateState[name].sta = true;
							//console.log(printer.updateState[name].sta);
						});
					}
					//console.log(err, stdout, stderr);
				});
			}
			$.each(_upData, function (i, e) {
				_upData[i].sta = false;
			});
			printer.updateState = _upData;
			callnext(callnext);
			$.each(_upData, function (i, e) {
				//printer.updateState[e.name]=false;
				printer.fs.exists(appPath + '\\' + e.name, function (ex) {
					if (ex) {
						var stat = printer.fs.statSync(appPath + '\\' + e.name);
						if (stat.size != e.size) {
							printer.updateState[e.name].sta = false;
							//console.log(printer.updateState[name].sta);
							doUpdateDown(e.name);
						} else {
							printer.updateState[e.name].sta = true;
							//console.log(printer.updateState[e.name].sta);
						}
					} else {
						printer.updateState[e.name].sta = false;
						//console.log(printer.updateState[e.name].sta);
						doUpdateDown(e.name);
					}
				});
			});
		});
	},
	'heartBeatInit' : function () { //客户端心跳
		printer.heartBeat = setInterval(function () {
				var _url = printer.appConfig.api.server,
				_machineNo = printer.appConfig.sevice.machineNo;
				_url += '/api/heartBeat/' + _machineNo + '/' + new Date().getTime();
				console.log(_url);
				$.get(_url, function (heartData) {
					console.log(url, heartData);
				}, 'json');
			}, printer.appConfig.sevice.heartBeatTimer);
	},
	'uploadService' : function () { //后端服务
		var p = printer;
		//printer.localIp=printer.getLocalIP();						//终端ip
		var logger = p.log.servers,
		port = {
			'http' : 0,
			'upload' : 0
		},
		fs = p.fs,
		$dirname = p.fs.realpathSync('.'),
		mine = p.appConfig.mine,
		path = p.path,
		http = require('http'),
		https = require('https'),
		url = require('url'),
		_existsSync = fs.existsSync || path.existsSync,
		formidable = require('formidable'),
		nodeStatic = require('node-static'),
		imageMagick = require('imagemagick'),
		options = {
			tmpDir : $dirname + '/tmp',
			publicDir : $dirname + '/public',
			uploadDir : $dirname + '/public/files',
			uploadUrl : '/files/',
			maxPostSize : 11000000000, // 11 GB
			minFileSize : 1,
			maxFileSize : 10000000000, // 10 GB
			acceptFileTypes : /.+/i,
			inlineFileTypes : /\.(gif|jpe?g|png)$/i,
			imageTypes : /\.(gif|jpe?g|png)$/i,
			imageVersions : {
				'thumbnail' : {
					width : 80,
					height : 80
				}
			},
			accessControl : {
				allowOrigin : '*',
				allowMethods : 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
				allowHeaders : 'Content-Type, Content-Range, Content-Disposition'
			},
			/* Uncomment and edit this section to provide the service via HTTPS:
			ssl: {
			key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
			cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
			},
			 */
			nodeStatic : {
				cache : 3600 // seconds to cache served files
			}
		},
		utf8encode = function (str) {
			return unescape(encodeURIComponent(str));
		},
		fileServer = new nodeStatic.Server(options.publicDir, options.nodeStatic),
		nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
		nameCountFunc = function (s, index, ext) {
			return '_' + ((parseInt(index, 10) || 0) + 1) + '_' + (ext || '');
		},
		FileInfo = function (file) {
			this.name = file.name;
			this.size = file.size;
			this.type = file.type;
			this.deleteType = 'DELETE';
		},
		UploadHandler = function (req, res, callback) {
			this.req = req;
			this.res = res;
			this.callback = callback;
		},
		serve = function (req, res) {
			res.setHeader(
				'Access-Control-Allow-Origin',
				options.accessControl.allowOrigin);
			res.setHeader(
				'Access-Control-Allow-Methods',
				options.accessControl.allowMethods);
			res.setHeader(
				'Access-Control-Allow-Headers',
				options.accessControl.allowHeaders);
			var handleResult = function (result, redirect) {
				if (redirect) {
					res.writeHead(302, {
						'Location' : redirect.replace(
							/%s/,
							encodeURIComponent(JSON.stringify(result)))
					});
					res.end();
				} else {
					res.writeHead(200, {
						'Content-Type' : req.headers.accept
						.indexOf('application/json') !== -1 ?
						'application/json' : 'text/plain'
					});
					res.end(JSON.stringify(result));
				}
			},
			setNoCacheHeaders = function () {
				res.setHeader('Pragma', 'no-cache');
				res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
				res.setHeader('Content-Disposition', 'inline; filename="files.json"');
			},
			handler = new UploadHandler(req, res, handleResult);
			switch (req.method) {
			case 'OPTIONS':
				res.end();
				break;
			case 'HEAD':
			case 'GET':
				if (req.url === '/') {
					setNoCacheHeaders();
					if (req.method === 'GET') {
						handler.get();
					} else {
						res.end();
					}
				} else {
					fileServer.serve(req, res);
				}
				break;
			case 'POST':
				setNoCacheHeaders();
				handler.post();
				break;
			case 'DELETE':
				handler.destroy();
				break;
			default:
				res.statusCode = 405;
				res.end();
			}
		};
		fileServer.respond = function (pathname, status, _headers, files, stat, req, res, finish) {
			// Prevent browsers from MIME-sniffing the content-type:
			_headers['X-Content-Type-Options'] = 'nosniff';
			if (!options.inlineFileTypes.test(files[0])) {
				// Force a download dialog for unsafe file extensions:
				_headers['Content-Type'] = 'application/octet-stream';
				_headers['Content-Disposition'] = 'attachment; filename="' +
					utf8encode(path.basename(files[0])) + '"';
			}
			nodeStatic.Server.prototype.respond
			.call(this, pathname, status, _headers, files, stat, req, res, finish);
		};
		FileInfo.prototype.validate = function () {
			if (options.minFileSize && options.minFileSize > this.size) {
				this.error = 'File is too small';
			} else if (options.maxFileSize && options.maxFileSize < this.size) {
				this.error = 'File is too big';
			} else if (!options.acceptFileTypes.test(this.name)) {
				this.error = 'Filetype not allowed';
			}
			return !this.error;
		};
		FileInfo.prototype.safeName = function () {
			// Prevent directory traversal and creating hidden system files:
			this.name = path.basename(this.name).replace(/^\.+/, '');
			// Prevent overwriting existing files:
			while (_existsSync(options.uploadDir + '/' + this.name)) {
				this.name = this.name.replace(nameCountRegexp, nameCountFunc);
			}
			//this.name=this.name.replace(/[ ]/,'');
			//console.log(this.name);
		};
		FileInfo.prototype.initUrls = function (req) {
			if (!this.error) {
				var that = this,
				baseUrl = (options.ssl ? 'https:' : 'http:') +
				'//' + req.headers.host + options.uploadUrl;
				this.url = this.deleteUrl = baseUrl + encodeURIComponent(this.name);
				Object.keys(options.imageVersions).forEach(function (version) {
					if (_existsSync(
							options.uploadDir + '/' + version + '/' + that.name)) {
						that[version + 'Url'] = baseUrl + version + '/' +
							encodeURIComponent(that.name);
					}
				});
			}
		};
		UploadHandler.prototype.get = function () {
			var handler = this,
			files = [];
			fs.readdir(options.uploadDir, function (err, list) {
				list.forEach(function (name) {
					var stats = fs.statSync(options.uploadDir + '/' + name),
					fileInfo;
					if (stats.isFile() && name[0] !== '.') {
						fileInfo = new FileInfo({
								name : name,
								size : stats.size
							});
						fileInfo.initUrls(handler.req);
						files.push(fileInfo);
					}
				});
				handler.callback({
					files : files
				});
			});
		};
		UploadHandler.prototype.post = function () {
			var handler = this,
			form = new formidable.IncomingForm(),
			tmpFiles = [],
			files = [],
			map = {},
			counter = 1,
			redirect,
			finish = function () {
				counter -= 1;
				if (!counter) {
					files.forEach(function (fileInfo) {
						fileInfo.initUrls(handler.req);
					});
					handler.callback({
						files : files
					}, redirect);
				}
			};
			form.uploadDir = options.tmpDir;
			form.on('fileBegin', function (name, file) {
				tmpFiles.push(file.path);
				var fileInfo = new FileInfo(file, handler.req, true);
				fileInfo.safeName();
				map[path.basename(file.path)] = fileInfo;
				files.push(fileInfo);
			}).on('field', function (name, value) {
				if (name === 'redirect') {
					redirect = value;
				}
			}).on('file', function (name, file) {
				var fileInfo = map[path.basename(file.path)];
				fileInfo.size = file.size;
				if (!fileInfo.validate()) {
					fs.unlink(file.path);
					return;
				}
				fs.renameSync(file.path, options.uploadDir + '/' + fileInfo.name);
				if (options.imageTypes.test(fileInfo.name)) {
					Object.keys(options.imageVersions).forEach(function (version) {
						counter += 1;
						var opts = options.imageVersions[version];
						imageMagick.resize({
							width : opts.width,
							height : opts.height,
							srcPath : options.uploadDir + '/' + fileInfo.name,
							dstPath : options.uploadDir + '/' + version + '/' +
							fileInfo.name
						}, finish);
					});
				}
			}).on('aborted', function () {
				tmpFiles.forEach(function (file) {
					fs.unlink(file);
				});
			}).on('error', function (e) {
				logger.error(e);
			}).on('progress', function (bytesReceived, bytesExpected) {
				if (bytesReceived > options.maxPostSize) {
					handler.req.connection.destroy();
				}
			}).on('end', finish).parse(handler.req);
		};
		UploadHandler.prototype.destroy = function () {
			var handler = this,
			fileName;
			if (handler.req.url.slice(0, options.uploadUrl.length) === options.uploadUrl) {
				fileName = path.basename(decodeURIComponent(handler.req.url));
				if (fileName[0] !== '.') {
					fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
						Object.keys(options.imageVersions).forEach(function (version) {
							fs.unlink(options.uploadDir + '/' + version + '/' + fileName);
						});
						handler.callback({
							success : !ex
						});
					});
					return;
				}
			}
			handler.callback({
				success : false
			});
		};
		if (options.ssl) {
			var uploadSSl = https.createServer(options.ssl, serve).listen(port.upload);
			uploadSSl.on('listening', function () {
				logger.info("Https Upload Sevice 服务在端口 " + uploadSSl.address().port + " 启动成功.");
				printer.appConfig.sevice.filePortSSL = uploadSSl.address().port;
			});
		} else {
			var uploadHttp = http.createServer(serve).listen(port.upload);
			uploadHttp.on('listening', function () {
				logger.info("Http Upload Sevice 服务在端口 " + uploadHttp.address().port + " 启动成功.");
				printer.appConfig.sevice.filePort = uploadHttp.address().port;
			});
		}

		var serverHttp = http.createServer(function (request, response) {
				var pathname = url.parse(request.url).pathname;
				if (pathname == "/")
					return false;
				if (pathname == "/frm/upok.json") {
					var getQuery = url.parse(request.url).query;
					var getData = printer.qs.parse(getQuery); //getData数据
					if (getData['img'] != '') {
						printer.homebtn._machine_upok(getData['img']);
					}
				}
				var realPath = path.join($dirname, pathname);
				var ext = path.extname(realPath);
				ext = ext ? ext.slice(1) : 'unknown';
				fs.exists(realPath, function (exists) {
					if (!exists) {
						logger.error('http 404 ' + realPath);
						response.writeHead(404, {
							'Content-Type' : 'text/plain'
						});
						response.write("This request URL " + pathname + " was not found on this server.");
						response.end();
					} else {
						fs.readFile(realPath, "binary", function (err, file) {
							if (err) {
								logger.error('http 500 ' + realPath);
								response.writeHead(500, {
									'Content-Type' : 'text/plain'
								});
								response.end(err);
							} else {
								//logger.info('http 200 '+realPath);
								var contentType = mine[ext] || "text/plain";
								response.writeHead(200, {
									'Content-Type' : contentType
								});
								response.write(file, "binary");
								response.end();
							}
						});
					}
				});
			});
		serverHttp.listen(port.http);
		serverHttp.on('listening', function () {
			logger.info("Http Service       服务在端口 " + serverHttp.address().port + " 启动成功.");
			printer.appConfig.sevice.httpPort = serverHttp.address().port;
		});
	},
	'getAds' : function () { //广告内容加载
		var appPath = printer.fs.realpathSync('.');
		var url = printer.appConfig.api.server + '/ad.js?' + new Date().getTime();
		url = 'ad.js';
		var getFromServer = function () {
			var s1,
			s2,
			_flesForDel1,
			_flesForDel2;
			var folder = printer.fs.readdir(appPath + '\\public\\video', function (err, files) {
					files = $.map(files, function (e, i) {
							if (e.toUpperCase() != "THUMBS.DB")
								return e;
						});
					_flesForDel1 = files;
					var _files = $.map(files, function (e, i) {
							var stat = printer.fs.statSync(appPath + '\\public\\video\\' + e);
							return e + stat.size;
						});
					_files.sort();
					s1 = _files.join('');
					$.get(printer.appConfig.api.server + '/api/video?' + new Date().getTime(), function (adsData) {
						var _flesForDel2 = $.map(adsData, function (e, i) {
								return i;
							});
						$.each(_flesForDel1, function (i, e) {
							var _t = '|' + _flesForDel2.join('|') + '|';
							if (_t.indexOf('|' + e + '|') == -1) {
								var _unpath = appPath + '\\public\\video\\' + e;
								printer.fs.exists(_unpath, function (ex) {
									if (ex)
										printer.fs.unlinkSync(_unpath);
								});
							}
						});
					});
				});

			$.get(printer.appConfig.api.server + '/api/video?' + new Date().getTime(), function (adsData) {
				var _filesServer = $.map(adsData, function (e, i) {
						return i + e.size;
					});
				_filesServer.sort();
				s2 = _filesServer.join('');
				//console.log(s2);
				var adsAllok = true;
				var adDown = function (file) {
					var adCmd = 'wget -O ../public/video/' + file + '  ' + printer.appConfig.api.server + '/video/' + file;
					//console.log(adCmd);
					var opt = {
						encoding : 'utf8',
						timeout : 0,
						maxBuffer : 200 * 1024,
						killSignal : 'SIGTERM',
						cwd : 'cmd',
						env : null
					};
					printer.exec(adCmd, opt, function (err, stdout, stderr) {
						if (err) {
							printer.log.wget.fatal('下载广告文件' + file + '失败' + err);
						} else {
							printer.log.wget.info('下载广告文件' + file + '成功' + stderr);
						}
					});
				};
				$.each(adsData, function (i, e) {
					var _localfile = appPath + '\\public\\video\\' + i;
					printer.fs.exists(_localfile, function (ex) {
						if (ex) {
							adsAllok = false;
							var stat = printer.fs.statSync(_localfile);
							if (stat.size != e.size)
								adDown(i);
						} else {
							adsAllok = false;
							adDown(i);
						}
					});
				});
				if (adsAllok) {
					if (s1 != s2) {
						$('#adsAutoBox').load('public/video/ad.html');
						$('#adsAutoBox').load('public/video/banner.html');
					}
				}
			});
			setTimeout(getFromServer, printer.appConfig.sevice.adUpdateTimer);
		};
		getFromServer();
	},
	'qrcode' : require('qrcode-js'), //二维码
	'decode' : function (v) { //解密算法
		var enc = printer.appConfig.enc;
		var cryptkey = printer.crypto.createHash('sha256').update(enc.key).digest();
		var decipher = printer.crypto.createDecipheriv('aes-256-cbc', cryptkey, enc.iv),
		decoded = decipher.update(v, 'base64', 'utf8');
		decoded += decipher.final('utf8');
		return decoded;
	},
	'encode' : function (v) { //加密算法
		var enc = printer.appConfig.enc;
		var cryptkey = printer.crypto.createHash('sha256').update(enc.key).digest();
		var encipher = printer.crypto.createCipheriv('aes-256-cbc', cryptkey, enc.iv),
		encoded = encipher.update(v, 'utf8', 'base64');
		encoded += encipher.final('base64');
		return encoded;
	},
	'token' : function (v) { //生成token
		var tk = printer.encode(printer.appConfig.enc.token + '|' + new Date().getTime());
		return tk;
	},
	'logInit' : function () { //初始化日志
		//初始变量
		var logArr = {
			'wget' : null,
			'wput' : null,
			'print' : null,
			'other' : null,
			'servers' : null
		},
		appenders = [{
				type : 'console'
			}
		];
		//日志配置变量串
		for (k in logArr) {
			logArr[k] = {
				'type' : 'file',
				'filename' : 'logs/' + k + '.log',
				'maxLogSize' : printer.appConfig.logConfig.logoSize,
				'backups' : 3,
				'category' : k
			};
			appenders.push(logArr[k]);
		};
		//日志配置
		printer.log4js.configure({
			'appenders' : appenders,
			'replaceConsole' : function () {
				return !printer.appConfig.development
			}
			()
		});
		//设置日志对象
		for (k in logArr) {
			printer.log[k] = printer.log4js.getLogger(k);
			printer.log[k].setLevel(printer.appConfig.logConfig.level);
		}
	},
	'winInit' : function () {
		var killCmd = 'taskkill /f /im explorer.exe';
		var opt = {
			encoding : 'utf8',
			timeout : 0,
			maxBuffer : 200 * 1024,
			killSignal : 'SIGTERM',
			cwd : 'cmd',
			env : null
		};
		printer.exec(killCmd, opt, function (err, stdout, stderr) {});
		var appPath = printer.fs.realpathSync('.'); //程序绝对路径
		var delCmd1 = 'del /q ' + appPath + '\\public\\photo\\*.*';
		var delCmd2 = 'del /q ' + appPath + '\\public\\files\\thumbnail\\*.*';
		var delCmd3 = 'del /q ' + appPath + '\\public\\files\\*.*';
		printer.exec(delCmd1, opt, function (err, stdout, stderr) {});
		printer.exec(delCmd2, opt, function (err, stdout, stderr) {});
		printer.exec(delCmd3, opt, function (err, stdout, stderr) {});
		var gui = require('nw.gui');
		var win = gui.Window.get();
		if (!printer.appConfig.development) {
			//win.enterFullscreen();				//全屏
			//win.setAlwaysOnTop(true);				//置顶
			//win.setResizable(true);				//缩放
			win.enterFullscreen();
		} else {
			//注入CTRL+LEFT CLICK
			var gui = require('nw.gui');
			var menu = new gui.Menu();
			var win = gui.Window.get();
			menu.append(new gui.MenuItem({
					label : '刷新'
				}));
			menu.append(new gui.MenuItem({
					label : '开发工具'
				}));
			menu.append(new gui.MenuItem({
					type : 'separator'
				}));
			menu.append(new gui.MenuItem({
					label : '全屏'
				}));
			menu.append(new gui.MenuItem({
					type : 'separator'
				}));
			menu.append(new gui.MenuItem({
					label : '系统升级'
				}));
			menu.items[0].click = function () {
				window.location.reload();
			};
			menu.items[1].click = function () {
				win.showDevTools();
			};
			menu.items[3].click = function () {
				if (!win.isFullscreen) {
					win.enterFullscreen();
				} else {
					win.leaveFullscreen();
				}
			};
			$('html').click(function (e) {
				if (e.ctrlKey) {
					menu.popup(e.clientX, e.clientY);
				}
			});
		}
	},
	'getFileByCode' : function (code, callback) { //根据威信码取得文件
		var appPath = printer.fs.realpathSync('.'); //程序绝对路径
		var getCmd = 'wget -O ../public/photo/' + code + '.jpg  ' + printer.appConfig.api.server + '/print/' + code + '.jpg';
		var delCmd = 'del ' + appPath + '\\public\\photo\\' + code + '.jpg';
		//console.log(getCmd);
		var opt = {
			encoding : 'utf8', //编码
			timeout : 0, //超时
			maxBuffer : 200 * 1024, //信息缓冲区
			killSignal : 'SIGTERM', //??
			cwd : 'cmd', //工作目录
			env : null //环境变量
		};
		// 使用exec执行wget命令
		var child = printer.exec(getCmd, opt, function (err, stdout, stderr) {
				if (err) {
					printer.log.wget.fatal(err);
					//删除下载失败后产生的0字节大小的文件
					printer.exec(delCmd, opt, function (err1, stdout1, stderr1) {
						//console.log(err1);
						//console.log(stdout1);
						//console.log(stderr1);
					});
				} else {
					printer.log.wget.info(stderr + '\n----------------------------------------------------------------------------------\n');
				}
				//console.log(stderr)
				if (typeof(callback) !== "undefined")
					callback(err, stdout, stderr);
			});
	},
	'print' : function (path, callback) { //打印照片
		var opt = {
			encoding : 'utf8', //编码
			timeout : 0, //超时
			maxBuffer : 200 * 1024, //信息缓冲区
			killSignal : 'SIGTERM', //??
			cwd : 'cmd', //工作目录
			env : null //环境变量
		}
		appPath = printer.fs.realpathSync('.');
		//var printCmd='mspaint /p '+appPath+'\\'+path;
		var printCmd = 'rundll32 C:\\WINDOWS\\system32\\shimgvw.dll,ImageView_PrintTo "' + appPath + '\\' + path + '" "DS-RX1"';
		console.log(printCmd);

		//return false;
		var child = printer.exec(printCmd, opt, function (err, stdout, stderr) {
				if (err) {
					printer.log.print.fatal(err + '-->' + printCmd);
				} else {
					printer.log.print.info(stderr + '-->' + printCmd);
				}
				if (typeof(callback) !== "undefined")
					callback(err, stdout, stderr);
			});
	},
	'sound' : function (sta, callback) { //切换系统声音
		appPath = printer.fs.realpathSync('.');
		var soundCmd = 'nircmd.exe mutesysvolume ' + sta;
		var opt = {
			encoding : 'utf8', //编码
			timeout : 0, //超时
			maxBuffer : 200 * 1024, //信息缓冲区
			killSignal : 'SIGTERM', //??
			cwd : 'cmd', //工作目录
			env : null //环境变量
		}
		var child = printer.exec(soundCmd, opt, function (err, stdout, stderr) {
				if (err) {
					printer.log.other.fatal(err + '-->' + soundCmd);
				} else {
					printer.log.other.info(stderr + '-->' + soundCmd);
				}
				//console.log(err);
				//console.log(stdout);
				//console.log(stderr);
				if (typeof(callback) !== "undefined")
					callback(err, stdout, stderr);
			});
	},
	'getLocalIP' : function () {
		var map = [];
		var os = printer.os;
		var ifaces = os.networkInterfaces();
		//console.log(ifaces);
		var ip = "localhost";
		var ipmask = printer.appConfig.api.local.replace('.*', '');
		//console.log(ipmask)
		$.each(ifaces, function (i, e) {
			//console.log(e)
			var ips = $.map(e, function (j, v) {
					if (j.address.indexOf(ipmask) != -1)
						ip = j.address;
				});

		});
		//if(ip=='localhost') alert('系统错误，无法检测到终端IP!请检查配置文件！');
		return ip;
	},
	'pHelp' : function (o) { //css3动画执行刷新
		o.css({
			'visibility' : 'visible',
			'-webkit-animation-delay' : Math.random() + 'ms'
		});
		return o;
	},
	'play' : function (opt) { //css3动画播放函数
		if (typeof(opt.o) == "undefined")
			return false;
		opt.o = printer.pHelp(opt.o);
		var def = {
			'o' : '',
			'in' : '',
			'out' : ''
		};
		for (k in def) {
			if (typeof(opt[k]) == "undefined") {
				opt[k] = def[k];
			}
		}
		opt.in = opt.in.split(',');
		opt.out = opt.out.split(',');
		$.each(opt.in, function (i, e) {
			if ($.trim(e) !== '') {
				opt.o.removeClass(e);
			}
		});
		$.each(opt.out, function (i, e) {
			if ($.trim(e) !== '') {
				opt.o.addClass(e);
				if (typeof(opt.time) != "undefined") {
					setTimeout(function () {
						opt.o.removeClass(e);
						opt.o.hide();
					}, opt.time);
				}
			}
		});

	},
	'alert' : function (opt) { //弹窗提示
		var def = {
			'o' : null,
			'title' : '提示',
			'txt' : '',
			'btn' : '确定',
			'top' : 80,
			'width' : 400,
			'par' : $('#homeBox'),
			'layer' : 'div._winlayer',
			'callback' : function (o) {}
		};
		if (typeof(opt) == "undefined")
			return false;
		if (typeof(opt.o) == "undefined")
			opt.o = $('body');
		for (k in def) {
			if (typeof(opt[k]) == "undefined")
				opt[k] = def[k];
		};
		var par = opt.par.find(opt.layer);
		par.find('div.msgbox').remove();
		var box = $('<div class="msgbox"></div>');
		var info = $('<div class="info ani_up_in" style="margin-top:' + opt.top + 'px;width:' + opt.width + 'px;"></div>');
		info.append('<h3>' + opt.title + '</h3>');
		info.append('<p>' + opt.txt + '</p>');
		//单个按钮转批量逻辑
		if (typeof(opt.btn) != "object") {
			var _t = opt.btn;
			opt.btn = [];
			opt.btn[0] = _t;
		};
		if (typeof(opt.callback) != "object") {
			var _f = opt.callback;
			opt.callback = [];
			opt.callback[0] = _f;
		}
		var _btnStr = '';
		$.each(opt.btn, function (i, e) {
			_btnStr += '<button class="btn msg"><em>' + e + '</em></button>';
		});
		info.append(_btnStr);
		info.find('button').each(function (i, e) {
			info.find('button').eq(i).click(function (ev) {
				var data = {
					'o' : $(this).parents('div.info:first'),
					'in' : 'ani_up_in',
					'out' : 'ani_up_out'
				};
				printer.play(data);
				setTimeout(function () {
					box.remove();
					if (typeof(opt.callback[i]) != "undefined")
						opt.callback[i]($(this));
					par.hide();
				}, 400);
			});
		});
		box.append(info);
		par.append(box);
		par.show();

		var data = {
			'o' : $(this).parents('div.info:first'),
			'in' : 'ani_up_out',
			'out' : 'ani_up_in'
		};
		printer.play(data);
	},
	'progress' : function (o, tip) { //进度条
		if (typeof(o) == "undefined")
			o = $('body');
		if (typeof(tip) == "undefined")
			tip = '加载中';
		var id = 'progress_' + new Date().getTime();
		o.append('<div id="' + id + '" class="loading"><div class="progress"><span></span><p></p></div></div>');
		return $('#' + id);
	}
};
printer.nav = {
	'videSize' : function () { //主界面调整
		$('#homeVideo').css('height', 957);
		$('#homeBox').css('height', 910);
	},
	'goto' : function (url, callback) { //ajax页面流转
		$('#homeBox').empty().load(url, function (html) {
			if (typeof(callback) != "undefined")
				callback(html);
		});
	},
	//复位
	'reset' : function () {
		$('#homeVideo').css('height', 1468);
		$('#homeBox').css('height', 0);
		$('#homeAd').hide();
		//if(typeof(isreload)!="undefined")
		$('#homeBox').empty().load('frm/home.html');
	},
	//首页键盘布局
	'keyBordSize' : function (sta) {
		return;
		if (sta) { //无键盘
			$('#homeVideo').css('height', 1468);
			$('#homeAd').hide();
		} else { //有键盘
			$('#homeVideo').css('height', 1070);
			$('#homeAd').show();
		}
	}
}
//首页按钮
printer.homebtn = {
	'click_weixin' : function (o) { //微信码冲印
		printer.nav.keyBordSize(0); //更改主页面以适应键盘显示
		$('#homeWinInfo').load('frm/weixinCode.html', function () { //装载微信授权码页面,注入虚拟键盘
			$('#printerPassCode').keyboard({
				'appendTo' : $('#printerKeybord'),
				'layout' : 'custom',
				'maxLength' : 11,
				'usePreview' : false,
				'customLayout' : {
					'default' : [
						'1 2 3 4 5 6 7 8 9 0 {bksp}',
						'Q W E R T Y U I O P',
						'A S D F G H J K L',
						'{cancel} Z X C V B N M {accept} '
					]
				},
				'css' : {
					'input' : ''
				},
				'position' : {
					'top' : 1000
				}
			});

			var data = {
				'o' : o.parents('div.homeBox:first').find('div._winlayer'),
				'in' : 'ani_out',
				'out' : 'ani_in'
			};
			printer.play(data);
		});
	},
	'click_weixin_ok' : function (o) { //确定微信码冲印
		var code = {
			'o' : o.parents('div.homeWeixinCode').find('input[name="code"]')
		};
		code.val = code.o.val();
		if (code.val == '') {
			printer.alert({
				'title' : '提示',
				'txt' : '请输入照片打印码！',
				'btn' : '确定',
				'callback' : function (o) {
					code.o[0].focus();
				}
			});
		} else {
			var api = printer.appConfig.api.server,
			_ckorderUrl = api + '/api/getOrder/' + code.val + '/' + new Date().getTime() + "?machineNo=" + printer.appConfig.sevice.machineNo;
			//console.log(_ckorderUrl);

			$.get(_ckorderUrl, function (_ckorderData) {
				// console.log(_ckorderData);
				if (!_ckorderData.state) {
					printer.alert({
						'title' : '提示',
						'txt' : _ckorderData.msg == 'null' ? '错误的授权码 (' + code.val + ') !' : _ckorderData.msg,
						'btn' : '确定',
						'callback' : function (o) {
							code.o.val('');
							code.o[0].focus();
						}
					});
					return false;
				};
				if (_ckorderData.order.sta * 1 != 2) {
					var _tips = '';
					if (_ckorderData.order.sta * 1 == 1)
						_tips = '未成功付款';
					if (_ckorderData.order.sta * 1 == 3)
						_tips = '已打印完成';
					printer.alert({
						'title' : '提示',
						'txt' : '授权码 (' + code.val + ') ' + _tips + '!',
						'btn' : '确定',
						'callback' : function (o) {
							code.o.val('');
							code.o[0].focus();
						}
					});
				} else {
					var _ckNum = _ckorderData.order.count * 1 - _ckorderData.order.currentcount;
					if (_ckNum < 0)
						_ckNum = 0;
					if (_ckNum == 0) {
						printer.alert({
							'title' : '提示',
							'txt' : '授权码 (' + code.val + ') 已被使用!',
							'btn' : '确定',
							'callback' : function (o) {
								code.o.val('');
								code.o[0].focus();
							}
						});
						return false;
					} else {
						printer.nav.videSize();
						//$('#homeAd').show();															//界面调整
						printer.nav.goto('frm/getPhotosFromServer.html', function (data) { //页面流转
							$('input#codeCache').val(code.val); //临时存储微信码
							printer.prnteAak.downPhoto(code.val); //下载将要打印的图片
						});
					}
				}

			}, 'json');
		}
	},
	'click_weixin_no' : function (o) { //取消微信码冲印
		printer.nav.keyBordSize(1);
		var data = {
			'o' : o.parents('div.homeBox:first').find('div._winlayer'),
			'in' : 'ani_in',
			'out' : 'ani_out'
		};
		printer.play(data);
		setTimeout(function () {
			$('#homeWinInfo').empty();
		}, 500);
	},
	'click_machine' : function (o) { //一体机编辑
		printer.nav.keyBordSize(0);
		$('#homeWinInfo').load('frm/wifi.html', function () {
			$('#wifiName').text(printer.appConfig.wifi.name);
			$('#wifiPass').text(printer.appConfig.wifi.pass);
			var data = {
				'o' : o.parents('div.homeBox:first').find('div._winlayer'),
				'in' : 'ani_out',
				'out' : 'ani_in'
			};
			printer.play(data);
		});
	},
	'click_machine_ok' : function (o) { //确定一体机编辑
		$('#homeWinInfo').load('frm/uploadQrCode.html', function () {
			//生成上传二维码
			var _prot = printer.appConfig.sevice;
			var url = 'http://' + printer.getLocalIP() + ':' + _prot.httpPort + '/up.html';
			url += '?url=' + printer.getLocalIP() + ':' + _prot.filePort;
			var base64img = printer.qrcode.toDataURL(url, 12);
			$('#wifiQrcode').css('background-image', 'url(' + base64img + ')');
			var data = {
				'o' : o.parents('div.homeBox:first').find('_div.winlayer'),
				'in' : 'ani_out',
				'out' : 'ani_in'
			};
			printer.play(data);
		});
	},
	'_machine_upok' : function (img) {
		printer.nav.videSize();
		$('#homeAd').show(); //界面调整
		printer.nav.goto('frm/getPhotosFromMachine.html', function (data) { //页面流转
			//显示图片
			$('#getedPhoto').empty().append('<img class="ani_in" ondragstart="return false;" src="public/files/' + img + '">');
			//进度条
			var pr = printer.progress($('#homeBox'), '正在生成订单信息...');
			//获取服务器新订单信息
			var api = printer.appConfig.api.server,
			orderUrl = api + '/api/order/';
			$.post(orderUrl, {
				'num' : 1
			}, function (orderData) {
				console.log(orderData);
				if (!orderData.status) {
					var _crmsg = '无法创建订单 ' + img + '！';
					alert(_crmsg);
					printer.log.other.fatal(_msg);
				} else {
					//将创建的订单关键信息缓存到dom
					$('#m_imgCache').val(img);
					$('#m_codeCache').val(orderData.code);

					//支付地址
					var url = printer.appConfig.api.server;
					url += '/co/pc?no=' + orderData.code + '&obj=DiyPrinting';
					//支付二维码
					var base64img = printer.qrcode.toDataURL(url, 12);
					pr.hide();
					var payCodeStr = '<div class="alipayBox">';
					payCodeStr += '<h4>扫码支付 ￥ ' + orderData.price + ' 元</h4>';
					payCodeStr += '<div id="paycode"></div>';
					payCodeStr += '<h5>请使用微信"扫一扫"扫描上方二维码<br>使用"支付宝"支付完成后，<br>点击手机上支付宝界面右上角“完成”按钮！<br><span id="payCheckSpan"></span>检测中,请在<span id="payTimerSpan"> ?? </span>内完成支付....</h5>';
					payCodeStr += '<p>';
					//payCodeStr+='<button class="btn msg yes" onclick="javascript:printer.homebtn._machine_payok($(this),\''+orderData.code+'\');"><em>已完成支付</em></button>';
					//payCodeStr+='<button id="btnAliPayCancel" class="btn msg no" onclick="javascript:printer.homebtn._machine_payno($(this));"><em>取消</em></button>';
					payCodeStr += '<button id="btnAliPayCancel" class="btn msg no"><em>取消</em></button>';
					payCodeStr += '</p>';
					payCodeStr += '</div>';
					var payCodeDom = $(payCodeStr);
					var ck1 = function () {
						$('#machineBtnPrintPhoto').click(function () {
							printer.payCheckCount = 0;
							$(this).hide();
							$('#homeBox div.winlayer').show();
							_pay_sta_check();
						});
					};
					var ck2 = function () {
						$('#machineBtnPrintCancel').click(function () {
							printer.payCheckCount = 0;
							$('#homeBox div.winlayer').hide();
							printer.alert({
								'title' : '询问',
								'txt' : '您还未完成打印，确定返回吗？<br><font style="font-size:14px;color:red;">为保证您的隐私，您的照片将从本机自动删除！</font>',
								'btn' : ['确定', '取消'],
								'top' : 300,
								'layer' : 'div._winlayer',
								'callback' : [function (o) {
										var _a = printer.fs.realpathSync('.'),
										_f1 = '\\public\\files\\',
										_f2 = _f1 + '\\thumbnail\\';
										_un1 = _a + _f1 + img;
										_un2 = _a + _f2 + img;
										printer.fs.exists(_un1, function (ex) {
											printer.fs.unlinkSync(_un1);
										});
										printer.fs.exists(_un2, function (ex) {
											printer.fs.unlinkSync(_un2);
										});
										printer.nav.reset();
									}, function () {
										$('#homeBox div.winlayer').show();
									}
								]
							});
						});
					};
					payCodeDom.find('#btnAliPayCancel').click(function () {
						$('#homeBox div.winlayer').hide();
						$('#machineBtnPrintPhoto').show();
					});
					$('#homeBox').find('div.winlayer').append(payCodeDom).show();
					$('#homeBox #paycode').css('background-image', 'url(' + base64img + ')');
					ck1();
					ck2();

					//付款状态检测
					var _pay_sta_check = function () {
						//如果支付二维码未显示则跳出检测循环
						var _payisHidden = $('#homeBox div.winlayer').is('div:hidden');
						if (_payisHidden) {
							printer.payCheckCount = 0;
							return false;
						}
						//支付状态监控超时
						if (printer.payCheckCount == 200) {
							$('#homeBox div.winlayer').hide();
							$('#machineBtnPrintPhoto').show();
						}
						//扫描订单信息
						var _ck_url = api + '/api/getOrder/' + orderData.code + '/' + new Date().getTime() + "?machineNo=" + printer.appConfig.sevice.machineNo,
						_up_url = api + '/print/' + orderData.code;
						$.get(_ck_url, function (_ckdata) {
							if (_ckdata.state) {
								if (_ckdata.order.sta * 1 == 2) {
									$('#homeBox').find('div.winlayer').empty().hide();
									//alert('支付成功');
									printer.homebtn._machine_payok(img, _ckdata);
								} else {
									console.log('未支付');
									if (typeof(printer.payCheckCount) == "undefined")
										printer.payCheckCount = 0;
									printer.payCheckCount += 1;
									var _timerCount1 = (200 * 3 * 1000) - (printer.payCheckCount * 3000);
									var _timerCount2 = _timerCount1 / (60 * 1000);
									var _timerCount3 = Math.floor(_timerCount1 / (60 * 1000));
									var _timerCount4 = _timerCount2 - _timerCount3;
									var _timerCount5 = Math.floor(_timerCount4 * 60);
									if (_timerCount3 < 0)
										_timerCount3 = 0;
									if (_timerCount5 < 0)
										_timerCount5 = 0;
									var _timerCount6 = _timerCount3 + '分' + _timerCount5 + '秒'

										// console.log(_timerCount1);
										// console.log(_timerCount2);
										console.log(_timerCount3);
									// console.log(_timerCount4);
									console.log(_timerCount5);
									$('#payTimerSpan').text(' ' + _timerCount6 + ' ');
									setTimeout(_pay_sta_check, 3000);
								}
							} else {
								var _msg = '无法获取订单信息 (' + orderData.code + ')！';
								alert(_msg);
								printer.log.other.fatal(_msg);
							}
						}, 'json');
					}
					_pay_sta_check();
				}
			}, 'json');
		});
	},
	'_machine_payok' : function (img, _ckdata) {
		var code = _ckdata.order.code;
		var opt = {
			encoding : 'utf8',
			timeout : 0,
			maxBuffer : 200 * 1024,
			killSignal : 'SIGTERM',
			cwd : 'cmd',
			env : null
		}
		var _appPath = printer.fs.realpathSync('.'),
		_errmsg = '',
		_imgPath1 = '\\public\\files\\',
		_imgPath2 = '\\public\\photo\\',
		_imgPath3 = '\\public\\files\\thumbnail\\';
		var _copyCmd = 'copy /y ' + _appPath + _imgPath1 + img;
		_copyCmd += ' ' + _appPath + _imgPath2 + code + '.jpg';
		var _delCmd1 = 'del /q /f ' + _appPath + _imgPath1 + img;
		_delCmd2 = 'del /q /f ' + _appPath + _imgPath2 + code + '.jpg';
		var _delCmd3 = 'del /q /f ' + _appPath + _imgPath3 + img;
		var ftpConfig = printer.appConfig.ftp;
		var _uploadCmd = _appPath + '\\cmd\\wput.exe -q ' + img + ' ';
		_uploadCmd += 'ftp://' + ftpConfig.user + ':' + ftpConfig.pass + '@' + ftpConfig.ftp;
		_uploadCmd += '/print/' + code + '.jpg';
		var execCopy = function () { //方法：拷贝上传文件到本地打印目录
			var child = printer.exec(_copyCmd, opt, function (err, stdout, stderr) {
					if (err) {
						_errmsg = '拷贝文件失败！';
						printer.log.other.fatal(_errmsg + err);
						alert(_errmsg);
					} else {
						//调用打印照片
						printPhoto();
						printer.log.other.info(stderr);
					}
				});
		},
		execDelSource = function () {
			var child;
			//删除多余的缩略图
			child = printer.exec(_delCmd3, opt, function (err, stdout, stderr) {
					if (err)
						printer.log.other.fatal(err);
				});
			//删除上传的源文件
			child = printer.exec(_delCmd1, opt, function (err, stdout, stderr) {
					//删除拷贝到打印目录下照片
					execDelPhoto();
					if (err)
						printer.log.other.fatal(err);
				});
		},
		execDelPhoto = function () { //方法：删除拷贝到打印目录下照片
			var child = printer.exec(_delCmd2, opt, function (err, stdout, stderr) {
					if (err)
						printer.log.other.fatal(err);
				});
		},
		execUpload = function () { //方法：上传照片到服务器
			var _optUp = opt;
			//修正exec工作路径
			_optUp.cwd = 'public/files';
			var child = printer.exec(_uploadCmd, _optUp, function (err, stdout, stderr) {
					//调用删除上传的源文件
					execDelSource();
					if (err)
						printer.log.wput.fatal(err);
				});
		},
		printPhoto = function () { //方法：照片打印
			//接口地址
			var api = printer.appConfig.api.server,
			orderUrl = api + '/api/getOrder/' + code + '/' + new Date().getTime() + "?machineNo=" + printer.appConfig.sevice.machineNo,
			printPhotoUrl = api + '/api/printPhoto/' + code + '/' + new Date().getTime(),
			orderCheck = function (orderData) {
				//console.log(orderData)
				if (orderData.state) {
					//付款检测
					if (orderData.order.sta * 1 != 2) {
						//alert('订单未付款');
						$('#homeBox div.winlayer').show();
						return false;
					}
					var num = orderData.order.count * 1 - orderData.order.currentcount * 1,
					numTips = function () {
						printer.alert({
							'title' : '提示',
							'txt' : '您已经打印过了！ (' + code + ') ',
							'btn' : ['确定'],
							'top' : 300,
							'callback' : [function (o) {
									printer.nav.reset();
								}
							]
						});
						return false;
					};
					if (num < 0)
						num = 0; //没有打印次数
					if (num == 0)
						return numTips(); //复位界面
					//发送打印指令
					for (var i = 0; i < num; i++) {
						//alert(i);
						setTimeout(function () {
							//更新服务器订单打印计数
							$.get(printPhotoUrl, function (printPhotoData) {
								//console.log(i);
								//console.log(printPhotoUrl);
								//console.log(printPhotoData);
								if (printPhotoData.state) {
									printer.print('public\\photo\\' + code + '.jpg', function (err, stdout, stderr) {
										console.log('打印 ' + printPhotoData.current + ' 指令发送成功！');
										printer.alert({
											'title' : '恭喜',
											'txt' : '照片打印成功！<br><font style="font-size:14px;color:red;">为保证您的隐私，您的照片已从本机自动删除！</font>',
											'btn' : ['确定'],
											'top' : 300,
											'layer' : 'div._winlayer',
											'callback' : [function (o) {
													printer.nav.reset();
												}
											]
										});

									});
								} else {
									alert('无法更新打印指数' + code);
									printer.log.other.fatal('无法更新打印指数 ' + code);
									printer.nav.reset();
								}
							});

						}, i * printer.appConfig.sevice.printerTimer);
					};
					//调用上传照片
					execUpload();
				} else {
					alert('无法获取订单 ' + code);
					printer.log.other.fatal('无法获取订单 ' + code);
					printer.nav.reset();
				}
			}
			//获取订单
			$.get(orderUrl, orderCheck, 'json');
		}
		//拷贝资源文件,通过execCopy调用后续系列函数
		execCopy();
	},
	'_machine_payno' : function (o) {
		o.parents('div.winlayer:first').hide();
	},
	'click_machine_no' : function (o) { //取消一体机编辑
		printer.nav.keyBordSize(1);
		var data = {
			'o' : o.parents('div.homeBox:first').find('div._winlayer'),
			'in' : 'ani_in',
			'out' : 'ani_out',
			'time' : 800
		};
		printer.play(data);
		// setTimeout(function(){
		// 	$('#homeWinInfo').empty();
		// },500);
	},
	//声音控制
	'click_sound' : function (o) {
		var sta = 0;
		if (o.hasClass('on')) {
			o.removeClass('on').addClass('off');
			sta = 1;
		} else {
			o.removeClass('off').addClass('on');
			sta = 0;
		}
		printer.sound(sta);
	},
	//如何使用
	'click_how' : function (o) {
		printer.nav.keyBordSize(0);
		$('#homeWinInfo').load('frm/how.html', function () {
			var data = {
				'o' : o.parents('div.homeBox:first').find('div._winlayer'),
				'in' : 'ani_out',
				'out' : 'ani_in'
			};
			printer.play(data);
		});
	}
};
//打印确认页
printer.prnteAak = {
	'downPhoto' : function (code) {
		if (typeof(code) == "undefined")
			code = '';
		if (code == '') {
			alert('empty code!');
			return false;
		}
		//图片下载
		var pr = printer.progress($('#homeBox'), '正在下载图片...');
		printer.getFileByCode(code, function (err, stdout, stderr) {
			pr.hide(); //完成请求隐藏进度条
			if (err) {
				//弹出错误
				printer.alert({
					'title' : '失败',
					'txt' : '照片下载失败！您是否输错了授权码？',
					'btn' : '确定',
					'top' : 300,
					'callback' : function (o) {
						$('div._winlayer').hide();
						printer.nav.reset();
					}
				});
			} else {
				$('#getedPhoto').empty().append('<img class="ani_in"  ondragstart="return false;" src="public/photo/' + code + '.jpg">');
			}
		});
	},
	'printPhoto' : function (btn) {
		//获取code
		var code = $('input#codeCache').val();
		if (code == '') {
			alert('error!');
			return false;
		}
		var api = printer.appConfig.api.server,
		orderUrl = api + '/api/getOrder/' + code + '/' + new Date().getTime() + "?machineNo=" + printer.appConfig.sevice.machineNo,
		printPhotoUrl = api + '/api/printPhoto/' + code + '/' + printer.appConfig.sevice.machineNo + '/' + new Date().getTime();

		$.get(orderUrl, function (orderData) { //获取订单
			if (orderData.state) {
				var num = orderData.order.count * 1 - orderData.order.currentcount * 1;
				if (num < 0)
					num = 0;
				//没有打印次数
				if (num == 0) {
					printer.alert({
						'title' : '提示',
						'txt' : '该授权码已被使用 (' + code + ') ',
						'btn' : ['确定'],
						'top' : 300,
						'callback' : [function (o) {
								printer.nav.reset();
							}
						]
					});
					return false;
				}
				//发送打印指令
				for (var i = 0; i < num; i++) {
					var _isTips = true;
					setTimeout(function () {
						//更新服务器订单打印计数
						$.get(printPhotoUrl, function (printPhotoData) {
							//console.log(printPhotoData);
							if (printPhotoData.state) {
								//防止多次点击
								btn.hide();
								var _auto_close_event;
								var delPhotoEvent = function () {
									var _a = printer.fs.realpathSync('.'),
									_f1 = '\\public\\photo\\';
									_unp = _a + _f1 + code + '.jpg';
									printer.fs.exists(_unp, function (ex) {
										if (ex)
											printer.fs.unlinkSync(_unp);
									});
									try {
										clearTimeout(_auto_close_event);
									} catch (e) {
										//console.log(e);
									};
									printer.nav.reset();
								}
								printer.print('public\\photo\\' + code + '.jpg', function (err, stdout, stderr) {
									//console.log('---------->',i,num);
									//alert('打印 '+printPhotoData.current+' 指令发送成功！');
									//防止多次弹出完成提示框
									if (i == num && _isTips) {
										_isTips = false;
										printer.alert({
											'title' : '正在打印...',
											'txt' : '系统正在打印，请稍候..<p style="color:red;font-size:14px;"><span id="self_print_tips_box"></span>为保护您的隐私,您的照片将从自动本终端删除！</p>',
											'btn' : ['确定'],
											'top' : 300,
											'callback' : [function (o) {
													delPhotoEvent();
												}
											]
										});
										var _tips_event_i = 0;
										var _tips_event = function () {
											_tips_event_i += 1;
											$('#self_print_tips_box').html('打印指令发送成功！' + (20 - _tips_event_i) + ' 秒后自动关闭！<br>');
											if (_tips_event_i < 20) {
												_auto_close_event = setTimeout(function () {
														_tips_event();
													}, 1000);
											} else {
												delPhotoEvent();
											}
										}
										_tips_event();
									}
								});
							} else {
								alert('无法更新打印指数' + code);
							}
						});

					}, i * printer.appConfig.sevice.printerTimer);
				};
			} else {
				alert('无法获取订单 ' + code);
			}
		});
	},
	'printBack' : function (btn) {
		var api = printer.appConfig.api.server,
		code = $('#codeCache').val(),
		_ckorderUrl = api + '/api/getOrder/' + code + '/' + new Date().getTime() + "?machineNo=" + printer.appConfig.sevice.machineNo;
		//console.log(_ckorderUrl);
		//return false;
		$.get(_ckorderUrl, function (_ckorderData) {
			var _ckNum = _ckorderData.order.count * 1 - _ckorderData.order.currentcount;
			if (_ckNum < 0)
				_ckNum = 0;
			if (_ckNum == 0) {
				printer.nav.reset();
				return false;
			} else {
				var delPhotoEvent = function () {
					var _a = printer.fs.realpathSync('.'),
					_f1 = '\\public\\photo\\';
					_unp = _a + _f1 + code + '.jpg';
					printer.fs.exists(_unp, function (ex) {
						if (ex)
							printer.fs.unlinkSync(_unp);
					});
					printer.nav.reset();
				}
				printer.alert({
					'title' : '提示',
					'top' : 300,
					'txt' : '您还未完成打印，确定返回吗？<br><font style="font-size:14px;color:red;">为保证您的隐私，您的照片将从本机自动删除！</font>',
					'btn' : ['确定', '取消'],
					'callback' : [function (o) {
							delPhotoEvent();
						}, function (o) {}

					]
				});
			}
		}, 'json');
	},
	'editPhoto' : function (btn) {
		//获取code
		// var code=$('input#codeCache').val();
		// if (code==''){alert('error!');return false;}
		// var api=printer.appConfig.api.server,
		// 	orderUrl=api+'/api/getOrder/'+code+'/'+new Date().getTime();

		// $.get(orderUrl,function(orderData){										//获取订单
		// 	if(orderData){
		// 		printer.nav.goto('frm/editPhoto.html',function(data){			//编辑图片页面流转
		// 			printer.printTypeSel.initPage(orderData);
		// 		});
		// 	}else{
		// 		alert('无法获取订单 '+code);
		// 	}
		// });
	}
}
$(function () {
	printer.winInit();
	printer.logInit(); //初始化日志对象
	printer.uploadService(); //启用终端上传文件服务
	printer.heartBeatInit(); //开启客户端心跳
	printer.getAds(); //自动更新广告
	printer.upDateInit(function (_call) { //自动升级初始化
		var _sysCanPassIt = '';
		$.each(printer.updateState, function (i, e) {
			if (!e.sta) {
				_sysCanPassIt += '1';
			} else {
				_sysCanPassIt += '0';
			}
		});
		if (_sysCanPassIt.indexOf('1') != -1) {
			setTimeout(function () {
				_call(_call);
			}, 500);
		} else {
			$('body').load('frm/main.html', function () {
				printer.nav.goto('frm/home.html', function () { //加载主界面
					$('#adsAutoBox').load('public/video/ad.html');
					$('#homeAd').load('public/video/banner.html');
					//printer.homebtn._machine_upok('q1_1_.jpg');
				});
			});
		}
	});
	window.onscroll = function (e) {
		e.preventDefault();
		//window.scrollTo(0,0)
	};
});

/*
//照片类型选择页
printer.printTypeSel={
'initPage':function(order){											//初始化类型选择页	order=订单数据
var _listCage=$('#listPhotosTypeCage li'),
_listType=$('#listPhotosType').find('div.icons'),
_item=_listType.find('li'),
_btnYes=$('#editPhotoTypesBtnOk'),
_btnNo=$('#editPhotoTypesBtnNo');
_listCage.each(function(i,e){
$(e).click(function(){
_listCage.removeClass('sel');
$(this).addClass('sel');
_listType.hide();
_listType.eq(i).css('display','table');
});
});
if(typeof(order)!="undefined"){									//对传入的订单数据进行处理
_listCage.removeClass('sel');								//左导航丢掉默认选中
_item.removeClass('sel');									//子列表丢掉默认选中
_ctypename=order.order.type;								//类型名
var _orderSel=_listType.find('li[ctype="'+_ctypename+'"]');	//找到对应dom节点
_orderSel.addClass('sel');									//添加选中订单对应数据类型
_listType.hide();											//隐藏所有类型列表
_orderSel.parents('div.icons').css('display','table');		//显示订单对应数据类型列表
_btnNo.click(function(){									//取消按钮事件1

});
}else{
_listType.eq(0).css('display','table');						//默认显示第1个图片类型列表
_btnNo.click(function(){									//取消按钮事件2
printer.nav.reset();
});
};
_item.click(function(){
$(this).parents('div.icons').find('li').removeClass('sel');
$(this).addClass('sel');
});
_btnYes.click(function(){										//注入确认按钮事件
printer.printTypeSel.goEditer($(this),order);
});
},
'goEditer':function(btn,order){
var _box=btn.parents('div.rightMain:first'),
_types=_box.find('div.icons:visible'),
_obj=_types.find('li.sel:first');
_class_type=_obj.attr('ctype');								//类型
if(typeof(order)!="undefined"){								//判断是否有订单数据传入
console.log(order);										//解开订单数据
}else{

}

printer.nav.goto('frm/wifi.html',function(data){
});
}
};
*/
