exports.development	= true;				//是否开发模式
exports.wifi={
	'name':'Diy',						//wifi热点名称
	'pass':'diy12345'					//wifi密码
};
exports.sevice={
	'machineNo':'NOR00046',				//终端机编号
	'printerTimer':3000,				//打印指令发送间隔
	'heartBeatTimer':1000*60,			//心跳包发送时间
	'adUpdateTimer':1000*60*60,			//广告更新自动检测间隔
	'printerUseTimer':8000              //打印机执行秒数
};
exports.api={
	'server':'http://123.57.207.27',	//服务器地址
	'local':'192.168.99.*'				//终端路由器网段
};
exports.ftp={
	'ftp':'123.57.207.27',				//ftp server
	'user':'adminthinkgo',				//ftp user
	'pass':'nowthinkgoitftp',			//ftp pass
};
exports.enc={
	'iv':'1234567890000000',			//hash iv
	'key':'thinkgohaskkeyaggic312',			//hash key
	'token':'printer'					//token
};
exports.logConfig={
	'level':'INFO',						//日志
	'logoSize':1024*1024*10				//日志文件大小
};
exports.mine={							//http服务mine
	"css": "text/css",
	"gif": "image/gif",
	"html": "text/html",
	"ico": "image/x-icon",
	"jpeg": "image/jpeg",
	"jpg": "image/jpeg",
	"js": "text/javascript",
	"json": "application/json",
	"pdf": "application/pdf",
	"png": "image/png",
	"svg": "image/svg+xml",
	"swf": "application/x-shockwave-flash",
	"tiff": "image/tiff",
	"txt": "text/plain",
	"wav": "audio/x-wav",
	"wma": "audio/x-ms-wma",
	"wmv": "video/x-ms-wmv",
	"xml": "text/xml"
}